import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, ChevronRight, Loader2 } from 'lucide-react'
import { useApp } from '../App.jsx'

const JOB_DESCRIPTION = `Job Description: Senior AI Engineer — Founding Team
Company: Redrob AI (Series A AI-native talent intelligence platform)
Location: Pune/Noida, India (Hybrid — flexible cadence) | Open to relocation candidates from Tier-1 Indian cities
Employment Type: Full-time
Experience Required: 5–9 years (see "what we mean by this" below)

Let's be honest about this role
We're going to write this JD differently from most. We're a Series A company that just raised our round and we're building a new AI Engineering org from scratch. This is the kind of role where the JD changes every six months because the company changes every six months. So instead of pretending we have a fixed checklist, we're going to tell you what we actually need and what we've gotten wrong before.

If you've spent your career at Google or Meta and you want a well-scoped role with a defined ladder, this isn't it.

If you've spent your career bouncing between early-stage startups and you want to "just code" without having to think about product or recruiter workflows or eval frameworks, this also isn't it.

We need someone who is simultaneously comfortable with two things that sound contradictory:
Deep technical depth in modern ML systems — embeddings, retrieval, ranking, LLMs, fine-tuning.
Scrappy product-engineering attitude — willing to ship a working ranker in a week even if the underlying ML is "obviously suboptimal," because we need to learn from real users before we know what to actually optimize for.

These are not contradictory in real life. They feel contradictory because of how engineering culture sorted itself into "researcher" vs "shipper" archetypes. We need both modes available in the same person, and we'd rather you tilt slightly toward shipper than toward researcher.

What you'd actually be doing
The high-level mandate: own the intelligence layer of Redrob's product. That means the ranking, retrieval, and matching systems that decide what recruiters see when they search for candidates and what candidates see when they search for roles.

In practical terms, your first 90 days will probably look like:
Weeks 1-3: Audit what we currently have (it's mostly BM25 + rule-based scoring, working but not great). Identify the 3-4 highest-leverage things to fix.
Weeks 4-8: Ship a v2 ranking system that demonstrably improves recruiter-engagement metrics. This will involve embeddings, hybrid retrieval, and probably some LLM-based re-ranking, but the architecture is your call.
Weeks 9-12: Set up the evaluation infrastructure — offline benchmarks, online A/B testing, recruiter-feedback loops — so we can keep improving without flying blind.

Beyond that, you'll be driving the long-term architecture of how we do candidate-JD matching at scale, mentoring the next round of hires (we're growing the team from 4 to 12 engineers in the next year), and working closely with our recruiter-experience PM on what to build.

What we mean by "5-9 years"
This is a range, not a requirement. Some people hit "senior engineer" judgment at 4 years; some never hit it after 15. We've used 5-9 because it's roughly where people we've hired into this kind of role have landed, but we'll seriously consider candidates outside the band if other signals are strong.

That said, here are the disqualifiers we actually apply:
If you've spent your career in pure research environments (academic labs, research-only roles) without any production deployment — we will not move forward.
If your "AI experience" consists primarily of recent (under 12 months) projects using LangChain to call OpenAI — we will probably not move forward.
If you are a senior engineer who hasn't written production code in the last 18 months — we will probably not move forward.

The skills inventory (please read carefully)

Things you absolutely need:
- Production experience with embeddings-based retrieval systems (sentence-transformers, OpenAI embeddings, BGE, E5, or similar) deployed to real users
- Production experience with vector databases or hybrid search infrastructure — Pinecone, Weaviate, Qdrant, Milvus, OpenSearch, Elasticsearch, FAISS
- Strong Python. Yes really, we care about code quality.
- Hands-on experience designing evaluation frameworks for ranking systems — NDCG, MRR, MAP, offline-to-online correlation, A/B test interpretation

Things we'd like you to have but won't reject you for:
- LLM fine-tuning experience (LoRA, QLoRA, PEFT)
- Experience with learning-to-rank models (XGBoost-based or neural)
- Prior exposure to HR-tech, recruiting tech, or marketplace products
- Background in distributed systems or large-scale inference optimization
- Open-source contributions in the AI/ML space

Things we explicitly do NOT want:
- Title-chasers optimizing for "Senior" → "Staff" → "Principal" titles by switching every 1.5 years
- Framework enthusiasts with only LangChain tutorials and demos
- People who have only worked at consulting firms (TCS, Infosys, Wipro, Accenture, Cognizant, etc.) their entire career
- People whose primary expertise is computer vision or speech without significant NLP/IR exposure

On location, comp, and logistics:
Location: Pune/Noida-preferred but flexible. Candidates in Hyderabad, Pune, Mumbai, Delhi NCR welcome to apply.
Notice period: We'd love sub-30-day notice. We can buy out up to 30 days.

The ideal candidate we're imagining:
6-8 years total experience, of which 4-5 are in applied ML/AI roles at product companies (not pure services).
Has shipped at least one end-to-end ranking, search, or recommendation system to real users at meaningful scale.
Has strong opinions about retrieval (hybrid vs dense), evaluation (offline vs online), and LLM integration.
Located in or willing to relocate to Noida or Pune.
Active on Redrob platform.`

const LOADING_MESSAGES = [
  "Reading job requirements...",
  "Streaming 100,000 profiles...",
  "Scoring career trajectories...",
  "Evaluating 23 behavioral signals...",
  "Detecting anomalous profiles...",
  "Ranking by genuine fit...",
  "Building your shortlist...",
]

const STAT_PILLS = [
  { value: '100,000', label: 'Candidates' },
  { value: '23', label: 'Behavioral Signals' },
  { value: 'Sub-5 Min', label: 'Analysis' },
]

