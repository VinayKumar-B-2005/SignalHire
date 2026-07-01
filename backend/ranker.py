#!/usr/bin/env python3
"""
SignalHire — ranker.py
Core scoring engine. Streams candidates.jsonl line-by-line (never loads all into memory).
Scores each candidate against the Senior AI Engineer job description.

CLI usage:
    python ranker.py --candidates ./candidates.jsonl --out ./submission.csv
"""

import json
import csv
import math
import argparse
import time
import sys
from datetime import date, datetime
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# REFERENCE DATE (fixed per spec)
# ─────────────────────────────────────────────────────────────────────────────
REFERENCE_DATE = date(2026, 6, 25)

# ─────────────────────────────────────────────────────────────────────────────
# SKILL LISTS
# ─────────────────────────────────────────────────────────────────────────────
MUST_HAVE_SKILLS = [
    "python", "embeddings", "vector database", "retrieval", "semantic search",
    "ranking", "nlp", "elasticsearch", "faiss", "pinecone", "weaviate", "qdrant",
    "milvus", "opensearch", "sentence transformers", "bert", "transformer",
    "fine-tuning", "llm", "rag", "ndcg", "mrr", "map", "evaluation framework",
    "hybrid search", "bm25", "dense retrieval", "reranking", "information retrieval"
]

NICE_TO_HAVE_SKILLS = [
    "lora", "qlora", "peft", "xgboost", "learning to rank", "a/b testing",
    "distributed systems", "huggingface", "langchain", "openai", "pytorch",
    "tensorflow", "triton", "onnx", "fastapi", "docker", "kubernetes"
]

DISQUALIFIER_SKILLS = [
    "marketing", "sales", "customer support", "accounting", "photoshop",
    "seo", "social media", "content writing", "graphic design", "cold calling"
]

# ─────────────────────────────────────────────────────────────────────────────
# CAREER SCORING
# ─────────────────────────────────────────────────────────────────────────────
TITLE_SCORES = {
    "ml engineer": 1.0,
    "machine learning engineer": 1.0,
    "ai engineer": 1.0,
    "applied scientist": 0.95,
    "research engineer": 0.9,
    "nlp engineer": 1.0,
    "search engineer": 0.95,
    "ranking engineer": 0.95,
    "data scientist": 0.75,
    "software engineer": 0.5,
    "backend engineer": 0.45,
    "data engineer": 0.4,
    "full stack": 0.35,
    "frontend": 0.2,
    "product manager": 0.15,
    "manager": 0.1,
    "consultant": 0.1,
    "analyst": 0.2,
    "marketing": 0.0,
    "operations": 0.05,
    "customer support": 0.0,
}

CONSULTING_FIRMS = [
    "tcs", "infosys", "wipro", "accenture", "cognizant", "capgemini",
    "hcl", "tech mahindra", "mindtree", "mphasis", "hexaware",
    "ibm consulting", "deloitte", "kpmg", "ey", "pwc"
]

PRODUCT_COMPANY_SIZES_BONUS_HIGH = {"51-200", "201-500"}
PRODUCT_COMPANY_SIZES_BONUS_LOW = {"1001-5000", "5001-10000"}

DESCRIPTION_KEYWORDS = [
    "production", "deployed", "real users", "at scale", "retrieval system",
    "search system", "ranking system", "recommendation", "embeddings pipeline",
    "vector index", "a/b test", "offline evaluation", "online evaluation"
]

PROFICIENCY_WEIGHTS = {
    "expert": 1.0,
    "advanced": 0.8,
    "intermediate": 0.5,
    "beginner": 0.2,
}


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def is_consulting(company_name: str) -> bool:
    name_lower = company_name.lower()
    for firm in CONSULTING_FIRMS:
        if firm in name_lower:
            return True
    return False


def score_title(title: str) -> float:
    title_lower = title.lower()
    best = 0.0
    for pattern, sc in TITLE_SCORES.items():
        if pattern in title_lower:
            best = max(best, sc)
    return best


def days_since(date_str: str) -> int:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
        return (REFERENCE_DATE - d).days
    except Exception:
        return 9999


# ─────────────────────────────────────────────────────────────────────────────
# HONEYPOT DETECTION
# ─────────────────────────────────────────────────────────────────────────────

