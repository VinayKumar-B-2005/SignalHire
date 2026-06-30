import React, { useEffect, useRef } from 'react'

export default function ScoreRing({ score = 0, size = 80, strokeWidth = 6, animate = true }) {
  const radius = (size - strokeWidth * 2) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score * circumference)
  const circleRef = useRef(null)

  useEffect(() => {
    if (!animate || !circleRef.current) return
    // Animate from 0 to offset
    circleRef.current.style.strokeDashoffset = circumference
    const raf = requestAnimationFrame(() => {
      circleRef.current.style.transition = 'stroke-dashoffset 1000ms cubic-bezier(0.4,0,0.2,1)'
      circleRef.current.style.strokeDashoffset = offset
    })
    return () => cancelAnimationFrame(raf)
  }, [score, circumference, offset, animate])

  const pct = Math.round(score * 100)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2A2A2A"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={animate ? circumference : offset}
          strokeLinecap="round"
        />
      </svg>
      {/* Score label */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{
          fontFamily: 'monospace',
          fontSize: size > 60 ? '18px' : '13px',
          fontWeight: 700,
          color: '#F59E0B',
          lineHeight: 1,
        }}>
          {score.toFixed(2)}
        </span>
        {size > 60 && (
          <span style={{ fontSize: '9px', color: '#525252', marginTop: 2, fontWeight: 500, letterSpacing: '0.04em' }}>
            SCORE
          </span>
        )}
      </div>
    </div>
  )
}
