import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, MapPin, Clock, Briefcase, DollarSign, Github, Mail, Phone,
  Linkedin, ThumbsUp, Eye, Users, Star, CheckCircle, XCircle,
  AlertTriangle, TrendingUp, BookOpen, Calendar, Zap
} from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import ScoreRing from './ScoreRing.jsx'
import ScoreBreakdownBar from './ScoreBreakdownBar.jsx'

const MUST_HAVE_SKILLS = [
  'python', 'embeddings', 'vector database', 'retrieval', 'semantic search',
  'ranking', 'nlp', 'elasticsearch', 'faiss', 'pinecone', 'weaviate', 'qdrant',
  'milvus', 'opensearch', 'sentence transformers', 'bert', 'transformer',
  'fine-tuning', 'llm', 'rag', 'ndcg', 'mrr', 'map', 'evaluation framework',
  'hybrid search', 'bm25', 'dense retrieval', 'reranking', 'information retrieval'
]

const NICE_TO_HAVE_SKILLS = [
  'lora', 'qlora', 'peft', 'xgboost', 'learning to rank', 'a/b testing',
  'distributed systems', 'huggingface', 'langchain', 'openai', 'pytorch',
  'tensorflow', 'triton', 'onnx', 'fastapi', 'docker', 'kubernetes'
]

const CONSULTING_FIRMS = [
  'tcs', 'infosys', 'wipro', 'accenture', 'cognizant', 'capgemini',
  'hcl', 'tech mahindra', 'mindtree', 'mphasis', 'hexaware',
  'ibm consulting', 'deloitte', 'kpmg', 'ey', 'pwc'
]

function isConsulting(company) {
  const cl = (company || '').toLowerCase()
  return CONSULTING_FIRMS.some(f => cl.includes(f))
}

function classifySkill(skillName) {
  const sl = skillName.toLowerCase()
  if (MUST_HAVE_SKILLS.some(m => sl.includes(m) || m.includes(sl))) return 'must'
  if (NICE_TO_HAVE_SKILLS.some(n => sl.includes(n) || n.includes(sl))) return 'nice'
  return 'other'
}

function ProfBadge({ proficiency }) {
  const classes = {
    expert: 'prof-expert',
    advanced: 'prof-advanced',
    intermediate: 'prof-intermediate',
    beginner: 'prof-beginner',
  }
  return (
    <span className={`${classes[proficiency] || 'prof-beginner'} text-xs px-2 py-0.5 rounded font-medium`}>
      {proficiency}
    </span>
  )
}

function TierBadge({ tier }) {
  const classes = {
    tier_1: 'tier-1',
    tier_2: 'tier-2',
    tier_3: 'tier-3',
    tier_4: 'tier-4',
  }
  return (
    <span className={`${classes[tier] || 'tier-3'} text-xs px-2 py-0.5 rounded font-medium`}>
      {(tier || 'unknown').replace('_', ' ').toUpperCase()}
    </span>
  )
}

function GaugeBar({ value, max = 1, color = '#F59E0B' }) {
  const pct = Math.round((Math.max(0, value) / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="score-bar-track flex-1">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#A3A3A3', minWidth: 32, textAlign: 'right' }}>
        {typeof value === 'number' && value >= 0
          ? max === 1 ? `${Math.round(value * 100)}%` : value
          : 'N/A'}
      </span>
    </div>
  )
}

function ActivityDot({ daysAgo }) {
  const color = daysAgo < 7 ? '#22C55E' : daysAgo < 30 ? '#F59E0B' : '#EF4444'
  return (
    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6, flexShrink: 0 }} />
  )
}

function daysSince(dateStr) {
  try {
    const ref = new Date('2026-06-25')
    const d = new Date(dateStr)
    return Math.floor((ref - d) / 86400000)
  } catch { return 9999 }
}

function RankBadge({ rank }) {
  const style = {
    1: { background: '#F59E0B', color: '#0C0C0C' },
    2: { background: '#A3A3A3', color: '#0C0C0C' },
    3: { background: '#CD7F32', color: '#0C0C0C' },
  }[rank] || { background: '#2A2A2A', color: '#A3A3A3' }

  return (
    <span style={{ ...style, fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 4, letterSpacing: '-0.01em' }}>
      #{rank}
    </span>
  )
}

const TABS = ['Overview', 'Skills', 'Career', 'Education', 'Signals']