HONEYPOT_COUNTS = {f"Rule {i}": 0 for i in range(1, 10)}

def is_honeypot(candidate: dict) -> bool:
    global HONEYPOT_COUNTS
    profile = candidate.get("profile", {})
    career = candidate.get("career_history", [])
    skills = candidate.get("skills", [])
    signals = candidate.get("redrob_signals", {})
    education = candidate.get("education", [])

    yoe = profile.get("years_of_experience", 0)
    total_career_months = sum(r.get("duration_months", 0) for r in career)
    expert_zero_duration = sum(
        1 for s in skills
        if s.get("proficiency") == "expert" and s.get("duration_months", 0) == 0
    )
    expert_skill_count = sum(1 for s in skills if s.get("proficiency") == "expert")

    pc = signals.get("profile_completeness_score", 0)
    gh = signals.get("github_activity_score", -1)
    rr = signals.get("recruiter_response_rate", 0)
    ic = signals.get("interview_completion_rate", 0)

    # Rule 1: yoe > 8 but total career months < 24
    if yoe > 8 and total_career_months < 24:
        HONEYPOT_COUNTS["Rule 1"] += 1
        return True

    # Rule 2: 5+ expert skills with duration_months == 0
    if expert_zero_duration >= 5:
        HONEYPOT_COUNTS["Rule 2"] += 1
        return True

    # Rule 3: Any single role has duration > (yoe * 12) + 24
    for role in career:
        dur = role.get("duration_months", 0)
        if dur > (yoe * 12) + 24:
            HONEYPOT_COUNTS["Rule 3"] += 1
            return True

    # Rule 4: yoe < 2 but 8+ expert skills
    if yoe < 2 and expert_skill_count >= 8:
        HONEYPOT_COUNTS["Rule 4"] += 1
        return True

    # Rule 5: all four platform metrics maxed out perfectly
    if pc == 100 and gh == 100 and rr == 1.0 and ic == 1.0:
        HONEYPOT_COUNTS["Rule 5"] += 1
        return True

    # NEW RULES
    phd_terms = {"ph.d", "phd", "doctorate"}
    masters_terms = {"masters", "m.s.", "m.sc", "m.e.", "m.tech", "mba", "m.a."}
    bachelor_terms = {"b.e.", "b.tech", "b.sc", "bachelor"}

    tier1_count = 0
    all_degrees_are_pg = True
    undergrad_count = 0
    
    phd_ends = []
    ug_starts = []

    for edu in education:
        deg = edu.get("degree", "")
        if deg is None:
            deg = ""
        deg_lower = deg.lower()
        start = edu.get("start_year") or 0
        end = edu.get("end_year") or 0
        tier = edu.get("tier", "")
        
        is_phd = any(t in deg_lower for t in phd_terms)
        is_masters = any(t in deg_lower for t in masters_terms)
        is_pg = is_phd or is_masters
        is_ug = any(t in deg_lower for t in bachelor_terms)

        # Rule 7: Education clearly impossible timeline
        if start > 0 and end > 0:
            if start - end > 1:
                HONEYPOT_COUNTS["Rule 7"] += 1
                return True

        if is_phd and end > 0:
            phd_ends.append(end)
                
        if is_ug and start > 0:
            undergrad_count += 1
            ug_starts.append(start)
                
        if not is_pg:
            all_degrees_are_pg = False
            
        if tier == "tier_1":
            tier1_count += 1

    # Rule 6: PhD completed before Bachelor's started, gap > 13 years (loosened)
    for p_end in phd_ends:
        for u_start in ug_starts:
            if p_end < u_start and (u_start - p_end) > 13:
                HONEYPOT_COUNTS["Rule 6"] += 1
                return True

    # Rule 8: Multiple top-tier postgrad degrees with no Bachelor's (loosened)
    if len(education) > 0 and tier1_count >= 2 and all_degrees_are_pg and undergrad_count == 0 and yoe < 3:
        HONEYPOT_COUNTS["Rule 8"] += 1
        return True

    return False


# ─────────────────────────────────────────────────────────────────────────────
# SKILL SCORE
# ─────────────────────────────────────────────────────────────────────────────

