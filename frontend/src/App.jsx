import React, { useState, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Landing from './pages/Landing.jsx'
import Results from './pages/Results.jsx'
import Analytics from './pages/Analytics.jsx'
import BookmarkPanel from './components/BookmarkPanel.jsx'
import AIChat from './components/AIChat.jsx'

// ── App Context ──────────────────────────────────────────────────────────────
export const AppContext = createContext(null)

export function useApp() {
  return useContext(AppContext)
}

export default function App() {
  const [rankingData, setRankingData] = useState(null) // { candidates, stats, preview_mode }
  const [bookmarks, setBookmarks] = useState([])       // array of candidate objects
  const [compareCandidates, setCompareCandidates] = useState([]) // up to 3

  const addBookmark = (candidate) => {
    setBookmarks(prev => {
      if (prev.find(b => b.candidate_id === candidate.candidate_id)) return prev
      return [...prev, candidate]
    })
  }

  const removeBookmark = (candidateId) => {
    setBookmarks(prev => prev.filter(b => b.candidate_id !== candidateId))
  }

  const isBookmarked = (candidateId) => {
    return bookmarks.some(b => b.candidate_id === candidateId)
  }

  const toggleCompare = (candidate) => {
    setCompareCandidates(prev => {
      const exists = prev.find(c => c.candidate_id === candidate.candidate_id)
      if (exists) return prev.filter(c => c.candidate_id !== candidate.candidate_id)
      if (prev.length >= 3) return prev // max 3
      return [...prev, candidate]
    })
  }

  const clearCompare = () => setCompareCandidates([])

  const hasRanking = !!rankingData

  return (
    <AppContext.Provider value={{
      rankingData, setRankingData,
      bookmarks, addBookmark, removeBookmark, isBookmarked,
      compareCandidates, toggleCompare, clearCompare,
      hasRanking,
    }}>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: '#0C0C0C' }}>
          {hasRanking && <Navbar />}

          <Routes>
            <Route path="/" element={hasRanking ? <Navigate to="/results" replace /> : <Landing />} />
            <Route path="/results" element={hasRanking ? <Results /> : <Navigate to="/" replace />} />
            <Route path="/analytics" element={hasRanking ? <Analytics /> : <Navigate to="/" replace />} />
            <Route path="/bookmarks" element={hasRanking ? <BookmarkPanel /> : <Navigate to="/" replace />} />
          </Routes>

          {/* Floating AI Chat — always visible when ranking loaded */}
          {hasRanking && <AIChat />}
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  )
}
