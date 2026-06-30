import React from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'

const LOCATIONS = ['All India', 'Pune', 'Noida', 'Hyderabad', 'Mumbai', 'Bangalore', 'Delhi NCR', 'Outside India']
const WORK_MODES = ['Any', 'Remote', 'Hybrid', 'Onsite', 'Flexible']
const NOTICE_OPTIONS = ['Any', 'Under 30 days', 'Under 60 days', 'Under 90 days']

export default function FilterSidebar({ filters, onChange, total, shown, onExport, onValidate }) {
  const updateFilter = (key, value) => onChange({ ...filters, [key]: value })

  const toggleLocation = (loc) => {
    const current = filters.locations || []
    if (current.includes(loc)) {
      onChange({ ...filters, locations: current.filter(l => l !== loc) })
    } else {
      onChange({ ...filters, locations: [...current, loc] })
    }
  }

  const clearAll = () => onChange({
    search: '',
    minScore: 0,
    expMin: 0,
    expMax: 20,
    locations: [],
    workMode: 'Any',
    openToWorkOnly: false,
    noticePeriod: 'Any',
  })

  return (
    <div style={{
      position: 'fixed',
      top: 56,
      left: 0,
      width: 260,
      height: 'calc(100vh - 56px)',
      background: '#0C0C0C',
      borderRight: '1px solid #2A2A2A',
      padding: '20px 16px',
      overflowY: 'auto',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>Filters</span>
        <button
          onClick={clearAll}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F59E0B', fontSize: 12, fontWeight: 500 }}
        >
          Clear all
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#525252' }} />
        <input
          className="input-field"
          style={{ width: '100%', padding: '8px 10px 8px 30px', fontSize: 12 }}
          placeholder="Search by name, title, company..."
          value={filters.search || ''}
          onChange={e => updateFilter('search', e.target.value)}
        />
      </div>

      <div className="divider" />

      {/* Min Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="label-caps">Min Score</span>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>
            {(filters.minScore || 0).toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0} max={1} step={0.01}
          value={filters.minScore || 0}
          onChange={e => updateFilter('minScore', parseFloat(e.target.value))}
        />
      </div>

      {/* Experience Range */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="label-caps">Experience (yrs)</span>
          <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>
            {filters.expMin || 0}–{filters.expMax || 20}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="range"
            min={0} max={20} step={1}
            value={filters.expMin || 0}
            onChange={e => updateFilter('expMin', parseInt(e.target.value))}
          />
          <input
            type="range"
            min={0} max={20} step={1}
            value={filters.expMax || 20}
            onChange={e => updateFilter('expMax', parseInt(e.target.value))}
          />
        </div>
      </div>

      {/* Location */}
      <div className="mb-4">
        <span className="label-caps block mb-2">Location</span>
        <div className="flex flex-col gap-1">
          {LOCATIONS.map(loc => (
            <label key={loc} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12 }}>
              <input
                type="checkbox"
                checked={(filters.locations || []).includes(loc)}
                onChange={() => toggleLocation(loc)}
                style={{ accentColor: '#F59E0B' }}
              />
              <span style={{ color: (filters.locations || []).includes(loc) ? '#F5F5F5' : '#A3A3A3' }}>{loc}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* Work Mode */}
      <div className="mb-4">
        <span className="label-caps block mb-2">Work Mode</span>
        <div className="flex flex-col gap-1">
          {WORK_MODES.map(mode => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12 }}>
              <input
                type="radio"
                name="workMode"
                value={mode}
                checked={(filters.workMode || 'Any') === mode}
                onChange={() => updateFilter('workMode', mode)}
                style={{ accentColor: '#F59E0B' }}
              />
              <span style={{ color: (filters.workMode || 'Any') === mode ? '#F5F5F5' : '#A3A3A3' }}>{mode}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Open to work toggle */}
      <div className="flex items-center justify-between mb-4">
        <span className="label-caps">Open to work only</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={filters.openToWorkOnly || false}
            onChange={e => updateFilter('openToWorkOnly', e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      {/* Notice Period */}
      <div className="mb-4">
        <span className="label-caps block mb-2">Notice Period</span>
        <select
          className="input-field"
          style={{ width: '100%', padding: '7px 10px', fontSize: 12, cursor: 'pointer' }}
          value={filters.noticePeriod || 'Any'}
          onChange={e => updateFilter('noticePeriod', e.target.value)}
        >
          {NOTICE_OPTIONS.map(o => <option key={o} value={o} style={{ background: '#141414' }}>{o}</option>)}
        </select>
      </div>

      <div className="divider" />

      {/* Showing count */}
      <p style={{ color: '#525252', fontSize: 11, marginBottom: 12 }}>
        Showing {shown} of {total} candidates
      </p>

      {/* Export */}
      <button
        onClick={onExport}
        className="btn-primary w-full mb-2 flex items-center justify-center gap-2"
        style={{ padding: '10px', fontSize: 13 }}
      >
        Export CSV
      </button>

      {/* Validate */}
      <button
        onClick={onValidate}
        className="btn-secondary w-full flex items-center justify-center gap-2"
        style={{ padding: '10px', fontSize: 13 }}
      >
        Validate Submission
      </button>
    </div>
  )
}