def compute_skill_score(candidate: dict) -> tuple[float, list[str]]:
    skills = candidate.get("skills", [])
    profile = candidate.get("profile", {})
    career = candidate.get("career_history", [])
    signals = candidate.get("redrob_signals", {})
    assessment_scores = signals.get("skill_assessment_scores", {})

    # Build text corpus for keyword search
    text_corpus = (profile.get("summary", "") + " ").lower()
    for role in career:
        text_corpus += (role.get("description", "") + " ").lower()

    # Score must-have skills
    must_have_values = []
    matched_must_have = []
    disqualifier_count = 0

    for skill in skills:
        skill_name = skill.get("name", "").lower()
        proficiency = skill.get("proficiency", "beginner")
        endorsements = skill.get("endorsements", 0)
        duration_months = skill.get("duration_months", 0)

        # Check disqualifiers
        for dq in DISQUALIFIER_SKILLS:
            if dq in skill_name:
                disqualifier_count += 1
                break

        # Check must-have
        matched = False
        for mh in MUST_HAVE_SKILLS:
            if mh in skill_name or skill_name in mh:
                matched = True
                matched_must_have.append(skill.get("name", skill_name))
                break

        if matched:
            pw = PROFICIENCY_WEIGHTS.get(proficiency, 0.2)
            ew = min(math.log(endorsements + 1) / math.log(100), 1.0)
            dw = min(duration_months / 24, 1.0)
            skill_val = pw * 0.5 + ew * 0.25 + dw * 0.25

            # Assessment bonus
            for assess_key, assess_val in assessment_scores.items():
                if mh in assess_key.lower() or assess_key.lower() in mh:
                    skill_val += (assess_val / 100) * 0.2
                    break

            must_have_values.append(skill_val)

    # Normalize
    if len(MUST_HAVE_SKILLS) > 0:
        skill_score = sum(must_have_values) / len(MUST_HAVE_SKILLS)
    else:
        skill_score = 0.0

    # Nice-to-have bonus (max 0.3)
    nth_bonus = 0.0
    for skill in skills:
        skill_name = skill.get("name", "").lower()
        for nth in NICE_TO_HAVE_SKILLS:
            if nth in skill_name or skill_name in nth:
                nth_bonus += 0.1
                break
    skill_score += min(nth_bonus, 0.3)

    # Disqualifier penalty
    if disqualifier_count >= 3:
        skill_score *= 0.3

    # Text keyword bonus (max 0.3)
    text_bonus = 0.0
    found_keywords = set()
    for kw in MUST_HAVE_SKILLS:
        if kw in text_corpus and kw not in found_keywords:
            text_bonus += 0.05
            found_keywords.add(kw)
    skill_score += min(text_bonus, 0.3)

    return min(skill_score, 1.0), list(set(matched_must_have))[:10]


# ─────────────────────────────────────────────────────────────────────────────
# CAREER SCORE
# ─────────────────────────────────────────────────────────────────────────────

def compute_career_score(candidate: dict) -> float:
    profile = candidate.get("profile", {})
    career = candidate.get("career_history", [])

    current_title = profile.get("current_title", "")
    current_company = profile.get("current_company", "")
    current_company_size = profile.get("current_company_size", "")

    # Title scoring with 2x weight for current title
    title_scores_list = []
    current_title_score = score_title(current_title)
    title_scores_list.append((current_title_score, 2.0))  # 2x weight

    for role in career:
        if not role.get("is_current", False):
            ts = score_title(role.get("title", ""))
            title_scores_list.append((ts, 1.0))

    weighted_sum = sum(s * w for s, w in title_scores_list)
    total_weight = sum(w for _, w in title_scores_list)
    career_score = weighted_sum / total_weight if total_weight > 0 else 0.0

    # Consulting firm detection
    current_is_consulting = is_consulting(current_company)
    has_non_consulting_history = any(
        not is_consulting(r.get("company", "")) for r in career if not r.get("is_current", False)
    )

    if current_is_consulting:
        all_consulting = not has_non_consulting_history
        if all_consulting:
            career_score *= 0.3
        else:
            career_score *= 0.7

    # Product company size bonus
    if not current_is_consulting:
        if current_company_size in PRODUCT_COMPANY_SIZES_BONUS_HIGH:
            career_score += 0.1
        elif current_company_size in PRODUCT_COMPANY_SIZES_BONUS_LOW:
            career_score += 0.05

    # Description keyword bonus (max 0.35)
    desc_bonus = 0.0
    found_desc_kw = set()
    for role in career:
        desc_lower = role.get("description", "").lower()
        for kw in DESCRIPTION_KEYWORDS:
            if kw in desc_lower and kw not in found_desc_kw:
                desc_bonus += 0.05
                found_desc_kw.add(kw)
    career_score += min(desc_bonus, 0.35)

    # Title chaser detection: 4+ jobs with duration < 18 months
    short_stints = sum(1 for r in career if r.get("duration_months", 999) < 18)
    if short_stints >= 4:
        career_score *= 0.75

    return min(career_score, 1.0)


