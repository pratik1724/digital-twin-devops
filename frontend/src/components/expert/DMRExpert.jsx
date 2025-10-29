import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog.jsx";
import { Button } from "../ui/button.jsx";

export function DMRExpert() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);

  const backend = useMemo(() => (import.meta?.env?.REACT_APP_BACKEND_URL ?? process.env.REACT_APP_BACKEND_URL ?? ""), []);

  async function ask() {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const url = backend.replace(/\/$/, "") + "/api/rag/query";
      const res = await axios.post(url, { query });
      setAnswer(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    ask();
  };

  // Add/remove class to body when modal opens/closes to hide Edit Tags button
  useEffect(() => {
    if (open) {
      document.body.classList.add('dmr-modal-open');
    } else {
      document.body.classList.remove('dmr-modal-open');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('dmr-modal-open');
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="dmr-expert-trigger">GenAI-Twin-DMR</Button>
      </DialogTrigger>
      <DialogContent className="dmr-expert-modal">
        <div className="dmr-expert-header">
          <div className="dmr-expert-title-section">
            <h2 className="dmr-expert-title">GenAI-Twin-DMR</h2>
            <p className="dmr-expert-description">
              This assistant is an expert in Dry Methane Reformer operations and can answer questions based on real-time and historical data.
            </p>
          </div>
        </div>

        <div className="dmr-expert-content">
          {/* Chat Messages Area */}
          <div className="dmr-expert-messages">
            {error && (
              <div className="dmr-expert-message error-message">
                <div className="message-content">
                  <span className="error-icon">⚠️</span>
                  {String(error)}
                </div>
              </div>
            )}
            
            {answer && (
              <div className="dmr-expert-message assistant-message">
                <div className="message-header">
                  <span className="assistant-avatar">🤖</span>
                  <span className="assistant-name">GenAI-Twin-DMR</span>
                </div>
                <div className="message-content">
                  <div className="answer-text">{answer.answer}</div>
                  {Array.isArray(answer.sources) && answer.sources.length > 0 && (
                    <div className="sources-section">
                      <div className="sources-title">📚 Sources</div>
                      <ul className="sources-list">
                        {answer.sources.map((s, i) => (
                          <li key={i} className="source-item">
                            {s.title || s.id || `Document ${i+1}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {loading && (
              <div className="dmr-expert-message assistant-message loading">
                <div className="message-header">
                  <span className="assistant-avatar">🤖</span>
                  <span className="assistant-name">GenAI-Twin-DMR</span>
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="loading-text">Analyzing DMR data...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Area */}
          <form onSubmit={handleSubmit} className="dmr-expert-input-form">
            <div className="chat-input-container">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., What is the typical H₂ inlet range in the last hour?"
                className="chat-input"
                rows="1"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="send-button"
                aria-label="Send message"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}