#!/usr/bin/env python3
"""
SignalHire — api.py
FastAPI backend exposing ranking, candidate lookup, stats, AI chat, and export.
"""

import json
import math
import os
import csv
import io
import sys
import requests
from pathlib import Path
from datetime import datetime, date
from typing import Optional, List

# ── Load .env ────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass  # python-dotenv not installed; rely on shell env vars

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ── Local import ────────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))
from ranker import rank_candidates, score_candidate, generate_reasoning, is_honeypot

# ── Paths ───────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).parent
CANDIDATES_JSONL = BACKEND_DIR / "candidates.jsonl"
SAMPLE_CANDIDATES = BACKEND_DIR.parent / "sample_candidates.json"

# If not found in backend/, look one level up
if not CANDIDATES_JSONL.exists():
    CANDIDATES_JSONL = BACKEND_DIR.parent / "candidates.jsonl"

PREVIEW_MODE = not CANDIDATES_JSONL.exists()

# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SignalHire API",
    description="AI-powered candidate intelligence and ranking",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory cache ─────────────────────────────────────────────────────────
_rank_cache: dict = {}


# ── Helpers ─────────────────────────────────────────────────────────────────

def load_sample_candidates() -> list:
    if SAMPLE_CANDIDATES.exists():
        with open(SAMPLE_CANDIDATES, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def stream_candidates_list():
    """Return candidates either from JSONL or sample JSON."""
    if PREVIEW_MODE:
        return load_sample_candidates()

    candidates = []
    with open(CANDIDATES_JSONL, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    candidates.append(json.loads(line))
                except Exception:
                    continue
    return candidates


def get_candidate_by_id(candidate_id: str) -> Optional[dict]:
    """Look up a single candidate by ID."""
    if PREVIEW_MODE:
        for c in load_sample_candidates():
            if c.get("candidate_id") == candidate_id:
                return c
        return None

    with open(CANDIDATES_JSONL, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                c = json.loads(line)
                if c.get("candidate_id") == candidate_id:
                    return c
            except Exception:
                continue
    return None


def build_candidate_response(candidate: dict, rank: int = None) -> dict:
    """Score a candidate and build full response object."""
    result = score_candidate(candidate)
    honeypot_flag = is_honeypot(candidate)

    from ranker import compute_skill_score
    _, matched_skills = compute_skill_score(candidate)

    reasoning = generate_reasoning(candidate, result["score_breakdown"], matched_skills)

    return {
        **candidate,
        "rank": rank,
        "score": result["final_score"],
        "score_breakdown": result["score_breakdown"],
        "matched_skills": matched_skills,
        "reasoning": reasoning,
        "is_honeypot": honeypot_flag,
    }


# ── Pydantic models ──────────────────────────────────────────────────────────

class RankRequest(BaseModel):
    job_description: str = ""
    top_n: int = 100


class ChatRequest(BaseModel):
    message: str
    candidates: list = []


class ExportRequest(BaseModel):
    candidates: list = []


class CompareRequest(BaseModel):
    candidate_ids: List[str]


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "SignalHire API",
        "version": "1.0.0",
        "preview_mode": PREVIEW_MODE,
        "candidates_source": str(CANDIDATES_JSONL) if not PREVIEW_MODE else "sample_candidates.json",
    }


@app.post("/api/rank")
def rank_endpoint(req: RankRequest):
    """Score and rank top N candidates."""
    global _rank_cache

    top_n = min(req.top_n, 100)

    source = str(CANDIDATES_JSONL) if not PREVIEW_MODE else str(SAMPLE_CANDIDATES)

    if PREVIEW_MODE:
        # Score from sample JSON
        import time
        start = time.time()
        samples = load_sample_candidates()
        scored = []
        honeypots = 0
        for c in samples:
            if is_honeypot(c):
                honeypots += 1
                continue
            result = score_candidate(c)
            from ranker import compute_skill_score
            _, matched = compute_skill_score(c)
            reasoning = generate_reasoning(c, result["score_breakdown"], matched)
            scored.append({
                **c,
                "rank": 0,
                "score": result["final_score"],
                "score_breakdown": result["score_breakdown"],
                "matched_skills": matched,
                "reasoning": reasoning,
                "is_honeypot": False,
            })
        scored.sort(key=lambda x: (-x["score"], x["candidate_id"]))
        top_score = scored[0]["score"] if scored else 0.0
        avg_score = sum(x["score"] for x in scored) / len(scored) if scored else 0.0
        elapsed = round(time.time() - start, 2)

        for i, c in enumerate(scored[:top_n]):
            c["rank"] = i + 1

        _rank_cache = {c["candidate_id"]: c for c in scored[:top_n]}

        return {
            "candidates": scored[:top_n],
            "preview_mode": True,
            "stats": {
                "total_processed": len(samples),
                "honeypots_removed": honeypots,
                "time_seconds": elapsed,
                "top_score": round(top_score, 4),
                "avg_score": round(avg_score, 4),
            },
        }

    # Full JSONL ranking
    results = rank_candidates(str(CANDIDATES_JSONL), top_n=top_n)
    ranked = results["ranked"]

    # Merge candidate data into response
    output_candidates = []
    for r in ranked:
        candidate = r.get("candidate", {})
        output_candidates.append({
            **candidate,
            "rank": r["rank"],
            "score": r["final_score"],
            "score_breakdown": r["score_breakdown"],
            "matched_skills": r["matched_skills"],
            "reasoning": r["reasoning"],
            "is_honeypot": False,
        })

    _rank_cache = {c["candidate_id"]: c for c in output_candidates}

    return {
        "candidates": output_candidates,
        "preview_mode": False,
        "stats": results["stats"],
    }


@app.get("/api/candidate/{candidate_id}")
def get_candidate(candidate_id: str):
    """Return full candidate profile with score breakdown."""
    # Check cache first
    if candidate_id in _rank_cache:
        return _rank_cache[candidate_id]

    candidate = get_candidate_by_id(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")

    return build_candidate_response(candidate)


@app.get("/api/stats")
def get_stats():
    """Return score distribution and aggregated analytics."""
    if not _rank_cache:
        return {
            "message": "No ranking performed yet. Call POST /api/rank first.",
            "score_distribution": [],
            "top_skills": [],
            "top_locations": [],
            "total_processing_time": 0,
        }

    candidates = list(_rank_cache.values())

    # Score distribution (10 buckets 0.0 to 1.0)
    buckets = [0] * 10
    for c in candidates:
        score = c.get("score", 0)
        idx = min(int(score * 10), 9)
        buckets[idx] += 1

    score_distribution = [
        {"range": f"{i/10:.1f}-{(i+1)/10:.1f}", "count": buckets[i]}
        for i in range(10)
    ]

    # Top 10 skills
    from collections import Counter
    skill_counter = Counter()
    for c in candidates:
        for sk in c.get("matched_skills", []):
            skill_counter[sk.lower()] += 1
    top_skills = [
        {"skill": sk, "count": cnt}
        for sk, cnt in skill_counter.most_common(10)
    ]

    # Top 5 locations
    loc_counter = Counter()
    for c in candidates:
        loc = c.get("profile", {}).get("location", "Unknown")
        if loc:
            loc_counter[loc] += 1
    top_locations = [
        {"location": loc, "count": cnt}
        for loc, cnt in loc_counter.most_common(5)
    ]

    return {
        "score_distribution": score_distribution,
        "top_skills": top_skills,
        "top_locations": top_locations,
        "total_candidates_in_cache": len(candidates),
    }


@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """Proxy chat to Google Gemini 2.0 Flash."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY environment variable not set. Add it to backend/.env",
        )

    # Build candidate context summary
    candidate_summaries = []
    for c in req.candidates[:100]:
        prof = c.get("profile", {}) if isinstance(c, dict) else {}
        summary = {
            "id": c.get("candidate_id", ""),
            "name": prof.get("anonymized_name", ""),
            "title": prof.get("current_title", ""),
            "company": prof.get("current_company", ""),
            "yoe": prof.get("years_of_experience", 0),
            "location": prof.get("location", ""),
            "score": c.get("score", 0),
            "rank": c.get("rank", 0),
            "reasoning": c.get("reasoning", ""),
            "matched_skills": c.get("matched_skills", []),
        }
        candidate_summaries.append(summary)

    system_prompt = (
        "You are a recruiting intelligence assistant for SignalHire. "
        "You have access to the top 100 ranked candidates for a Senior AI Engineer role "
        "at Redrob AI. Answer questions about the candidate pool honestly and specifically. "
        "Reference actual candidate data in your answers. Be concise and specific."
    )

    # Build single combined prompt (Gemini free-tier doesn't have a separate system role)
    if candidate_summaries:
        context = json.dumps(candidate_summaries, indent=2)
        full_prompt = (
            f"{system_prompt}\n\n"
            f"Candidate pool data (top {len(candidate_summaries)} candidates):\n"
            f"{context}\n\n"
            f"Question: {req.message}"
        )
    else:
        full_prompt = f"{system_prompt}\n\nQuestion: {req.message}"

    # Call Gemini REST API — gemini-2.5-flash (confirmed working with this key)
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": api_key,
    }
    body = {
        "contents": [
            {"parts": [{"text": full_prompt}]}
        ]
    }

    try:
        resp = requests.post(url, headers=headers, json=body, timeout=30)
        if resp.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Gemini API quota exceeded. Please check your API key quota at https://ai.dev/rate-limit or try again later.",
            )
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return {"response": text}
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Gemini API timed out. Try again.")
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error ({e.response.status_code}): {e.response.text[:300]}")
    except (KeyError, IndexError) as e:
        raise HTTPException(status_code=502, detail=f"Unexpected Gemini response format: {e}")


@app.post("/api/export")
def export_csv(req: ExportRequest):
    """Validate and export ranked candidates as CSV."""
    candidates = req.candidates
    if not candidates:
        candidates = list(_rank_cache.values())

    if not candidates:
        raise HTTPException(status_code=400, detail="No candidates to export.")

    # Sort by rank / score
    candidates_sorted = sorted(
        candidates,
        key=lambda c: (c.get("rank") or 999, -(c.get("score") or 0)),
    )

    # Build CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["candidate_id", "rank", "score", "reasoning"])

    for i, c in enumerate(candidates_sorted[:100]):
        score = c.get("score", 0)
        rank = c.get("rank") or (i + 1)
        cid = c.get("candidate_id", "")
        reasoning = c.get("reasoning", "")
        writer.writerow([cid, rank, f"{score:.4f}", reasoning])

    csv_bytes = output.getvalue().encode("utf-8")

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=submission.csv"},
    )


@app.post("/api/compare")
def compare_candidates(req: CompareRequest):
    """Return full profiles and score breakdowns for requested candidates."""
    results = []
    for cid in req.candidate_ids[:3]:
        if cid in _rank_cache:
            results.append(_rank_cache[cid])
        else:
            candidate = get_candidate_by_id(cid)
            if candidate:
                results.append(build_candidate_response(candidate))
            else:
                results.append({"candidate_id": cid, "error": "Not found"})

    return {"candidates": results}


# ── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