# ─────────────────────────────────────────────────────────────────────────────
# EXPERIENCE SCORE
# ─────────────────────────────────────────────────────────────────────────────

def compute_experience_score(yoe: float) -> float:
    if yoe < 2:
        return 0.1
    elif yoe < 4:
        return 0.4
    elif yoe < 5:
        return 0.65
    elif yoe < 7:
        return 0.85
    elif yoe < 9:
        return 1.0
    elif yoe < 11:
        return 0.85
    elif yoe < 14:
        return 0.65
    else:
        return 0.45


# ─────────────────────────────────────────────────────────────────────────────
# LOCATION SCORE
# ─────────────────────────────────────────────────────────────────────────────

PREFERRED_CITIES = [
    "pune", "noida", "hyderabad", "mumbai", "bangalore",
    "bengaluru", "delhi", "gurugram", "gurgaon", "chennai"
]


def compute_location_score(candidate: dict) -> float:
    profile = candidate.get("profile", {})
    signals = candidate.get("redrob_signals", {})

    location = profile.get("location", "").lower()
    country = profile.get("country", "").lower()
    willing_to_relocate = signals.get("willing_to_relocate", False)

    for city in PREFERRED_CITIES:
        if city in location:
            return 1.0

    if country == "india":
        if willing_to_relocate:
            return 0.85
        return 0.8

    if willing_to_relocate:
        return 0.5

    return 0.2


# ─────────────────────────────────────────────────────────────────────────────
# EDUCATION SCORE
# ─────────────────────────────────────────────────────────────────────────────

TIER_SCORES = {
    "tier_1": 1.0,
    "tier_2": 0.75,
    "tier_3": 0.5,
    "tier_4": 0.25,
    "unknown": 0.4,
}

STEM_FIELDS = [
    "computer science", "machine learning", "artificial intelligence",
    "ai", "statistics", "mathematics", "data science"
]


def compute_education_score(candidate: dict) -> float:
    education = candidate.get("education", [])
    if not education:
        return 0.4  # unknown default

    best_tier_score = 0.0
    has_stem = False

    for edu in education:
        tier = edu.get("tier", "unknown")
        ts = TIER_SCORES.get(tier, 0.4)
        best_tier_score = max(best_tier_score, ts)

        field = edu.get("field_of_study", "").lower()
        for sf in STEM_FIELDS:
            if sf in field:
                has_stem = True
                break

    if has_stem:
        best_tier_score = min(best_tier_score + 0.15, 1.0)

    return best_tier_score


# ─────────────────────────────────────────────────────────────────────────────
# AVAILABILITY SCORE
# ─────────────────────────────────────────────────────────────────────────────

def compute_availability_score(candidate: dict) -> float:
    signals = candidate.get("redrob_signals", {})

    notice_days = signals.get("notice_period_days", 90)
    salary_range = signals.get("expected_salary_range_inr_lpa", {})
    salary_max = salary_range.get("max", 60)

    # Notice score
    if notice_days <= 15:
        notice_score = 1.0
    elif notice_days <= 30:
        notice_score = 0.9
    elif notice_days <= 60:
        notice_score = 0.7
    elif notice_days <= 90:
        notice_score = 0.5
    else:
        notice_score = 0.25

    # Salary score
    if salary_max < 40:
        salary_score = 1.0
    elif salary_max < 60:
        salary_score = 0.85
    elif salary_max < 80:
        salary_score = 0.7
    elif salary_max < 100:
        salary_score = 0.55
    else:
        salary_score = 0.4

    return (notice_score + salary_score) / 2.0


