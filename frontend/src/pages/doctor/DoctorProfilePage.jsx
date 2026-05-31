import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, X, Star, IndianRupee } from 'lucide-react';

const SHIFT_LABELS = ['Morning (8AM–1PM)', 'Afternoon (2PM–7PM)', 'Evening (8PM–1AM)', 'Night (2AM–7AM)'];

export default function DoctorProfilePage() {
  const { user, login, token } = useAuth();
  const [doc,     setDoc]     = useState(null);
  const [form,    setForm]    = useState({ name:'', bio:'', fee:300 });
  const [newTag,  setNewTag]  = useState('');
  const [newLang, setNewLang] = useState('');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => { fetchDoc(); }, []);

  const fetchDoc = async () => {
    const { data } = await api.get(`/doctors/${user.id}`);
    setDoc(data);
    const tags = typeof data.specialization_tags === 'string' ? JSON.parse(data.specialization_tags) : (data.specialization_tags || []);
    setForm({ name: data.name||'', bio: data.bio||'', fee: data.fee||300, tags });
  };

  const toggleShift = async (shiftIdx) => {
    const current = doc.shift_mask;
    const bit     = 1 << shiftIdx;
    const newMask = current ^ bit;
    try {
      await api.patch('/doctors/profile', { shift_mask: newMask });
      setDoc(d => ({ ...d, shift_mask: newMask }));
      toast.success('Shift preference updated!');
    } catch { toast.error('Update failed'); }
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    const tags = typeof doc.specialization_tags === 'string' ? JSON.parse(doc.specialization_tags) : (doc.specialization_tags || []);
    const updated = [...new Set([...tags, newTag.trim().toLowerCase()])];
    saveField({ specialization_tags: updated });
    setNewTag('');
  };

  const removeTag = (tag) => {
    const tags = typeof doc.specialization_tags === 'string' ? JSON.parse(doc.specialization_tags) : (doc.specialization_tags || []);
    saveField({ specialization_tags: tags.filter(t => t !== tag) });
  };

  const addLang = () => {
    if (!newLang.trim()) return;
    const langs = typeof doc.languages === 'string' ? JSON.parse(doc.languages) : (doc.languages || []);
    const updated = [...new Set([...langs, newLang.trim()])];
    saveField({ languages: updated });
    setNewLang('');
  };

  const removeLang = (lang) => {
    const langs = typeof doc.languages === 'string' ? JSON.parse(doc.languages) : (doc.languages || []);
    saveField({ languages: langs.filter(l => l !== lang) });
  };

  const saveField = async (fields) => {
    setSaving(true);
    try {
      const { data } = await api.patch('/doctors/profile', fields);
      setDoc(prev => ({ ...prev, ...data }));
      if (fields.name) login(token, { ...user, name: fields.name });
      toast.success('Saved!');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  if (!doc) return <div style={{ textAlign:'center', padding:'80px 0', color:'var(--muted)' }}>Loading…</div>;

  const tags = typeof doc.specialization_tags === 'string' ? JSON.parse(doc.specialization_tags) : (doc.specialization_tags || []);
  const langs = typeof doc.languages === 'string' ? JSON.parse(doc.languages) : (doc.languages || []);
  const avgRating = doc.rating_count ? (doc.rating_sum / doc.rating_count).toFixed(1) : '0.0';

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 24px' }}>
      <h1 style={{ fontSize:28, fontWeight:900, marginBottom:24 }}>
        👨‍⚕️ My <span className="gradient-text">Profile</span>
      </h1>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:24 }}>
        {[
          { icon:'⭐', label:'Rating', value:`${avgRating} / 5` },
          { icon:'📝', label:'Reviews', value: doc.rating_count },
          { icon:'💰', label:'Fee per Visit', value:`₹${doc.fee}` },
        ].map(stat => (
          <div key={stat.label} className="glass" style={{ padding:'20px 24px', textAlign:'center' }}>
            <div style={{ fontSize:24, marginBottom:4 }}>{stat.icon}</div>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--accent)' }}>{stat.value}</div>
            <div style={{ fontSize:12, color:'var(--muted)', fontWeight:600 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Basic Info */}
      <div className="glass fade-up" style={{ padding:28, marginBottom:20 }}>
        <h2 style={{ fontWeight:700, marginBottom:16, fontSize:18 }}>Basic Information</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:500 }}>
          <div>
            <label style={{ fontSize:12, color:'var(--muted)', fontWeight:600, display:'block', marginBottom:4 }}>Name</label>
            <input className="input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}/>
          </div>
          <div>
            <label style={{ fontSize:12, color:'var(--muted)', fontWeight:600, display:'block', marginBottom:4 }}>Bio</label>
            <textarea className="input" rows={3} value={form.bio} onChange={e => setForm(f=>({...f,bio:e.target.value}))} style={{resize:'vertical'}} placeholder="Write a short professional bio…"/>
          </div>
          <div>
            <label style={{ fontSize:12, color:'var(--muted)', fontWeight:600, display:'block', marginBottom:4 }}>Consultation Fee (₹)</label>
            <input className="input" type="number" min={0} value={form.fee} onChange={e => setForm(f=>({...f,fee:Number(e.target.value)}))} style={{maxWidth:160}}/>
          </div>
          <button className="btn-primary" disabled={saving} onClick={() => saveField({ name:form.name, bio:form.bio, fee:form.fee })} style={{ width:'fit-content', padding:'10px 24px' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Specialization Tags */}
      <div className="glass fade-up" style={{ padding:28, marginBottom:20 }}>
        <h2 style={{ fontWeight:700, marginBottom:6, fontSize:18 }}>Specialization Tags</h2>
        <p style={{ color:'var(--muted)', fontSize:13, marginBottom:16 }}>These tags help patients and the AI find you. Use keywords like "cardiologist", "chest pain", "heart".</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
          {tags.map(t => (
            <div key={t} className="tag active" style={{ display:'flex', alignItems:'center', gap:5 }}>
              {t}
              <button onClick={() => removeTag(t)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', color:'white', padding:0 }}>
                <X size={11}/>
              </button>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input className="input" value={newTag} onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key==='Enter' && addTag()} placeholder="Add a tag… (press Enter)" style={{ maxWidth:280 }}/>
          <button className="btn-primary" onClick={addTag} style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Add
          </button>
        </div>
      </div>

      {/* Languages Spoken */}
      <div className="glass fade-up" style={{ padding:28, marginBottom:20 }}>
        <h2 style={{ fontWeight:700, marginBottom:6, fontSize:18 }}>Languages Spoken</h2>
        <p style={{ color:'var(--muted)', fontSize:13, marginBottom:16 }}>Add the languages you can speak to help patients find you.</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
          {langs.map(l => (
            <div key={l} className="tag active" style={{ display:'flex', alignItems:'center', gap:5, background:'var(--surface)', color:'var(--foreground)', border:'1px solid var(--border)' }}>
              🌐 {l}
              <button onClick={() => removeLang(l)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', color:'var(--muted)', padding:0 }}>
                <X size={11}/>
              </button>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input className="input" value={newLang} onChange={e => setNewLang(e.target.value)}
            onKeyDown={e => e.key==='Enter' && addLang()} placeholder="Add a language… (press Enter)" style={{ maxWidth:280 }}/>
          <button className="btn-secondary" onClick={addLang} style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={15}/> Add
          </button>
        </div>
      </div>

      {/* Shift Preferences */}
      <div className="glass fade-up" style={{ padding:28, marginBottom:20 }}>
        <h2 style={{ fontWeight:700, marginBottom:6, fontSize:18 }}>Working Shifts</h2>
        <p style={{ color:'var(--muted)', fontSize:13, marginBottom:16 }}>Toggle which shifts you accept patients for.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {SHIFT_LABELS.map((label, i) => {
            const active = !!(doc.shift_mask & (1 << i));
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background:'var(--surface2)', borderRadius:12, border:`1px solid ${active ? '#bbf7d0' : 'var(--border)'}` }}>
                <div>
                  <p style={{ fontWeight:600, fontSize:14 }}>Shift {i+1} — {label}</p>
                  <p style={{ color:'var(--muted)', fontSize:12 }}>60 × 5-minute booking slots</p>
                </div>
                <button onClick={() => toggleShift(i)} style={{
                  width:52, height:28, borderRadius:14, border:'none', cursor:'pointer', position:'relative',
                  background: active ? 'var(--success)' : '#cbd5e1',
                  transition:'background 0.25s',
                }}>
                  <div style={{
                    width:22, height:22, borderRadius:'50%', background:'white',
                    position:'absolute', top:3, left: active ? 27 : 3,
                    transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)'
                  }}/>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews */}
      <div className="glass fade-up" style={{ padding:28 }}>
        <h2 style={{ fontWeight:700, marginBottom:16, fontSize:18 }}>⭐ Patient Reviews</h2>
        {!doc.reviews?.length ? (
          <p style={{ color:'var(--muted)' }}>No reviews yet</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {doc.reviews.map((r, i) => (
              <div key={i} style={{ background:'var(--surface2)', borderRadius:12, padding:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--primary)', display:'flex',alignItems:'center',justifyContent:'center', fontSize:12, fontWeight:700, color:'white' }}>
                    {r.patient_name?.[0]?.toUpperCase()}
                  </div>
                  <p style={{ fontWeight:600, fontSize:13 }}>{r.patient_name}</p>
                  <div style={{ display:'flex' }}>
                    {Array(5).fill(0).map((_,j) => <span key={j} style={{color: j<r.rating?'#f59e0b':'var(--border)', fontSize:14}}>★</span>)}
                  </div>
                  <p style={{ marginLeft:'auto', fontSize:11, color:'var(--muted)' }}>{new Date(r.updated_at||r.created_at).toLocaleDateString()}</p>
                </div>
                {r.comment && <p style={{ color:'var(--muted)', fontSize:13 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
