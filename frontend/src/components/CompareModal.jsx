import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#F59E0B', '#3B82F6', '#22C55E']

function daysSince(dateStr) {
  try {
    const ref = new Date('2026-06-25')
    const d = new Date(dateStr)
    return Math.floor((ref - d) / 86400000)
  } catch { return 9999 }
}

export default function CompareModal({ candidates, onClose }) {
  if (!candidates || candidates.length === 0) return null

  // Build radar data
  const axes = ['Skills', 'Career', 'Experience', 'Location', 'Education', 'Behavioral']
  const radarData = axes.map(axis => {
    const row = { axis }
    candidates.forEach((c, i) => {
      const bd = c.score_breakdown || {}
      const keyMap = {
        Skills: 'skill_score',
        Career: 'career_score',
        Experience: 'experience_score',
        Location: 'location_score',
        Education: 'education_score',
        Behavioral: 'behavioral_multiplier',
      }
      const key = keyMap[axis]
      let val = bd[key] || 0
      if (axis === 'Behavioral') val = Math.min(val / 1.25, 1)
      row[`cand${i}`] = val
    })
    return row
  })

  // Comparison rows
  const compRows = [
    { label: 'Final Score', get: c => c.score?.toFixed(4) ?? '—', win: Math.max(...candidates.map(c => c.score || 0)) },
    { label: 'Skill Score', get: c => (c.score_breakdown?.skill_score || 0).toFixed(3), win: Math.max(...candidates.map(c => c.score_breakdown?.skill_score || 0)) },
    { label: 'Career Score', get: c => (c.score_breakdown?.career_score || 0).toFixed(3), win: Math.max(...candidates.map(c => c.score_breakdown?.career_score || 0)) },
    { label: 'Experience', get: c => `${c.profile?.years_of_experience || 0}yr`, win: null },
    { label: 'Location', get: c => c.profile?.location || '—', win: null },
    { label: 'Notice Period', get: c => `${c.redrob_signals?.notice_period_days || 0}d`, win: null },
    { label: 'Salary Max', get: c => `${c.redrob_signals?.expected_salary_range_inr_lpa?.max || 0} LPA`, win: null },
    { label: 'Last Active', get: c => `${daysSince(c.redrob_signals?.last_active_date)}d ago`, win: Math.min(...candidates.map(c => daysSince(c.redrob_signals?.last_active_date))) },
    { label: 'GitHub Score', get: c => c.redrob_signals?.github_activity_score === -1 ? 'N/A' : String(c.redrob_signals?.github_activity_score ?? '—'), win: Math.max(...candidates.map(c => c.redrob_signals?.github_activity_score === -1 ? -99 : c.redrob_signals?.github_activity_score || 0)) },
    { label: 'Response Rate', get: c => `${Math.round((c.redrob_signals?.recruiter_response_rate || 0) * 100)}%`, win: Math.max(...candidates.map(c => c.redrob_signals?.recruiter_response_rate || 0)) },
  ]

  return (
    <AnimatePresence>
      <motion.div
        className="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ zIndex: 60 }}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.3 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          inset: '48px 24px 24px',
          background: '#0C0C0C',
          border: '1px solid #2A2A2A',
          borderRadius: 16,
          zIndex: 61,
          overflowY: 'auto',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', margin: 0 }}>
            Compare Candidates
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252' }}>
            <X size={20} />
          </button>
        </div>

        {/* Candidate headers */}
        <div className="grid mb-4" style={{ gridTemplateColumns: `180px repeat(${candidates.length}, 1fr)`, gap: 8 }}>
          <div />
          {candidates.map((c, i) => (
            <div key={c.candidate_id} style={{
              background: '#141414',
              border: `1px solid ${COLORS[i]}40`,
              borderRadius: 10,
              padding: '12px 14px',
            }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontWeight: 700, fontSize: 11, color: COLORS[i], background: `${COLORS[i]}20`, padding: '1px 6px', borderRadius: 4 }}>
                  #{c.rank}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: COLORS[i], fontWeight: 700 }}>
                  {(c.score || 0).toFixed(4)}
                </span>
              </div>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#F5F5F5', margin: 0 }}>{c.profile?.anonymized_name}</p>
              <p style={{ color: '#A3A3A3', fontSize: 11, margin: '2px 0 0' }}>{c.profile?.current_title}</p>
            </div>
          ))}
        </div>

        {/* Shared Radar Chart */}
        <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <p className="label-caps mb-2">Score Radar Comparison</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2A2A2A" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: '#A3A3A3', fontSize: 11 }} />
              {candidates.map((c, i) => (
                <Radar
                  key={c.candidate_id}
                  dataKey={`cand${i}`}
                  name={c.profile?.anonymized_name}
                  stroke={COLORS[i]}
                  fill={COLORS[i]}
                  fillOpacity={0.1}
                  dot={{ fill: COLORS[i], r: 3 }}
                />
              ))}
              <Tooltip
                contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8 }}
                formatter={(v, name) => [(v * 100).toFixed(1) + '%', name]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Table */}
        <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 12, overflow: 'hidden' }}>
          {compRows.map((row, ri) => (
            <div
              key={row.label}
              className="grid"
              style={{
                gridTemplateColumns: `180px repeat(${candidates.length}, 1fr)`,
                borderBottom: ri < compRows.length - 1 ? '1px solid #2A2A2A' : 'none',
              }}
            >
              <div style={{
                padding: '10px 14px',
                borderRight: '1px solid #2A2A2A',
                fontSize: 11,
                fontWeight: 600,
                color: '#525252',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
              }}>
                {row.label}
              </div>
              {candidates.map((c, i) => {
                const val = row.get(c)
                const numVal = parseFloat(val)
                const isWinner = row.win !== null && !isNaN(numVal) && Math.abs(numVal - row.win) < 0.001
                return (
                  <div
                    key={c.candidate_id}
                    style={{
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: isWinner ? 700 : 400,
                      color: isWinner ? '#22C55E' : '#F5F5F5',
                      background: isWinner ? 'rgba(34,197,94,0.08)' : 'transparent',
                      borderRight: i < candidates.length - 1 ? '1px solid #2A2A2A' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {val}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