# ─────────────────────────────────────────────────────────────────────────────
# BEHAVIORAL MULTIPLIER
# ─────────────────────────────────────────────────────────────────────────────

def compute_behavioral_multiplier(candidate: dict) -> float:
    signals = candidate.get("redrob_signals", {})
    multiplier = 1.0

    # Open to work
    if not signals.get("open_to_work_flag", True):
        multiplier *= 0.45

    # Last active days
    last_active = signals.get("last_active_date", "2025-01-01")
    days_ago = days_since(last_active)
    if days_ago < 7:
        multiplier *= 1.1
    elif days_ago < 30:
        multiplier *= 1.0
    elif days_ago < 90:
        multiplier *= 0.85
    elif days_ago < 180:
        multiplier *= 0.7
    else:
        multiplier *= 0.5

    # Recruiter response rate
    rrr = signals.get("recruiter_response_rate", 0.5)
    if rrr > 0.8:
        multiplier *= 1.1
    elif rrr >= 0.5:
        multiplier *= 1.0
    elif rrr >= 0.3:
        multiplier *= 0.9
    elif rrr >= 0.1:
        multiplier *= 0.75
    else:
        multiplier *= 0.6

    # Interview completion rate
    icr = signals.get("interview_completion_rate", 0.5)
    if icr < 0.4:
        multiplier *= 0.8

    # GitHub activity
    gh = signals.get("github_activity_score", -1)
    if gh > 70:
        multiplier *= 1.15
    elif gh >= 40:
        multiplier *= 1.05
    elif gh == -1:
        multiplier *= 0.95

    # Verified contact
    if signals.get("verified_email", False) and signals.get("verified_phone", False):
        multiplier *= 1.05

    # Profile completeness
    pc = signals.get("profile_completeness_score", 70)
    if pc > 90:
        multiplier *= 1.08
    elif pc < 50:
        multiplier *= 0.9

    # Saved by recruiters 30d
    saved = signals.get("saved_by_recruiters_30d", 0)
    if saved > 10:
        multiplier *= 1.08

    # Offer acceptance rate
    oar = signals.get("offer_acceptance_rate", -1)
    if oar > 0.7:
        multiplier *= 1.05

    # Clamp
    return max(0.25, min(1.25, multiplier))


# ─────────────────────────────────────────────────────────────────────────────
# REASONING GENERATION
# ─────────────────────────────────────────────────────────────────────────────

def generate_reasoning(candidate: dict, score_breakdown: dict, matched_skills: list) -> str:
    profile = candidate.get("profile", {})
    signals = candidate.get("redrob_signals", {})
    career = candidate.get("career_history", [])

    name = profile.get("anonymized_name", "Candidate")
    title = profile.get("current_title", "Unknown")
    company = profile.get("current_company", "Unknown")
    yoe = profile.get("years_of_experience", 0)
    location = profile.get("location", "Unknown")
    country = profile.get("country", "")

    # Pick top 2 matching skills by name
    top_skills = matched_skills[:2] if matched_skills else []

    # Behavioral signal
    days_ago = days_since(signals.get("last_active_date", "2025-01-01"))
    rrr = signals.get("recruiter_response_rate", 0.0)
    gh = signals.get("github_activity_score", -1)

    if days_ago < 7:
        behavior_signal = f"active {days_ago}d ago"
    elif days_ago < 30:
        behavior_signal = f"last active {days_ago}d ago"
    elif days_ago < 90:
        behavior_signal = f"last seen {days_ago}d ago"
    else:
        behavior_signal = f"inactive for {days_ago}d"

    if gh > 60:
        behavior_signal += f" with GitHub score {gh:.0f}"
    elif rrr > 0.7:
        behavior_signal += f"; response rate {rrr:.0%}"

    # Concerns
    concerns = []
    notice_days = signals.get("notice_period_days", 0)

    # Consulting check
    current_is_consulting = is_consulting(company)
    has_non_consulting = any(
        not is_consulting(r.get("company", "")) for r in career if not r.get("is_current", False)
    )
    if current_is_consulting and not has_non_consulting:
        concerns.append("consulting-only background")

    if notice_days > 60:
        concerns.append(f"notice period of {notice_days}d")

    if rrr < 0.2:
        concerns.append(f"low response rate ({rrr:.0%})")

    if country.lower() not in ("india", "") and not signals.get("willing_to_relocate", False):
        concerns.append(f"location outside India ({location})")

    # Build sentence 1
    skill_mention = ""
    if top_skills:
        skill_mention = f"; {' and '.join(top_skills)}"
        # Add proficiency info
        skill_map = {s.get("name", "").lower(): s for s in candidate.get("skills", [])}
        details = []
        for sk in top_skills[:2]:
            s_obj = skill_map.get(sk.lower(), {})
            prof = s_obj.get("proficiency", "")
            end = s_obj.get("endorsements", 0)
            if prof and end > 0:
                details.append(f"{sk} ({prof}, {end} endorsements)")
            elif prof:
                details.append(f"{sk} ({prof})")
        if details:
            skill_mention = "; " + " and ".join(details)

    sentence1 = f"{title} with {yoe:.1f}yr at {company}{skill_mention}, {behavior_signal}."

    # Build sentence 2
    if concerns:
        sentence2 = "Concern: " + "; ".join(concerns) + "."
    else:
        sentence2 = f"Located in {location}{'.' if location else '.'}"
        if score_breakdown.get("career_score", 0) > 0.7:
            sentence2 = f"Strong career trajectory at product companies in {location}."

    return f"{sentence1} {sentence2}".strip()


