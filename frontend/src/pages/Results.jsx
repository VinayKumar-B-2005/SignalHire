import React, { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { useApp } from '../App.jsx'
import FilterSidebar from '../components/FilterSidebar.jsx'
import CandidateCard from '../components/CandidateCard.jsx'
import CandidateModal from '../components/CandidateModal.jsx'
import CompareModal from '../components/CompareModal.jsx'
import StatsBar from '../components/StatsBar.jsx'

const DEFAULT_FILTERS = {
  search: '',
  minScore: 0,
  expMin: 0,
  expMax: 20,
  locations: [],
  workMode: 'Any',
  openToWorkOnly: false,
  noticePeriod: 'Any',
}

function matchesFilters(c, filters) {
  const { profile = {}, redrob_signals: sig = {} } = c

  // Search
  if (filters.search) {
    const q = filters.search.toLowerCase()
    const searchable = [
      profile.anonymized_name, profile.current_title,
      profile.current_company, profile.location
    ].join(' ').toLowerCase()
    if (!searchable.includes(q)) return false
  }

  // Min score
  if ((c.score || 0) < filters.minScore) return false

  // Experience range
  const yoe = profile.years_of_experience || 0
  if (yoe < filters.expMin || yoe > filters.expMax) return false

  // Locations
  if (filters.locations && filters.locations.length > 0 && !filters.locations.includes('All India')) {
    const loc = (profile.location || '').toLowerCase()
    const country = (profile.country || '').toLowerCase()
    const matchesLoc = filters.locations.some(fl => {
      if (fl === 'Outside India') return country !== 'india'
      if (fl === 'Delhi NCR') return loc.includes('delhi') || loc.includes('noida') || loc.includes('gurugram') || loc.includes('gurgaon')
      return loc.includes(fl.toLowerCase())
    })
    if (!matchesLoc) return false
  }

  // Work mode
  if (filters.workMode && filters.workMode !== 'Any') {
    if ((sig.preferred_work_mode || '').toLowerCase() !== filters.workMode.toLowerCase()) return false
  }

  // Open to work
  if (filters.openToWorkOnly && !sig.open_to_work_flag) return false

  // Notice period
  const notice = sig.notice_period_days || 0
  if (filters.noticePeriod === 'Under 30 days' && notice >= 30) return false
  if (filters.noticePeriod === 'Under 60 days' && notice >= 60) return false
  if (filters.noticePeriod === 'Under 90 days' && notice >= 90) return false

  return true
}

export default function Results() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const { rankingData, addBookmark, removeBookmark, isBookmarked, compareCandidates, toggleCompare, clearCompare } = useApp()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [showCompare, setShowCompare] = useState(false)

  const candidates = rankingData?.candidates || []
  const stats = rankingData?.stats || {}
  const previewMode = rankingData?.preview_mode || false

  const filtered = useMemo(() => candidates.filter(c => matchesFilters(c, filters)), [candidates, filters])

  const handleExport = async () => {
    try {
      const res = await fetch(`${API_URL}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'submission.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { console.error(e) }
  }

  const handleValidate = () => {
    alert('Download submission.csv and run:\npython validate_submission.py submission.csv')
  }

  return (
    <div style={{ marginTop: 56 }}>
      {/* Filter sidebar */}
      <FilterSidebar
        filters={filters}
        onChange={setFilters}
        total={candidates.length}
        shown={filtered.length}
        onExport={handleExport}
        onValidate={handleValidate}
      />

      {/* Main content */}
      <div style={{ marginLeft: 260 }}>
        {/* Stats bar */}
        <StatsBar stats={stats} previewMode={previewMode} />

        {/* Preview mode banner */}
        {previewMode && (
          <div style={{
            background: '#1A1A1A',
            borderLeft: '4px solid #F59E0B',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <Info size={15} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#A3A3A3' }}>
              <span style={{ color: '#F59E0B', fontWeight: 600 }}>Preview mode</span> — {candidates.length} sample candidates loaded. Add <code style={{ background: '#2A2A2A', padding: '1px 4px', borderRadius: 3 }}>candidates.jsonl</code> to <code style={{ background: '#2A2A2A', padding: '1px 4px', borderRadius: 3 }}>backend/</code> folder for full 100,000 candidate analysis.
            </span>
          </div>
        )}

        {/* Candidate cards */}
        <div style={{ padding: '20px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <p style={{ color: '#525252', fontSize: 14 }}>No candidates match the current filters.</p>
            </div>
          ) : (
            filtered.map((candidate, i) => (
              <CandidateCard
                key={candidate.candidate_id}
                candidate={candidate}
                index={i}
                onViewProfile={setSelectedCandidate}
                onBookmark={c => isBookmarked(c.candidate_id) ? removeBookmark(c.candidate_id) : addBookmark(c)}
                isBookmarked={isBookmarked(candidate.candidate_id)}
                onCompareToggle={toggleCompare}
                isComparing={compareCandidates.some(c => c.candidate_id === candidate.candidate_id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Candidate Modal */}
      <AnimatePresence>
        {selectedCandidate && (
          <CandidateModal
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
          />
        )}
      </AnimatePresence>

      {/* Compare sticky bar */}
      {compareCandidates.length >= 2 && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 260,
            right: 0,
            background: '#141414',
            borderTop: '1px solid #F59E0B',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 25,
          }}
        >
          <span style={{ color: '#A3A3A3', fontSize: 13 }}>
            <span style={{ color: '#F59E0B', fontWeight: 700 }}>{compareCandidates.length}</span> candidates selected for comparison
          </span>
          <div className="flex gap-2">
            <button
              onClick={clearCompare}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              Clear
            </button>
            <button
              onClick={() => setShowCompare(true)}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              Compare {compareCandidates.length} Candidates →
            </button>
          </div>
        </motion.div>
      )}

      {/* Compare modal */}
      <AnimatePresence>
        {showCompare && (
          <CompareModal
            candidates={compareCandidates}
            onClose={() => setShowCompare(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
