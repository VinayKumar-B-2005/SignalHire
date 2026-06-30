import React from 'react'

export default function ScoreBreakdownBar({ label, value = 0, maxWidth = '100%' }) {
  const pct = Math.round((value || 0) * 100)
  return (
    <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
      <span style={{
        fontSize: '10px',
        fontWeight: 500,
        color: '#525252',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        width: 52,
        flexShrink: 0,
      }}>
        {label}
      </span>
      <div className="score-bar-track flex-1" style={{ minWidth: 40 }}>
        <div
          className="score-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span style={{
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#F59E0B',
        fontWeight: 600,
        width: 30,
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {(value || 0).toFixed(2)}
      </span>
    </div>
  )
}