# ─────────────────────────────────────────────────────────────────────────────
# FINAL SCORE
# ─────────────────────────────────────────────────────────────────────────────

def score_candidate(candidate: dict) -> dict:
    if is_honeypot(candidate):
        return {
            "candidate_id": candidate["candidate_id"],
            "final_score": 0.0,
            "is_honeypot": True,
            "score_breakdown": {},
            "matched_skills": [],
            "reasoning": "Flagged as honeypot: profile contains statistically impossible data.",
        }

    skill_score, matched_skills = compute_skill_score(candidate)
    career_score = compute_career_score(candidate)
    experience_score = compute_experience_score(
        candidate.get("profile", {}).get("years_of_experience", 0)
    )
    location_score = compute_location_score(candidate)
    education_score = compute_education_score(candidate)
    availability_score = compute_availability_score(candidate)
    behavioral_multiplier = compute_behavioral_multiplier(candidate)

    raw_score = (
        skill_score * 0.35
        + career_score * 0.30
        + experience_score * 0.15
        + location_score * 0.10
        + education_score * 0.05
        + availability_score * 0.05
    )

    final_score = raw_score * behavioral_multiplier
    final_score = max(0.0, min(1.0, final_score))

    score_breakdown = {
        "skill_score": skill_score,
        "career_score": career_score,
        "experience_score": experience_score,
        "location_score": location_score,
        "education_score": education_score,
        "availability_score": availability_score,
        "behavioral_multiplier": behavioral_multiplier,
        "final_score": final_score,
    }

    return {
        "candidate_id": candidate["candidate_id"],
        "final_score": final_score,
        "is_honeypot": False,
        "score_breakdown": score_breakdown,
        "matched_skills": matched_skills,
        "reasoning": "",  # Generated later for top 100 only
    }


# ─────────────────────────────────────────────────────────────────────────────
# STREAMING RANKER
# ─────────────────────────────────────────────────────────────────────────────

