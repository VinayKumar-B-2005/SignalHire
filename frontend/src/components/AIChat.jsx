import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Loader2 } from 'lucide-react'
import { useApp } from '../App.jsx'

const SUGGESTIONS = [
  "Who are the top 3 candidates and why?",
  "Which candidates have the shortest notice periods?",
  "Who has open source contributions?",
  "Which candidates might be overqualified?",
  "Compare the top 2 candidates head to head",
]

export default function AIChat() {
  const { rankingData } = useApp()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return

    const userMsg = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const candidates = rankingData?.candidates || []
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, candidates }),
      })
      if (!res.ok) {
        // Read the actual error detail from FastAPI
        let errDetail = `HTTP ${res.status}`
        try {
          const errJson = await res.json()
          errDetail = errJson.detail || errDetail
        } catch (_) {}
        throw new Error(errDetail)
      }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠ ${err.message}`,
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#F59E0B',
          color: '#0C0C0C',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
          boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
          transition: 'background 200ms, transform 200ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#FBBF24'; e.currentTarget.style.transform = 'scale(1.08)' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#F59E0B'; e.currentTarget.style.transform = 'scale(1)' }}
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: 92,
              right: 24,
              width: 340,
              height: 480,
              background: '#141414',
              border: '1px solid #2A2A2A',
              borderRadius: 16,
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
            }}
          >
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #2A2A2A', flexShrink: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#F5F5F5', margin: 0 }}>SignalHire AI</p>
              <p style={{ color: '#A3A3A3', fontSize: 11, margin: '2px 0 0' }}>Ask about your candidates</p>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 && (
                <div>
                  <p style={{ color: '#525252', fontSize: 11, marginBottom: 10 }}>Suggested questions:</p>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: '1px solid #2A2A2A',
                        borderRadius: 8,
                        padding: '7px 10px',
                        color: '#A3A3A3',
                        fontSize: 12,
                        cursor: 'pointer',
                        marginBottom: 6,
                        transition: 'border-color 200ms, color 200ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'; e.currentTarget.style.color = '#F5F5F5' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#A3A3A3' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '8px 12px',
                      borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: msg.role === 'user' ? '#F59E0B' : '#1A1A1A',
                      border: msg.role === 'user' ? 'none' : '1px solid #2A2A2A',
                      color: msg.role === 'user' ? '#0C0C0C' : '#F5F5F5',
                      fontSize: 12,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={14} style={{ color: '#F59E0B', animation: 'spin 1s linear infinite' }} />
                  <span style={{ color: '#525252', fontSize: 11 }}>Thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #2A2A2A', display: 'flex', gap: 8, flexShrink: 0 }}>
              <input
                className="input-field flex-1"
                style={{ padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                placeholder="Ask about candidates..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                disabled={loading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                style={{
                  background: input.trim() ? '#F59E0B' : '#2A2A2A',
                  color: input.trim() ? '#0C0C0C' : '#525252',
                  border: 'none',
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 200ms',
                  flexShrink: 0,
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
