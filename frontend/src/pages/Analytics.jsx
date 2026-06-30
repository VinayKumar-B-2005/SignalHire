import React, { useMemo } from 'react'
import { useApp } from '../App.jsx'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ScatterChart, Scatter, Cell
} from 'recharts'
import { Users, TrendingUp, MapPin, BarChart3 } from 'lucide-react'

const AMBER = '#F59E0B'
const BG_CARD = '#141414'
const BORDER = '#2A2A2A'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: '#A3A3A3', margin: '0 0 4px' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: '#F5F5F5', margin: 0, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

function ScatterTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: '#F5F5F5', fontWeight: 700, margin: '0 0 4px' }}>{d.name}</p>
      <p style={{ color: '#A3A3A3', margin: '0 0 2px' }}>{d.title}</p>
      <p style={{ color: '#F59E0B', margin: 0, fontFamily: 'monospace', fontWeight: 600 }}>Score: {d.score?.toFixed(4)}</p>
      <p style={{ color: '#525252', margin: 0 }}>YOE: {d.yoe}yr</p>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, color = '#F5F5F5' }) {
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px' }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color: '#525252' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: '-0.02em', fontFamily: 'monospace' }}>
        {value}
      </div>
    </div>
  )
}

function ChartCard({ title, children, style = {} }) {
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px', ...style }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, margin: '0 0 16px' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

export default function Analytics() {
  const { rankingData } = useApp()
  const candidates = rankingData?.candidates || []
  const stats = rankingData?.stats || {}

  // KPIs
  const avgScore = useMemo(() => {
    if (!candidates.length) return 0
    return candidates.reduce((a, c) => a + (c.score || 0), 0) / candidates.length
  }, [candidates])

  const medianExp = useMemo(() => {
    if (!candidates.length) return 0
    const sorted = [...candidates].sort((a, b) =>
      (a.profile?.years_of_experience || 0) - (b.profile?.years_of_experience || 0)
    )
    const mid = Math.floor(sorted.length / 2)
    return sorted[mid]?.profile?.years_of_experience || 0
  }, [candidates])

  const topLocation = useMemo(() => {
    const counts = {}
    candidates.forEach(c => {
      const loc = c.profile?.location || 'Unknown'
      counts[loc] = (counts[loc] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0] || '—'
  }, [candidates])

  // Score distribution (10 buckets)
  const scoreDistribution = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${(i / 10).toFixed(1)}–${((i + 1) / 10).toFixed(1)}`,
      count: 0,
    }))
    candidates.forEach(c => {
      const idx = Math.min(Math.floor((c.score || 0) * 10), 9)
      buckets[idx].count++
    })
    return buckets
  }, [candidates])

  // Experience distribution
  const expDistribution = useMemo(() => {
    const ranges = [
      { label: '0–2', min: 0, max: 2 }, { label: '2–4', min: 2, max: 4 },
      { label: '4–6', min: 4, max: 6 }, { label: '6–8', min: 6, max: 8 },
      { label: '8–10', min: 8, max: 10 }, { label: '10–12', min: 10, max: 12 },
      { label: '12+', min: 12, max: 999 },
    ]
    return ranges.map(r => ({
      label: r.label,
      count: candidates.filter(c => {
        const yoe = c.profile?.years_of_experience || 0
        return yoe >= r.min && yoe < r.max
      }).length,
    }))
  }, [candidates])

  // Top skills
  const topSkills = useMemo(() => {
    const counts = {}
    candidates.forEach(c => {
      (c.matched_skills || []).forEach(sk => {
        const key = sk.toLowerCase()
        counts[key] = (counts[key] || 0) + 1
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }))
  }, [candidates])

  // Location distribution
  const locationData = useMemo(() => {
    const counts = {}
    candidates.forEach(c => {
      const loc = c.profile?.location || 'Unknown'
      counts[loc] = (counts[loc] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([location, count]) => ({ location, count }))
  }, [candidates])

  // Scatter data
  const scatterData = useMemo(() => candidates.map(c => ({
    yoe: c.profile?.years_of_experience || 0,
    score: c.score || 0,
    name: c.profile?.anonymized_name,
    title: c.profile?.current_title,
    rank: c.rank,
  })), [candidates])

  return (
    <div style={{ marginTop: 56, padding: '28px 32px', maxWidth: 1200, marginLeft: 'auto', marginRight: 'auto' }}>
      <div className="flex items-center gap-2 mb-8">
        <BarChart3 size={22} style={{ color: '#F59E0B' }} />
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Analytics</h1>
      </div>

      {/* Row 1: KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard icon={Users} label="Total Candidates" value={candidates.length.toLocaleString()} color={AMBER} />
        <KPICard icon={TrendingUp} label="Average Score" value={avgScore.toFixed(4)} color={AMBER} />
        <KPICard icon={BarChart3} label="Median Experience" value={`${medianExp}yr`} color="#F5F5F5" />
        <KPICard icon={MapPin} label="Top Location" value={topLocation} color="#F5F5F5" />
      </div>

      {/* Row 2: Score + Experience distribution */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <ChartCard title="Score Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreDistribution} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
              <XAxis dataKey="range" tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Candidates" fill={AMBER} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Experience Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={expDistribution} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Candidates" fill="#3B82F6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Top skills + Location */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <ChartCard title="Top 15 Skills Matched">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topSkills} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="skill" type="category" tick={{ fill: '#A3A3A3', fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Count" fill={AMBER} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Candidates by Location">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={locationData} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="location" type="category" tick={{ fill: '#A3A3A3', fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Count" fill="#22C55E" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 4: Score vs Experience scatter */}
      <ChartCard title="Score vs Experience (Top 100 Candidates)">
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis
              dataKey="yoe"
              name="Years of Experience"
              tick={{ fill: '#525252', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Years of Experience', position: 'insideBottom', offset: -8, fill: '#525252', fontSize: 11 }}
            />
            <YAxis
              dataKey="score"
              name="Score"
              tick={{ fill: '#525252', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 1]}
              label={{ value: 'Final Score', angle: -90, position: 'insideLeft', fill: '#525252', fontSize: 11 }}
            />
            <Tooltip content={<ScatterTooltip />} />
            <Scatter data={scatterData} fill={AMBER} opacity={0.8}>
              {scatterData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.rank === 1 ? '#F59E0B' : d.rank <= 10 ? '#FBBF24' : AMBER}
                  opacity={d.rank <= 10 ? 1 : 0.6}
                  r={d.rank <= 10 ? 6 : 4}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