def stream_candidates(jsonl_path: str):
    """Generator: yields one parsed candidate dict at a time."""
    path = Path(jsonl_path)
    if not path.exists():
        raise FileNotFoundError(f"candidates file not found: {jsonl_path}")

    if str(path).endswith(".xz"):
        import lzma
        with lzma.open(path, "rt", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue
    else:
        with open(path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue


def rank_candidates(
    jsonl_path: str,
    top_n: int = 100,
    progress_callback=None,
) -> dict:
    """
    Stream and score all candidates. Returns top_n results with full data.
    Uses a bounded heap to avoid memory issues.
    """
    import heapq

    start_time = time.time()
    total_processed = 0
    honeypots_removed = 0

    # We keep a min-heap of size top_n to track best candidates
    # heap items: (score, candidate_id, result_dict, original_candidate)
    heap = []

    # Also store all non-honeypot candidates for stat purposes
    all_scores = []

    # Cache for top candidates (we need the original candidate for reasoning)
    candidate_cache = {}

    for candidate in stream_candidates(jsonl_path):
        total_processed += 1

        result = score_candidate(candidate)

        if result["is_honeypot"]:
            honeypots_removed += 1
            continue

        score = result["final_score"]
        cid = result["candidate_id"]
        all_scores.append(score)

        # Min-heap trick: push negative score so largest float = highest priority
        if len(heap) < top_n:
            heapq.heappush(heap, (score, cid, result))
            candidate_cache[cid] = candidate
        elif score > heap[0][0]:
            evicted = heapq.heapreplace(heap, (score, cid, result))
            evicted_id = evicted[1]
            candidate_cache.pop(evicted_id, None)
            candidate_cache[cid] = candidate

        if progress_callback and total_processed % 5000 == 0:
            progress_callback(total_processed, score)

    elapsed = time.time() - start_time

    # Sort heap descending
    top_results = sorted(heap, key=lambda x: (-x[0], x[1]))  # stable: tie-break by cid asc

    # Generate reasoning for top 100
    ranked = []
    for rank_idx, (score, cid, result) in enumerate(top_results, start=1):
        original_candidate = candidate_cache.get(cid, {})
        reasoning = generate_reasoning(
            original_candidate, result["score_breakdown"], result["matched_skills"]
        )
        result["reasoning"] = reasoning
        result["rank"] = rank_idx
        result["candidate"] = original_candidate
        ranked.append(result)

    top_score = ranked[0]["final_score"] if ranked else 0.0
    avg_score = sum(all_scores) / len(all_scores) if all_scores else 0.0

    return {
        "ranked": ranked,
        "stats": {
            "total_processed": total_processed,
            "honeypots_removed": honeypots_removed,
            "time_seconds": round(elapsed, 2),
            "top_score": round(top_score, 4),
            "avg_score": round(avg_score, 4),
        },
        "all_scores": all_scores,
    }


# ─────────────────────────────────────────────────────────────────────────────
# CSV WRITER
# ─────────────────────────────────────────────────────────────────────────────

def write_csv(ranked: list, out_path: str):
    out = Path(out_path)
    with open(out, "w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["candidate_id", "rank", "score", "reasoning"])
        for r in ranked:
            writer.writerow([
                r["candidate_id"],
                r["rank"],
                f"{r['final_score']:.4f}",
                r["reasoning"],
            ])


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="SignalHire ranker — score candidates for Senior AI Engineer JD"
    )
    parser.add_argument(
        "--candidates",
        default="./candidates.jsonl",
        help="Path to candidates.jsonl (default: ./candidates.jsonl)",
    )
    parser.add_argument(
        "--out",
        default="./submission.csv",
        help="Output CSV path (default: ./submission.csv)",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=100,
        help="Number of top candidates to output (default: 100)",
    )
    args = parser.parse_args()

    print(f"[SignalHire] Reading: {args.candidates}")
    print(f"[SignalHire] Output:  {args.out}")
    print()

    def progress(n, score):
        print(f"\r  Processed: {n:,} candidates...", end="", flush=True)

    results = rank_candidates(args.candidates, top_n=args.top_n, progress_callback=progress)
    print()  # newline after progress

    stats = results["stats"]
    write_csv(results["ranked"], args.out)

    print(f"\n{'='*50}")
    print(f"  Total processed  : {stats['total_processed']:,}")
    print(f"  Honeypots removed: {stats['honeypots_removed']}")
    print(f"    - Rule 6       : {HONEYPOT_COUNTS.get('Rule 6', 0)}")
    print(f"    - Rule 7       : {HONEYPOT_COUNTS.get('Rule 7', 0)}")
    print(f"    - Rule 8       : {HONEYPOT_COUNTS.get('Rule 8', 0)}")
    print(f"  Time taken       : {stats['time_seconds']}s")
    print(f"  Top score        : {stats['top_score']:.4f}")
    print(f"  Avg score        : {stats['avg_score']:.4f}")
    print(f"  Output           : {args.out}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