export default function CandidateModal({ candidate, onClose }) {
  const [activeTab, setActiveTab] = useState('Overview')

  if (!candidate) return null

  const { profile = {}, career_history = [], education = [], skills = [], redrob_signals: sig = {} } = candidate
  const breakdown = candidate.score_breakdown || {}
  const score = candidate.score || 0
  const rank = candidate.rank || 0
  const matchedSkills = candidate.matched_skills || []
  const reasoning = candidate.reasoning || ''

  const daysAgo = daysSince(sig.last_active_date)

  // Red flags
  const flags = []
  const currentIsConsulting = isConsulting(profile.current_company)
  const hasNonConsulting = career_history.some(r => !r.is_current && !isConsulting(r.company))
  if (currentIsConsulting && !hasNonConsulting) flags.push({ label: 'Consulting-only background', detail: 'Entire career at IT services firms — may lack product experience.' })
  if ((sig.notice_period_days || 0) > 90) flags.push({ label: `Notice period ${sig.notice_period_days}d`, detail: 'Long notice period may delay hiring.' })
  if ((sig.recruiter_response_rate || 0) < 0.2) flags.push({ label: `Low response rate (${Math.round((sig.recruiter_response_rate || 0) * 100)}%)`, detail: 'May be unresponsive to recruiter outreach.' })
  if ((profile.country || '').toLowerCase() !== 'india' && !sig.willing_to_relocate) flags.push({ label: `Outside India (${profile.location})`, detail: 'Candidate not in preferred geo and not open to relocation.' })

  // Radar data
  const radarData = [
    { axis: 'Skills', value: breakdown.skill_score || 0 },
    { axis: 'Career', value: breakdown.career_score || 0 },
    { axis: 'Experience', value: breakdown.experience_score || 0 },
    { axis: 'Location', value: breakdown.location_score || 0 },
    { axis: 'Education', value: breakdown.education_score || 0 },
    { axis: 'Behavioral', value: Math.min((breakdown.behavioral_multiplier || 1) / 1.25, 1) },
  ]

  // Skill grouping
  const mustHaveSkills = skills.filter(s => classifySkill(s.name) === 'must')
  const niceToHaveSkills = skills.filter(s => classifySkill(s.name) === 'nice')
  const otherSkills = skills.filter(s => classifySkill(s.name) === 'other')

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        key="modal"
        initial={{ x: 680 }}
        animate={{ x: 0 }}
        exit={{ x: 680 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 680,
          height: '100vh',
          background: '#0C0C0C',
          borderLeft: '1px solid #2A2A2A',
          zIndex: 50,
          overflowY: 'auto',
          padding: '32px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2 mb-2">
              <RankBadge rank={rank} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F5F5F5', margin: 0, letterSpacing: '-0.02em' }}>
              {profile.anonymized_name}
            </h2>
            <p style={{ color: '#A3A3A3', fontSize: 13, margin: '4px 0 0' }}>
              {profile.current_title} · {profile.current_company}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={11} style={{ color: '#525252' }} />
              <span style={{ color: '#525252', fontSize: 12 }}>{profile.location}, {profile.country}</span>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <ScoreRing score={score} size={80} animate />
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252', padding: 4 }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { label: 'YOE', value: `${profile.years_of_experience}yr` },
            { label: 'Notice', value: `${sig.notice_period_days || 0}d` },
            { label: 'Mode', value: sig.preferred_work_mode || '—' },
            { label: 'Salary', value: sig.expected_salary_range_inr_lpa ? `${sig.expected_salary_range_inr_lpa.min}–${sig.expected_salary_range_inr_lpa.max} LPA` : '—' },
          ].map(item => (
            <div key={item.label} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5', marginTop: 2 }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6" style={{ borderBottom: '1px solid #2A2A2A' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 500,
                color: activeTab === tab ? '#F59E0B' : '#525252',
                borderBottom: activeTab === tab ? '2px solid #F59E0B' : '2px solid transparent',
                transition: 'color 200ms, border-color 200ms',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >

            {/* ── OVERVIEW ── */}
            {activeTab === 'Overview' && (
              <div>
                {/* Reasoning */}
                <div style={{ borderLeft: '3px solid #F59E0B', paddingLeft: 16, marginBottom: 20 }}>
                  <p style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>AI Reasoning</p>
                  <p style={{ color: '#A3A3A3', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{reasoning}</p>
                </div>

                {/* Radar chart */}
                <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <p className="label-caps mb-4">Score Breakdown</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#2A2A2A" />
                      <PolarAngleAxis dataKey="axis" tick={{ fill: '#A3A3A3', fontSize: 11 }} />
                      <Radar
                        dataKey="value"
                        stroke="#F59E0B"
                        fill="rgba(245,158,11,0.2)"
                        dot={{ fill: '#F59E0B', r: 3 }}
                      />
                      <Tooltip
                        formatter={(v) => [(v * 100).toFixed(1) + '%', 'Score']}
                        contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>

                  <div className="flex flex-col gap-2 mt-2">
                    {['skill_score','career_score','experience_score','location_score','education_score','availability_score'].map(key => (
                      <ScoreBreakdownBar
                        key={key}
                        label={key.replace('_score', '').replace('_', ' ').substring(0, 6)}
                        value={breakdown[key] || 0}
                      />
                    ))}
                    <div className="flex items-center gap-2 mt-1">
                      <span style={{ fontSize: 10, fontWeight: 500, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em', width: 52 }}>Behav.</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>
                        ×{(breakdown.behavioral_multiplier || 1).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Red Flags */}
                {flags.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p className="label-caps mb-3" style={{ color: '#EF4444' }}>⚠ Flags</p>
                    <div className="flex flex-col gap-2">
                      {flags.map((f, i) => (
                        <div key={i} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                          <p style={{ color: '#EF4444', fontWeight: 600, fontSize: 12, margin: 0 }}>{f.label}</p>
                          <p style={{ color: '#A3A3A3', fontSize: 12, margin: '4px 0 0' }}>{f.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── SKILLS ── */}
            {activeTab === 'Skills' && (
              <div className="flex flex-col gap-5">
                {[
                  { label: 'Must-Have Matches', list: mustHaveSkills, color: '#F59E0B' },
                  { label: 'Nice-to-Have Matches', list: niceToHaveSkills, color: '#3B82F6' },
                  { label: 'Other Skills', list: otherSkills, color: '#525252' },
                ].map(group => group.list.length > 0 && (
                  <div key={group.label}>
                    <p className="label-caps mb-3" style={{ color: group.color }}>{group.label} ({group.list.length})</p>
                    <div className="flex flex-col gap-2">
                      {group.list.map(skill => {
                        const assessmentScore = sig.skill_assessment_scores?.[skill.name]
                        return (
                          <div
                            key={skill.name}
                            style={{
                              background: '#141414',
                              border: '1px solid #2A2A2A',
                              borderRadius: 8,
                              padding: '10px 14px',
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span style={{ fontWeight: 600, fontSize: 13, color: '#F5F5F5' }}>{skill.name}</span>
                              <ProfBadge proficiency={skill.proficiency} />
                            </div>
                            <div className="flex items-center gap-3 text-xs" style={{ color: '#525252' }}>
                              <span className="flex items-center gap-1">
                                <ThumbsUp size={11} />
                                {skill.endorsements} endorsements
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {skill.duration_months}mo
                              </span>
                              {assessmentScore !== undefined && (
                                <span className="flex items-center gap-1" style={{ color: '#F59E0B' }}>
                                  <Star size={11} />
                                  Assessment: {assessmentScore.toFixed(0)}/100
                                </span>
                              )}
                            </div>
                            {/* Duration bar */}
                            <div className="mt-2">
                              <div className="score-bar-track">
                                <div
                                  className="score-bar-fill"
                                  style={{
                                    width: `${Math.min(skill.duration_months / 24, 1) * 100}%`,
                                    background: group.color,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── CAREER ── */}
            {activeTab === 'Career' && (
              <div style={{ position: 'relative' }}>
                {/* Timeline line */}
                <div style={{ position: 'absolute', left: 12, top: 20, bottom: 20, width: 1, background: '#2A2A2A' }} />

                <div className="flex flex-col gap-4 pl-8">
                  {career_history.map((role, i) => {
                    const roleIsConsulting = isConsulting(role.company)
                    // Check if this description already appeared in an earlier role
                    const desc = (role.description || '').trim()
                    const prevDescs = career_history.slice(0, i).map(r => (r.description || '').trim())
                    const isDuplicateDesc = desc && prevDescs.includes(desc)
                    return (
                      <div
                        key={`${role.company}-${i}`}
                        style={{
                          background: '#141414',
                          border: `1px solid ${roleIsConsulting ? '#2A2A2A' : 'rgba(59,130,246,0.2)'}`,
                          borderRadius: 10,
                          padding: '14px 16px',
                          position: 'relative',
                        }}
                      >
                        {/* Timeline dot */}
                        <div style={{
                          position: 'absolute',
                          left: -22,
                          top: 18,
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          background: role.is_current ? '#F59E0B' : '#2A2A2A',
                          border: `2px solid ${role.is_current ? '#F59E0B' : '#525252'}`,
                        }} />

                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <span style={{ fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>{role.company}</span>
                            {roleIsConsulting && (
                              <span style={{ marginLeft: 8, fontSize: 10, color: '#525252', background: '#2A2A2A', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>CONSULTING</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#525252', flexShrink: 0, marginLeft: 8 }}>
                            {role.company_size}
                          </div>
                        </div>
                        <p style={{ fontWeight: 600, fontSize: 13, color: '#F59E0B', margin: '2px 0 4px' }}>{role.title}</p>
                        <p style={{ fontSize: 11, color: '#525252', margin: '0 0 8px' }}>
                          {role.start_date} – {role.end_date || 'Present'} · {role.duration_months}mo
                          {' · '}{role.industry}
                        </p>
                        {isDuplicateDesc ? (
                          <p style={{ fontSize: 11, color: '#3A3A3A', fontStyle: 'italic', margin: 0 }}>
                            (description same as above role — template data)
                          </p>
                        ) : (
                          <p style={{ fontSize: 12, color: '#A3A3A3', lineHeight: 1.6, margin: 0 }}>{desc || 'No description available.'}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── EDUCATION ── */}
            {activeTab === 'Education' && (
              <div className="flex flex-col gap-3">
                {education.length === 0 && (
                  <p style={{ color: '#525252', fontSize: 13 }}>No education data available.</p>
                )}
                {education.map((edu, i) => (
                  <div key={i} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '14px 16px' }}>
                    <div className="flex items-start justify-between mb-2">
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>{edu.institution}</span>
                      <TierBadge tier={edu.tier} />
                    </div>
                    <p style={{ color: '#F59E0B', fontWeight: 600, fontSize: 13, margin: '0 0 4px' }}>{edu.degree}</p>
                    <p style={{ color: '#A3A3A3', fontSize: 12, margin: 0 }}>
                      {edu.field_of_study} · {edu.start_year}–{edu.end_year}
                      {edu.grade && ` · ${edu.grade}`}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* ── SIGNALS ── */}
            {activeTab === 'Signals' && (
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Profile completeness */}
                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px' }}>
                    <p className="label-caps mb-2">Profile Completeness</p>
                    <ScoreRing score={(sig.profile_completeness_score || 0) / 100} size={60} animate />
                  </div>

                  {/* Open to work */}
                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px' }}>
                    <p className="label-caps mb-2">Open to Work</p>
                    {sig.open_to_work_flag
                      ? <span style={{ color: '#22C55E', fontWeight: 700, fontSize: 20 }}>YES ✓</span>
                      : <span style={{ color: '#EF4444', fontWeight: 700, fontSize: 20 }}>NO ✗</span>}
                  </div>

                  {/* Last active */}
                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px' }}>
                    <p className="label-caps mb-2">Last Active</p>
                    <div className="flex items-center gap-1">
                      <ActivityDot daysAgo={daysAgo} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5' }}>{daysAgo}d ago</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#525252', margin: '4px 0 0' }}>{sig.last_active_date}</p>
                  </div>

                  {/* GitHub */}
                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px' }}>
                    <p className="label-caps mb-2">GitHub Score</p>
                    {(sig.github_activity_score || -1) === -1
                      ? <span style={{ color: '#525252', fontSize: 13 }}>Not linked</span>
                      : <div>
                        <GaugeBar value={sig.github_activity_score} max={100} />
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#F59E0B', fontWeight: 700 }}>{sig.github_activity_score}</span>
                      </div>
                    }
                  </div>

                  {/* Response rate */}
                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px', gridColumn: 'span 2' }}>
                    <p className="label-caps mb-2">Recruiter Response Rate</p>
                    <GaugeBar value={sig.recruiter_response_rate || 0} />
                    <p style={{ fontSize: 11, color: '#525252', margin: '4px 0 0' }}>Avg response time: {sig.avg_response_time_hours?.toFixed(1)}h</p>
                  </div>

                  {/* Interview completion */}
                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px', gridColumn: 'span 2' }}>
                    <p className="label-caps mb-2">Interview Completion Rate</p>
                    <GaugeBar value={sig.interview_completion_rate || 0} color="#3B82F6" />
                  </div>

                  {/* Offer acceptance */}
                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px', gridColumn: 'span 2' }}>
                    <p className="label-caps mb-2">Offer Acceptance Rate</p>
                    {(sig.offer_acceptance_rate || -1) === -1
                      ? <span style={{ color: '#525252', fontSize: 13 }}>No history</span>
                      : <GaugeBar value={sig.offer_acceptance_rate} color="#22C55E" />}
                  </div>

                  {/* Notice & Salary */}
                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px' }}>
                    <p className="label-caps mb-2">Notice Period</p>
                    <span style={{
                      fontWeight: 700, fontSize: 16, color: (sig.notice_period_days || 0) > 60 ? '#EF4444' : '#22C55E'
                    }}>{sig.notice_period_days || 0}d</span>
                  </div>

                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px' }}>
                    <p className="label-caps mb-2">Expected Salary</p>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>
                      {sig.expected_salary_range_inr_lpa?.min}–{sig.expected_salary_range_inr_lpa?.max} LPA
                    </span>
                  </div>

                  {/* Verification */}
                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px', gridColumn: 'span 2' }}>
                    <p className="label-caps mb-3">Verification & Social</p>
                    <div className="flex gap-4 flex-wrap">
                      {[
                        { icon: Mail, label: 'Email', val: sig.verified_email },
                        { icon: Phone, label: 'Phone', val: sig.verified_phone },
                        { icon: Linkedin, label: 'LinkedIn', val: sig.linkedin_connected },
                      ].map(({ icon: Icon, label, val }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <Icon size={13} style={{ color: val ? '#22C55E' : '#525252' }} />
                          <span style={{ fontSize: 12, color: val ? '#22C55E' : '#525252', fontWeight: 500 }}>{label}</span>
                          {val ? <CheckCircle size={11} style={{ color: '#22C55E' }} /> : <XCircle size={11} style={{ color: '#525252' }} />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Platform stats */}
                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px', gridColumn: 'span 2' }}>
                    <p className="label-caps mb-3">Platform Activity (30d)</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Profile Views', value: sig.profile_views_received_30d },
                        { label: 'Applications', value: sig.applications_submitted_30d },
                        { label: 'Saved by', value: sig.saved_by_recruiters_30d },
                        { label: 'Search Hits', value: sig.search_appearance_30d },
                        { label: 'Connections', value: sig.connection_count },
                        { label: 'Endorsements', value: sig.endorsements_received },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#F59E0B', fontFamily: 'monospace' }}>{value ?? '—'}</div>
                          <div style={{ fontSize: 10, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Work preference */}
                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px' }}>
                    <p className="label-caps mb-2">Work Mode</p>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#F5F5F5', textTransform: 'capitalize' }}>{sig.preferred_work_mode}</span>
                  </div>

                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px' }}>
                    <p className="label-caps mb-2">Willing to Relocate</p>
                    {sig.willing_to_relocate
                      ? <span style={{ color: '#22C55E', fontWeight: 700 }}>Yes</span>
                      : <span style={{ color: '#EF4444', fontWeight: 700 }}>No</span>}
                  </div>

                  {/* Signup date */}
                  <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px', gridColumn: 'span 2' }}>
                    <p className="label-caps mb-2">Member Since</p>
                    <span style={{ color: '#A3A3A3', fontSize: 13 }}>
                      {sig.signup_date ? new Date(sig.signup_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                    </span>
                  </div>

                  {/* Assessment scores */}
                  {sig.skill_assessment_scores && Object.keys(sig.skill_assessment_scores).length > 0 && (
                    <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 10, padding: '12px 14px', gridColumn: 'span 2' }}>
                      <p className="label-caps mb-3">Skill Assessments</p>
                      <div className="flex flex-col gap-2">
                        {Object.entries(sig.skill_assessment_scores).map(([skill, score]) => (
                          <div key={skill} className="flex items-center gap-2">
                            <span style={{ fontSize: 12, color: '#A3A3A3', width: 140, flexShrink: 0 }}>{skill}</span>
                            <GaugeBar value={score} max={100} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
