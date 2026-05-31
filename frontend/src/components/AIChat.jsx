import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, AlertTriangle, CheckCircle, Info, Loader } from 'lucide-react';
import api from '../lib/api';

const SHIFT_NAMES = { 1:'Morning (8AM-1PM)', 2:'Afternoon (2PM-7PM)', 3:'Evening (8PM-1AM)', 4:'Night (2AM-7AM)' };

export default function AIChat({ onTagSelect }) {
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState([{
    role: 'bot',
    text: "Hi! I'm your MediConnect health assistant. Tell me how you're feeling and I'll help you find the right doctor. 🩺",
    severity: null
  }]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMsgs(m => [...m, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const { data } = await api.post('/ai/triage', { symptoms: userMsg });
      setMsgs(m => [...m, {
        role: 'bot',
        text: data.message,
        severity: data.severity,
        tags: data.tags,
        disclaimer: data.disclaimer,
      }]);
    } catch {
      setMsgs(m => [...m, { role: 'bot', text: 'Sorry, I\'m having trouble connecting. Please try again.', severity: 'mild' }]);
    } finally {
      setLoading(false);
    }
  };

  const severityIcon = s => s === 'serious' ? <AlertTriangle size={14}/> : s === 'normal' ? <CheckCircle size={14}/> : <Info size={14}/>;
  const severityLabel = s => ({ serious: 'Urgent', normal: 'Specialist Recommended', mild: 'All Normal' })[s] || '';

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
        width: 56, height: 56, borderRadius: '50%', border: 'none',
        background: 'var(--primary)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
        transition: 'transform 0.2s'
      }}>
        {open ? <X size={22} color="white"/> : <Bot size={22} color="white"/>}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="glass slide-in" style={{
          position: 'fixed', bottom: 96, right: 28, zIndex: 999,
          width: 360, height: 480, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--primary)', display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Bot size={18} color="white"/>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15 }}>Health Assistant</p>
              <p style={{ color: 'var(--muted)', fontSize: 10, fontStyle: 'italic', marginTop: 1, lineHeight: 1.2 }}>AI Assistant — Not medical advice</p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%',
                  background: m.role === 'user' ? 'var(--primary)' : 'var(--surface2)',
                  color: m.role === 'user' ? 'white' : 'var(--text)',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                  fontSize: 13, lineHeight: 1.5
                }}>
                  <p>{m.text}</p>
                  {/* Severity badge */}
                  {m.severity && (
                    <div style={{ marginTop: 8 }}>
                      <span className={`severity-${m.severity}`} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600 }}>
                        {severityIcon(m.severity)} {severityLabel(m.severity)}
                      </span>
                    </div>
                  )}
                  {/* Tag chips */}
                  {m.tags?.length > 0 && (
                    <div style={{ marginTop: 8, display:'flex', flexWrap:'wrap', gap:4 }}>
                      <p style={{ fontSize:11, color:'var(--muted)', width:'100%', marginBottom:2 }}>Search for:</p>
                      {m.tags.map(t => (
                        <button key={t} className="tag" onClick={() => { onTagSelect?.(t); setOpen(false); }} style={{ fontSize:11 }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--muted)', fontSize:13 }}>
                <Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> Analyzing...
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
            <input
              className="input" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Describe your symptoms…" style={{ flex:1, fontSize:13, padding:'9px 12px' }}
            />
            <button onClick={send} disabled={loading || !input.trim()} className="btn-primary" style={{ padding:'9px 14px', borderRadius:10 }}>
              <Send size={15}/>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
