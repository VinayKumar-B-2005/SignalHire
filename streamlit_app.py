"""
SignalHire — streamlit_app.py
Streamlit sandbox for Redrob Hackathon submission demo.
Completely offline — no API calls. Uses same scoring logic as ranker.py.
"""

import streamlit as st
import json
import csv
import io
import sys
import time
from pathlib import Path

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="SignalHire — Candidate Ranking Demo",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Load ranker module ────────────────────────────────────────────────────────
# Try to import from backend/, else from current dir
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir / "backend"))
sys.path.insert(0, str(script_dir))

try:
    from ranker import score_candidate, generate_reasoning, is_honeypot
    from ranker import compute_skill_score
except ImportError:
    # Inline minimal scoring if backend not available
    st.error("Could not import ranker.py. Please ensure backend/ranker.py exists.")
    st.stop()

# ── Paths ─────────────────────────────────────────────────────────────────────
SAMPLE_PATH = script_dir / "sample_candidates.json"
CANDIDATES_PATH = script_dir / "backend" / "candidates.jsonl"

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    ## ⚡ SignalHire
    **Hire by signal, not by keyword.**

    ---
    ### About
    SignalHire is an AI-powered candidate intelligence platform built for the Redrob India Runs Hackathon.

    It ranks 100,000 candidate profiles using a 6-component scoring model:
    - **Skill Score** (35%) — must-have AI/ML skills with proficiency weighting
    - **Career Score** (30%) — title quality, company type, description keywords
    - **Experience Score** (15%) — optimal 5–9 year sweet spot
    - **Location Score** (10%) — proximity to Pune/Noida
    - **Education Score** (5%) — institution tier and STEM field
    - **Availability Score** (5%) — notice period + salary fit

    Plus a **behavioral multiplier** using 23 Redrob platform signals.

    ---
    ### Custom Data
    """)

    uploaded = st.file_uploader("Upload custom candidates JSON", type=["json"])
    if uploaded:
        try:
            custom_data = json.load(uploaded)
            if isinstance(custom_data, list):
                st.success(f"Loaded {len(custom_data)} candidates from upload")
            else:
                st.error("JSON must be an array of candidate objects")
                custom_data = None
        except Exception as e:
            st.error(f"Parse error: {e}")
            custom_data = None
    else:
        custom_data = None

    st.markdown("---")
    st.markdown("### Tech Stack")
    st.markdown("""
    - **Scoring**: Pure Python (offline)
    - **Frontend**: Streamlit
    - **Full stack**: FastAPI + React 18
    - **AI Chat**: Claude Sonnet (api.py only)
    """)

# ── Job Description ───────────────────────────────────────────────────────────
JOB_DESC = """Senior AI Engineer — Founding Team at Redrob AI
Location: Pune/Noida, India | 5–9 years experience

Must-Have Skills:
- Production embeddings-based retrieval systems (sentence-transformers, BGE, E5)
- Vector databases: Pinecone, Weaviate, Qdrant, Milvus, OpenSearch, Elasticsearch, FAISS
- Strong Python engineering
- Evaluation frameworks: NDCG, MRR, MAP, A/B testing

Nice-to-Have:
- LLM fine-tuning (LoRA, QLoRA, PEFT)
- Learning-to-rank models (XGBoost)
- Distributed systems / large-scale inference
- HuggingFace, PyTorch, FastAPI

