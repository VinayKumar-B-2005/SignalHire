import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Zap, Download, LayoutDashboard, BarChart3, Bookmark } from 'lucide-react'
import { useApp } from '../App.jsx'

export default function Navbar() {
  const { rankingData } = useApp()
  const navigate = useNavigate()

  const handleExport = async () => {
    try {
      const candidates = rankingData?.candidates || []
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'submission.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export error:', e)
    }
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-30 flex items-center px-6"
      style={{
        height: '56px',
        background: '#0C0C0C',
        borderBottom: '1px solid #2A2A2A',
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate('/results')}
        className="flex items-center gap-2 flex-shrink-0 mr-8"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <Zap size={18} style={{ color: '#F59E0B' }} />
        <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}>
          <span style={{ color: '#F59E0B' }}>Signal</span>
          <span style={{ color: '#F5F5F5' }}>Hire</span>
        </span>
      </button>

      {/* Nav Links */}
      <div className="flex items-center gap-1 flex-1">
        <NavLink
          to="/results"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
            }`
          }
          style={({ isActive }) =>
            isActive
              ? { borderBottom: '2px solid #F59E0B', borderRadius: 0, paddingBottom: '14px' }
              : {}
          }
        >
          <LayoutDashboard size={14} />
          Dashboard
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
            }`
          }
          style={({ isActive }) =>
            isActive
              ? { borderBottom: '2px solid #F59E0B', borderRadius: 0, paddingBottom: '14px' }
              : {}
          }
        >
          <BarChart3 size={14} />
          Analytics
        </NavLink>
        <NavLink
          to="/bookmarks"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
            }`
          }
          style={({ isActive }) =>
            isActive
              ? { borderBottom: '2px solid #F59E0B', borderRadius: 0, paddingBottom: '14px' }
              : {}
          }
        >
          <Bookmark size={14} />
          Bookmarks
        </NavLink>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        className="flex items-center gap-2 px-4 py-2 text-sm font-bold"
        style={{
          background: '#F59E0B',
          color: '#0C0C0C',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 200ms ease',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#FBBF24'}
        onMouseLeave={e => e.currentTarget.style.background = '#F59E0B'}
      >
        <Download size={14} />
        Export CSV
      </button>
    </nav>
  )
}
