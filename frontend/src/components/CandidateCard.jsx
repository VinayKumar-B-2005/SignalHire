import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Clock, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, CheckSquare, Square, AlertTriangle } from 'lucide-react'
import ScoreBreakdownBar from './ScoreBreakdownBar.jsx'

const CONSULTING_FIRMS = [
  'tcs', 'infosys', 'wipro', 'accenture', 'cognizant', 'capgemini',
  'hcl', 'tech mahindra', 'mindtree', 'mphasis', 'hexaware',
  'ibm consulting', 'deloitte', 'kpmg', 'ey', 'pwc'
]

function isConsulting(company) {
  const cl = (company || '').toLowerCase()
  return CONSULTING_FIRMS.some(f => cl.includes(f))
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
    <span style={{
      ...style,
      fontWeight: 700,
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 4,
      letterSpacing: '-0.01em',
      flexShrink: 0,
    }}>
      #{rank}
    </span>
  )
}

export default function CandidateCard({ candidate, index, onViewProfile, onBookmark, isBookmarked, onCompareToggle, isComparing }) {
  const [reasoningExpanded, setReasoningExpanded] = useState(false)

  const { profile = {}, redrob_signals: sig = {}, career_history = [] } = candidate
  const score = candidate.score || 0
  const rank = candidate.rank || 0
  const matchedSkills = candidate.matched_skills || []
  const reasoning = candidate.reasoning || ''
  const breakdown = candidate.score_breakdown || {}

  const daysAgo = daysSince(sig.last_active_date)
  const activityColor = daysAgo < 7 ? '#22C55E' : daysAgo < 30 ? '#F59E0B' : '#EF4444'

  // Red flags
  const flags = []
  const currentIsConsulting = isConsulting(profile.current_company)
  const hasNonConsulting = career_history.some(r => !r.is_current && !isConsulting(r.company))
  if (currentIsConsulting && !hasNonConsulting) flags.push('Consulting-only')
  if ((sig.notice_period_days || 0) > 90) flags.push(`Notice ${sig.notice_period_days}d`)
  if ((sig.recruiter_response_rate || 0) < 0.2) flags.push('Low response')
  if ((profile.country || '').toLowerCase() !== 'india' && !sig.willing_to_relocate) flags.push('Outside India')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 2.0) }}
      className="card p-4 cursor-pointer"
      style={{ marginBottom: 12 }}
      onClick={() => onViewProfile(candidate)}
    >
      {/* Row 1: Rank + Name + Score */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <RankBadge rank={rank} />
          <span style={{ fontWeight: 700, fontSize: 15, color: '#F5F5F5', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.anonymized_name}
          </span>
        </div>
        <span className="score-badge" style={{ flexShrink: 0, marginLeft: 8 }}>
          {score.toFixed(4)}
        </span>
      </div>

      {/* Row 2: Title · Company · Location */}
      <div className="flex items-center gap-1 mb-2" style={{ color: '#A3A3A3', fontSize: 12 }}>
        <span style={{ fontWeight: 500 }}>{profile.current_title}</span>
        <span style={{ color: '#525252' }}>·</span>
        <span>{profile.current_company}</span>
        <span style={{ color: '#525252' }}>·</span>
        <MapPin size={10} style={{ color: '#525252', flexShrink: 0 }} />
        <span>{profile.location}</span>
      </div>

      {/* Row 3: YOE */}
      <div className="mb-2">
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#A3A3A3',
          background: '#2A2A2A',
          padding: '2px 8px',
          borderRadius: 4,
        }}>
          {profile.years_of_experience}yr exp
        </span>
      </div>

      {/* Skills row */}
      {matchedSkills.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-3" onClick={e => e.stopPropagation()}>
          {matchedSkills.slice(0, 3).map(skill => (
            <span key={skill} className="skill-pill">{skill}</span>
          ))}
          {matchedSkills.length > 3 && (
            <span style={{ fontSize: 11, color: '#525252', marginLeft: 2 }}>+{matchedSkills.length - 3} more</span>
          )}
        </div>
      )}

      {/* Score breakdown mini bars */}
      <div className="flex flex-col gap-1 mb-3" onClick={e => e.stopPropagation()}>
        {[
          { label: 'Skills', key: 'skill_score' },
          { label: 'Career', key: 'career_score' },
          { label: 'Exp', key: 'experience_score' },
          { label: 'Loc', key: 'location_score' },
        ].map(({ label, key }) => (
          <ScoreBreakdownBar key={key} label={label} value={breakdown[key] || 0} />
        ))}
      </div>

      {/* Activity row */}
      <div className="flex items-center gap-3 mb-2" style={{ fontSize: 11, color: '#525252' }}>
        <div className="flex items-center gap-1">
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: activityColor, flexShrink: 0 }} />
          <span>Active {daysAgo}d ago</span>
        </div>
        <span>·</span>
        <span>Notice {sig.notice_period_days || 0}d</span>
        <span>·</span>
        <span style={{ textTransform: 'capitalize' }}>{sig.preferred_work_mode || '—'}</span>
      </div>

      {/* Red flags */}
      {flags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-2" onClick={e => e.stopPropagation()}>
          {flags.map(f => (
            <span key={f} className="flag-badge">
              <AlertTriangle size={9} />
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Reasoning */}
      <div
        className="mb-3"
        style={{ borderLeft: '2px solid #2A2A2A', paddingLeft: 10 }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{
          fontSize: 12,
          color: '#A3A3A3',
          lineHeight: 1.5,
          margin: 0,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: reasoningExpanded ? 'unset' : 1,
          WebkitBoxOrient: 'vertical',
        }}>
          {reasoning}
        </p>
        {reasoning && reasoning.length > 80 && (
          <button
            onClick={e => { e.stopPropagation(); setReasoningExpanded(v => !v) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252', fontSize: 11, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}
          >
            {reasoningExpanded ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> Show more</>}
          </button>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onBookmark(candidate)}
          style={{
            background: 'none',
            border: `1px solid ${isBookmarked ? '#F59E0B' : '#2A2A2A'}`,
            color: isBookmarked ? '#F59E0B' : '#525252',
            borderRadius: 6,
            cursor: 'pointer',
            padding: '5px 8px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 200ms',
          }}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        </button>

        <button
          onClick={() => onCompareToggle(candidate)}
          style={{
            background: 'none',
            border: `1px solid ${isComparing ? '#3B82F6' : '#2A2A2A'}`,
            color: isComparing ? '#3B82F6' : '#525252',
            borderRadius: 6,
            cursor: 'pointer',
            padding: '5px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 500,
            transition: 'all 200ms',
          }}
        >
          {isComparing ? <CheckSquare size={13} /> : <Square size={13} />}
          Compare
        </button>

        <button
          onClick={() => onViewProfile(candidate)}
          style={{
            marginLeft: 'auto',
            background: '#F59E0B',
            color: '#0C0C0C',
            fontWeight: 700,
            fontSize: 12,
            padding: '5px 14px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            transition: 'background 200ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FBBF24'}
          onMouseLeave={e => e.currentTarget.style.background = '#F59E0B'}
        >
          View Profile →
        </button>
      </div>
    </motion.div>
  )
}