export default function Landing() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const navigate = useNavigate()
  const { setRankingData } = useApp()
  const [jobDesc, setJobDesc] = useState(JOB_DESCRIPTION)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processed, setProcessed] = useState(0)
  const [statusIndex, setStatusIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)
  const intervalRef = useRef(null)
  const progressRef = useRef(null)

  useEffect(() => {
    if (!loading) return

    // Status messages cycling
    intervalRef.current = setInterval(() => {
      setStatusIndex(i => (i + 1) % LOADING_MESSAGES.length)
    }, 1500)

    // Progress simulation
    let prog = 0
    let proc = 0
    const startTime = Date.now()
    const TOTAL = 100000
    const DURATION_MS = 4000

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      prog = Math.min(elapsed / DURATION_MS, 0.95)
      proc = Math.round(prog * TOTAL)
      setProgress(prog * 100)
      setProcessed(proc)
      const remaining = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000))
      setTimeLeft(remaining)
    }, 100)

    return () => {
      clearInterval(intervalRef.current)
      clearInterval(progressRef.current)
    }
  }, [loading])

  const handleAnalyze = async () => {
    setLoading(true)
    setProgress(0)
    setProcessed(0)
    setStatusIndex(0)

    try {
      const res = await fetch(`${API_URL}/api/rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jobDesc, top_n: 100 }),
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      clearInterval(intervalRef.current)
      clearInterval(progressRef.current)
      setProgress(100)
      setRankingData(data)
      setTimeout(() => navigate('/results'), 400)
    } catch (err) {
      console.error('Ranking failed:', err)
      clearInterval(intervalRef.current)
      clearInterval(progressRef.current)
      setLoading(false)
      setProgress(0)
      alert(`Error: ${err.message}\n\nMake sure the backend is running on port 8000.`)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      maxWidth: 720,
      margin: '0 auto',
    }}>
      {/* Top label */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          color: '#F59E0B',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 24,
        }}
      >
        REDROB INDIA RUNS HACKATHON
      </motion.p>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 mb-6"
      >
        <Zap size={32} style={{ color: '#F59E0B' }} />
        <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' }}>
          <span style={{ color: '#F59E0B' }}>Signal</span>
          <span style={{ color: '#F5F5F5' }}>Hire</span>
        </span>
      </motion.div>

      {/* Main heading */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          fontSize: 54,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          textAlign: 'center',
          lineHeight: 1.1,
          marginBottom: 20,
          color: '#F5F5F5',
        }}
      >
        Hire by signal,<br />not by keyword.
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          color: '#A3A3A3',
          fontSize: 17,
          textAlign: 'center',
          maxWidth: 540,
          lineHeight: 1.6,
          marginBottom: 28,
        }}
      >
        AI that reads 100,000 candidate profiles the way a great recruiter would — understanding career trajectories, behavioral signals, and genuine fit.
      </motion.p>

      {/* Stat pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center gap-2 flex-wrap justify-center mb-8"
      >
        {STAT_PILLS.map((pill, i) => (
          <React.Fragment key={pill.label}>
            <div style={{
              border: '1px solid #2A2A2A',
              background: '#141414',
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: 12,
              color: '#A3A3A3',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ color: '#F5F5F5', fontWeight: 600 }}>{pill.value}</span> {pill.label}
            </div>
            {i < STAT_PILLS.length - 1 && (
              <span style={{ color: '#2A2A2A', fontSize: 18 }}>|</span>
            )}
          </React.Fragment>
        ))}
      </motion.div>

      {/* Job description textarea */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        style={{ width: '100%', marginBottom: 16 }}
      >
        <label className="label-caps block mb-2">Job Description</label>
        <textarea
          className="input-field"
          style={{
            width: '100%',
            height: 280,
            padding: '16px',
            fontSize: 12,
            lineHeight: 1.6,
            resize: 'vertical',
            fontFamily: 'Inter, sans-serif',
          }}
          value={jobDesc}
          onChange={e => setJobDesc(e.target.value)}
          disabled={loading}
          placeholder="Paste job description here..."
        />
      </motion.div>

      {/* Analyze button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          width: '100%',
          height: 52,
          background: loading ? '#2A2A2A' : '#F59E0B',
          color: loading ? '#525252' : '#0C0C0C',
          fontSize: 16,
          fontWeight: 700,
          borderRadius: 10,
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background 200ms, transform 200ms',
          marginBottom: 20,
        }}
        onMouseEnter={e => !loading && (e.currentTarget.style.background = '#FBBF24')}
        onMouseLeave={e => !loading && (e.currentTarget.style.background = '#F59E0B')}
      >
        {loading
          ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
          : <>Analyze 100,000 Candidates <ChevronRight size={18} /></>
        }
      </motion.button>

      {/* Loading state */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ width: '100%' }}
        >
          {/* Progress bar */}
          <div style={{ background: '#2A2A2A', borderRadius: 4, height: 6, marginBottom: 12, overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: '#F59E0B', borderRadius: 4 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Status message */}
          <div className="flex items-center justify-between">
            <motion.p
              key={statusIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ color: '#A3A3A3', fontSize: 12, margin: 0 }}
            >
              {LOADING_MESSAGES[statusIndex]}
            </motion.p>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#F59E0B' }}>
              {Math.round(progress)}%
            </span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span style={{ color: '#525252', fontSize: 11 }}>
              Processed: {processed.toLocaleString()} / 100,000
            </span>
            {timeLeft !== null && timeLeft > 0 && (
              <span style={{ color: '#525252', fontSize: 11 }}>
                ~{timeLeft}s remaining
              </span>
            )}
          </div>
        </motion.div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