NOT a fit:
- Consulting-only background (TCS, Infosys, Wipro, etc.)
- Title-chaser (4+ jobs under 18mo each)
- No production ML deployment experience
- Primary expertise in computer vision/speech without NLP/IR"""

# ── Main Area ─────────────────────────────────────────────────────────────────
st.title("⚡ SignalHire — Candidate Ranking Demo")
st.caption("Redrob India Runs Hackathon | Offline Scoring Sandbox")

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Scoring Components", "6")
with col2:
    st.metric("Behavioral Signals", "23")
with col3:
    st.metric("Scoring Mode", "Offline CPU")

st.divider()

job_desc_input = st.text_area(
    "Job Description",
    value=JOB_DESC,
    height=280,
    help="Pre-filled with the Senior AI Engineer JD. Edit if needed.",
)

run_btn = st.button("⚡ Rank Candidates", type="primary", use_container_width=True)

if run_btn:
    # Load candidates
    if custom_data:
        candidates = custom_data
        source_label = f"custom upload ({len(candidates)} candidates)"
    elif SAMPLE_PATH.exists():
        with open(SAMPLE_PATH, "r", encoding="utf-8") as f:
            candidates = json.load(f)
        source_label = f"sample_candidates.json ({len(candidates)} candidates)"
    else:
        st.error("No candidate data found. Upload a JSON file or ensure sample_candidates.json exists.")
        st.stop()

    st.info(f"📂 Scoring from: {source_label}")

    progress_bar = st.progress(0, text="Scoring candidates...")
    scored = []
    honeypots = 0
    start_time = time.time()

    for i, candidate in enumerate(candidates):
        if is_honeypot(candidate):
            honeypots += 1
            continue

        result = score_candidate(candidate)
        _, matched = compute_skill_score(candidate)
        reasoning = generate_reasoning(candidate, result["score_breakdown"], matched)

        scored.append({
            "candidate_id": candidate["candidate_id"],
            "name": candidate.get("profile", {}).get("anonymized_name", ""),
            "title": candidate.get("profile", {}).get("current_title", ""),
            "company": candidate.get("profile", {}).get("current_company", ""),
            "yoe": candidate.get("profile", {}).get("years_of_experience", 0),
            "location": candidate.get("profile", {}).get("location", ""),
            "score": result["final_score"],
            "skill_score": result["score_breakdown"].get("skill_score", 0),
            "career_score": result["score_breakdown"].get("career_score", 0),
            "reasoning": reasoning,
        })

        progress_bar.progress((i + 1) / len(candidates), text=f"Processed {i+1}/{len(candidates)}")

    elapsed = time.time() - start_time

    # Sort and rank
    scored.sort(key=lambda x: (-x["score"], x["candidate_id"]))
    top_100 = scored[:100]
    for i, row in enumerate(top_100):
        row["rank"] = i + 1

    progress_bar.empty()

    # Stats
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Candidates Scored", len(scored))
    c2.metric("Honeypots Removed", honeypots)
    c3.metric("Time", f"{elapsed:.1f}s")
    c4.metric("Top Score", f"{top_100[0]['score']:.4f}" if top_100 else "—")

    st.divider()

    # Display results
    st.subheader(f"Top {min(len(top_100), 100)} Candidates")

    # Color-coded dataframe
    import pandas as pd

    display_data = []
    for row in top_100:
        display_data.append({
            "Rank": row["rank"],
            "candidate_id": row["candidate_id"],
            "Name": row["name"],
            "Title": row["title"],
            "Company": row["company"],
            "YOE": row["yoe"],
            "Location": row["location"],
            "Score": row["score"],
            "Skill": round(row["skill_score"], 3),
            "Career": round(row["career_score"], 3),
            "Reasoning": row["reasoning"],
        })

    df = pd.DataFrame(display_data)

    def color_score(val):
        if val >= 0.8:
            return 'background-color: rgba(34,197,94,0.2); color: #22C55E'
        elif val >= 0.6:
            return 'background-color: rgba(245,158,11,0.15); color: #F59E0B'
        return 'background-color: rgba(239,68,68,0.1); color: #EF4444'

    styled = df.style.applymap(color_score, subset=['Score'])
    st.dataframe(styled, use_container_width=True, height=500)

    # Download CSV
    st.divider()
    st.subheader("Download Submission CSV")

    csv_buffer = io.StringIO()
    writer = csv.writer(csv_buffer)
    writer.writerow(["candidate_id", "rank", "score", "reasoning"])
    for row in top_100:
        writer.writerow([
            row["candidate_id"],
            row["rank"],
            f"{row['score']:.4f}",
            row["reasoning"],
        ])

    st.download_button(
        label="⬇ Download submission.csv",
        data=csv_buffer.getvalue().encode("utf-8"),
        file_name="submission.csv",
        mime="text/csv",
        use_container_width=True,
    )

    st.success("✅ CSV is in valid submission format. Scores formatted to 4 decimal places.")

    # Validate reminder
    st.info("💡 Validate locally: `python validate_submission.py submission.csv`")
