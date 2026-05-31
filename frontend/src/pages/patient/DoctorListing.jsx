import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, Clock, IndianRupee, ChevronRight, Filter } from 'lucide-react';
import api from '../../lib/api';
import AIChat from '../../components/AIChat';

const SHIFT_LABELS = ['8AM–1PM', '2PM–7PM', '8PM–1AM', '2AM–7AM'];

export default function DoctorListing() {
  const [doctors, setDoctors] = useState([]);
  const [search,  setSearch]  = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDoctors = async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/doctors', { params });
      setDoctors(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleSearch = e => {
    e.preventDefault();
    fetchDoctors({ name: search, tags: tagFilter, language: langFilter });
  };

  const handleTagSelect = tag => {
    setTagFilter(tag);
    fetchDoctors({ tags: tag, language: langFilter });
  };

  const shiftBits = mask => Array.from({ length: 4 }, (_, i) => !!(mask & (1 << i)));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      {/* Hero */}
      <div className="fade-up" style={{ marginBottom: 36, textAlign:'center' }}>
        <h1 style={{ fontSize: 42, fontWeight: 900, marginBottom: 10, lineHeight: 1.1 }}>
          Find Your <span className="gradient-text">Perfect Doctor</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 16 }}>Book appointments with verified specialists in seconds</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="glass fade-up" style={{ display:'flex', gap:10, padding:16, marginBottom:32, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1 }}>
          <Search size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
          <input className="input" style={{ paddingLeft:40 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctors by name…" />
        </div>
        <div style={{ position:'relative', flex:1 }}>
          <Filter size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
          <input className="input" style={{ paddingLeft:40 }} value={tagFilter} onChange={e => setTagFilter(e.target.value)} placeholder="Filter by specialization (e.g. cardiologist)…" />
        </div>
        <select className="input" style={{ width: 180 }} value={langFilter} onChange={e => setLangFilter(e.target.value)}>
          <option value="">Any Language</option>
          <option value="English">English</option>
          <option value="Spanish">Spanish</option>
          <option value="Hindi">Hindi</option>
          <option value="French">French</option>
          <option value="Mandarin">Mandarin</option>
          <option value="Arabic">Arabic</option>
          <option value="Telugu">Telugu</option>
          <option value="Tamil">Tamil</option>
          <option value="German">German</option>
        </select>
        <button className="btn-primary" type="submit" style={{ whiteSpace:'nowrap', padding:'11px 24px' }}>Search</button>
        {(search || tagFilter || langFilter) && (
          <button type="button" className="btn-secondary" onClick={() => { setSearch(''); setTagFilter(''); setLangFilter(''); fetchDoctors(); }} style={{ whiteSpace:'nowrap', padding:'11px 16px' }}>Clear</button>
        )}
      </form>

      {/* Doctor grid */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
          <p>Loading doctors…</p>
        </div>
      ) : doctors.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 18, fontWeight: 600 }}>No doctors found</p>
          <p style={{ fontSize: 14 }}>Try different search terms or ask the AI assistant</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:20 }}>
          {doctors.map((doc, idx) => {
            const shifts = shiftBits(doc.shift_mask);
            const tags   = typeof doc.specialization_tags === 'string' ? JSON.parse(doc.specialization_tags) : (doc.specialization_tags || []);
            const langs  = typeof doc.languages === 'string' ? JSON.parse(doc.languages) : (doc.languages || []);
            return (
              <div key={doc.id} className="glass fade-up" style={{ padding:24, display:'flex', flexDirection:'column', gap:14, animationDelay:`${idx * 0.05}s`, transition:'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 12px 24px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=''; }}>

                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:'var(--primary)', display:'flex',alignItems:'center',justifyContent:'center', fontSize:22, fontWeight:800, color:'white', flexShrink:0 }}>
                    {doc.name[0]}
                  </div>
                  <div>
                    <h3 style={{ fontWeight:700, fontSize:16, marginBottom:2 }}>Dr. {doc.name}</h3>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <Star size={13} fill="#f59e0b" color="#f59e0b"/>
                      <span style={{ fontSize:13, fontWeight:600, color:'#f59e0b' }}>{Number(doc.avg_rating).toFixed(1)}</span>
                      <span style={{ color:'var(--muted)', fontSize:12 }}>({doc.rating_count} reviews)</span>
                    </div>
                    {langs.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>🌐</span> {langs.join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{ marginLeft:'auto', textAlign:'right' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:3, color:'var(--accent)', fontWeight:700, fontSize:16 }}>
                      <IndianRupee size={14}/>{doc.fee}
                    </div>
                    <span style={{ fontSize:11, color:'var(--muted)' }}>per visit</span>
                  </div>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {tags.slice(0, 4).map(t => (
                      <span key={t} className="tag" onClick={() => handleTagSelect(t)}>{t}</span>
                    ))}
                  </div>
                )}

                {/* Active shifts */}
                <div style={{ display:'flex', gap:6 }}>
                  {SHIFT_LABELS.map((label, i) => (
                    <span key={i} style={{
                      flex:1, textAlign:'center', padding:'4px 0', borderRadius:6, fontSize:10, fontWeight:600,
                      background: shifts[i] ? '#f0fdf4' : 'var(--surface2)',
                      color: shifts[i] ? 'var(--success)' : 'var(--muted)',
                      border: `1px solid ${shifts[i] ? '#bbf7d0' : 'var(--border)'}`,
                    }}>
                      <Clock size={9} style={{ display:'inline', marginRight:2 }}/>{label}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <Link to={`/doctor/${doc.id}`} style={{ textDecoration:'none' }}>
                  <button className="btn-primary" style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    View & Book <ChevronRight size={15}/>
                  </button>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* AI chatbot */}
      <AIChat onTagSelect={handleTagSelect} />
    </div>
  );
}
