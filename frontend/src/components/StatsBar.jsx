import React, { useEffect, useState } from 'react'
import { Users, Clock, Trophy, AlertTriangle } from 'lucide-react'

function AnimatedNumber({ target, duration = 1500 }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    const step = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])

  return <span>{value.toLocaleString()}</span>
}

export default function StatsBar({ stats, previewMode }) {
  if (!stats) return null

  const metrics = [
    {
      icon: Users,
      label: 'Total Analyzed',
      value: stats.total_processed,
      animated: true,
      format: v => v.toLocaleString(),
    },
    {
      icon: Clock,
      label: 'Processing Time',
      value: stats.time_seconds,
      format: v => `${v}s`,
    },
    {
      icon: Trophy,
      label: 'Top Match Score',
      value: stats.top_score,
      format: v => v?.toFixed(4),
      valueColor: '#F59E0B',
    },
    {
      icon: AlertTriangle,
      label: 'Honeypots Removed',
      value: stats.honeypots_removed,
      format: v => v.toLocaleString(),
      valueColor: '#F59E0B',
    },
  ]

  return (
    <div
      style={{
        position: 'sticky',
        top: 56,
        zIndex: 15,
        background: '#0C0C0C',
        borderBottom: '1px solid #2A2A2A',
        padding: '12px 24px',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}
    >
      {metrics.map(({ icon: Icon, label, value, animated, format, valueColor }) => (
        <div
          key={label}
          style={{
            flex: 1,
            background: '#141414',
            border: '1px solid #2A2A2A',
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Icon size={16} style={{ color: '#525252', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
              {label}
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: valueColor || '#F5F5F5',
              fontFamily: 'monospace',
              letterSpacing: '-0.01em',
            }}>
              {animated
                ? <AnimatedNumber target={value || 0} />
                : format ? format(value || 0) : value}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
