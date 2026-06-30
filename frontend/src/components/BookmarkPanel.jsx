import React from 'react'
import { useApp } from '../App.jsx'
import { Bookmark, X, Download } from 'lucide-react'
import ScoreRing from './ScoreRing.jsx'

export default function BookmarkPanel() {
  const { bookmarks, removeBookmark } = useApp()

  const handleExport = () => {
    if (bookmarks.length === 0) return
    const rows = [['candidate_id', 'rank', 'score', 'name', 'title', 'company']]
    bookmarks.forEach(c => {
      rows.push([
        c.candidate_id,
        c.rank ?? '',
        (c.score || 0).toFixed(4),
        c.profile?.anonymized_name || '',
        c.profile?.current_title || '',
        c.profile?.current_company || '',
      ])
    })
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bookmarked_candidates.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ marginTop: 56, padding: '32px 40px', maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bookmark size={20} style={{ color: '#F59E0B' }} />
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Bookmarks</h1>
          </div>
          <p style={{ color: '#525252', fontSize: 13, margin: 0 }}>{bookmarks.length} saved candidate{bookmarks.length !== 1 ? 's' : ''}</p>
        </div>
        {bookmarks.length > 0 && (
          <button
            onClick={handleExport}
            className="btn-primary flex items-center gap-2"
            style={{ padding: '10px 18px', fontSize: 13 }}
          >
            <Download size={14} />
            Export Bookmarks CSV
          </button>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 40px',
          background: '#141414',
          border: '1px solid #2A2A2A',
          borderRadius: 16,
        }}>
          <Bookmark size={40} style={{ color: '#2A2A2A', marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#525252', margin: '0 0 8px' }}>No bookmarks yet</p>
          <p style={{ color: '#525252', fontSize: 13, margin: 0 }}>
            Save candidates from the results page to see them here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookmarks.map(c => (
            <div
              key={c.candidate_id}
              className="card"
              style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <ScoreRing score={c.score || 0} size={50} animate={false} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2 mb-1">
                  {c.rank && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                      #{c.rank}
                    </span>
                  )}
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>{c.profile?.anonymized_name}</span>
                </div>
                <p style={{ color: '#A3A3A3', fontSize: 12, margin: 0 }}>
                  {c.profile?.current_title} · {c.profile?.current_company} · {c.profile?.location}
                </p>
              </div>

              <div style={{ flexShrink: 0 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>
                  {(c.score || 0).toFixed(4)}
                </span>
              </div>

              <button
                onClick={() => removeBookmark(c.candidate_id)}
                style={{
                  background: 'none',
                  border: '1px solid #2A2A2A',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#525252',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'border-color 200ms, color 200ms',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#525252' }}
                title="Remove bookmark"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
