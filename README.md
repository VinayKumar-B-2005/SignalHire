# ⚡ SignalHire

[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.35-FF4B4B?logo=streamlit)](https://streamlit.io)

> **Hire by signal, not by keyword.**

SignalHire is a full-stack AI-powered candidate intelligence and ranking platform built for the Redrob India Runs Hackathon. It reads 100,000 candidate profiles using a streaming approach, scores each against the Senior AI Engineer job description using 6 weighted components and 23 behavioral signals, and surfaces a ranked top-100 shortlist with specific, data-grounded reasoning for each candidate.

---

## Architecture

```
candidates.jsonl (450MB, 100K profiles)
        │
        ▼  streaming generator (line-by-line, O(1) memory)
  backend/ranker.py
        │  6-component scoring + behavioral multiplier
        │  honeypot detection
        ▼
  backend/api.py (FastAPI + Uvicorn)
        │  POST /api/rank    → ranked top-100 with reasoning
        │  GET  /api/stats   → score distribution, top skills
        │  POST /api/chat    → Anthropic Claude (AI assistant only)
        │  POST /api/export  → submission.csv download
        │  POST /api/compare → side-by-side comparison
        ▼
  frontend/ (React 18 + Vite + Tailwind + Framer Motion + Recharts)
        │  Landing page   → JD textarea + progress animation
        │  Results page   → filter sidebar + candidate cards + modal
        │  Analytics page → charts: distribution, skills, scatter
        │  Bookmarks      → saved candidates + CSV export
        │  AI Chat        → floating panel → /api/chat
        ▼
  streamlit_app.py  (Streamlit Cloud sandbox demo)
```

---

## Setup

### Backend

```bash
cd SignalHire/backend
pip install -r requirements.txt

# Optional: copy candidates.jsonl here for full 100K analysis
# cp ../../candidates.jsonl ./candidates.jsonl

uvicorn api:app --reload --port 8000
```

### Frontend

```bash
cd SignalHire/frontend
npm install
npm run dev
# → http://localhost:5173
```

### Environment Variables (optional — only for AI Chat)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

---

## CLI Usage

Produce `submission.csv` directly from the command line:

```bash
python backend/ranker.py --candidates ./backend/candidates.jsonl --out ./submission.csv
```

Output:
```
==================================================
  Total processed  : 100,000
  Honeypots removed: 83
  Time taken       : 74.3s
  Top score        : 0.9241
  Avg score        : 0.2847
  Output           : ./submission.csv
==================================================
```

---

## Validate Submission

```bash
python validate_submission.py submission.csv
# → Submission is valid.
```

---

## Streamlit Cloud Sandbox

1. Fork this repo
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Select `SignalHire/streamlit_app.py` as entry point
4. Deploy — no API keys needed (fully offline scoring)

---

## Folder Structure

```
SignalHire/
├── backend/
│   ├── ranker.py              # Core scoring engine (streaming, offline)
│   ├── api.py                 # FastAPI server
│   ├── requirements.txt
│   └── candidates.jsonl       # Drop the 450MB file here
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx    # JD input + loading animation
│   │   │   ├── Results.jsx    # Ranked cards + filters + modals
│   │   │   └── Analytics.jsx  # Charts + scatter plot
│   │   └── components/
│   │       ├── CandidateCard.jsx
│   │       ├── CandidateModal.jsx  # 5-tab deep-dive panel
│   │       ├── ScoreRing.jsx
│   │       ├── ScoreBreakdownBar.jsx
│   │       ├── FilterSidebar.jsx
│   │       ├── StatsBar.jsx
│   │       ├── CompareModal.jsx
│   │       ├── AIChat.jsx
│   │       ├── BookmarkPanel.jsx
│   │       └── Navbar.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── streamlit_app.py           # Streamlit Cloud sandbox
├── validate_submission.py     # Official format validator
├── submission_metadata.yaml
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS 3, Framer Motion 11, Recharts 2 |
| Backend | Python FastAPI, Uvicorn |
| Scoring | Pure Python (no ML inference, fully offline) |
| AI Chat | Anthropic `claude-sonnet-4-6` (api.py only, never during ranking) |
| Sandbox | Streamlit 1.35 |

---

## Scoring Model

### Formula

```
final_score = (
  skill_score     * 0.35 +
  career_score    * 0.30 +
  experience_score * 0.15 +
  location_score  * 0.10 +
  education_score * 0.05 +
  availability_score * 0.05
) × behavioral_multiplier
```

Behavioral multiplier is clamped to [0.25, 1.25].

### Components

| Component | Weight | Key signals |
|-----------|--------|-------------|
| **Skill Score** | 35% | 29 must-have keywords; weighted by proficiency, endorsements (log-normalized), duration; assessment scores add bonus |
| **Career Score** | 30% | Title scoring (ML Engineer=1.0, Marketing=0.0); consulting firm penalty; description keyword bonus; title-chaser penalty |
| **Experience Score** | 15% | Sweet spot 7–9yr=1.0; symmetric dropoff; no binary cutoff |
| **Location Score** | 10% | Preferred Indian cities=1.0; India+willing to relocate=0.85; outside India=0.2–0.5 |
| **Education Score** | 5% | Tier 1–4 scoring + STEM field bonus |
| **Availability Score** | 5% | Notice period + salary max fit |
| **Behavioral Multiplier** | ×[0.25, 1.25] | 23 Redrob signals: open_to_work, last_active, response_rate, github, completeness, etc. |

### Honeypot Detection

Five rules flag impossible profiles and exclude them from top-100:
1. YOE > 8 but total career duration < 24 months
2. 5+ expert skills with duration_months = 0
3. Any single role duration > (YOE × 12) + 24
4. YOE < 2 but 8+ expert-level skills
5. All four platform metrics simultaneously maxed (pc=100, gh=100, rr=1.0, ic=1.0)

---

## AI Tools Declaration

- **Claude (Antigravity)**: Used as an AI coding assistant for architecture design, code generation, and system building. All scoring formulas, honeypot rules, and feature engineering decisions are original engineering work.
- **No LLM API calls during ranking**: The ranker is pure Python and runs completely offline.
- **Anthropic API**: Used only in `api.py` for the `/api/chat` endpoint (recruiter AI assistant) — never during candidate scoring.
