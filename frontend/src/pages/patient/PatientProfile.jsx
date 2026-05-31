import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Upload, FileText, Wallet, Calendar, X, Clock } from 'lucide-react';

const STATUS_COLORS = { upcoming:'var(--primary)', completed:'var(--success)', cancelled:'var(--danger)' };
const SHIFT_LABELS = ['Morning (8AM–1PM)', 'Afternoon (2PM–7PM)', 'Evening (8PM–1AM)', 'Night (2AM–7AM)'];

export default function PatientProfile() {
  const { user, login, token } = useAuth();
  const [profile,  setProfile]  = useState(null);
  const [appts,    setAppts]    = useState([]);
  const [records,  setRecords]  = useState([]);
  const [tab,      setTab]      = useState('appointments');
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState({ name:'', phone:'', dob:'' });
  const [uploading,setUploading]= useState(false);
  const [label,    setLabel]    = useState('');
  const fileRef = useRef();

  useEffect(() => {
    fetchProfile();
    fetchAppts();
    fetchRecords();
  }, []);

  const fetchProfile = async () => {
    const { data } = await api.get('/patients/profile');
    setProfile(data);
    setForm({ name: data.name || '', phone: data.phone || '', dob: data.dob?.slice(0,10) || '' });
  };

  const fetchAppts = async () => {
    const { data } = await api.get('/appointments/patient');
    setAppts(data);
  };

  const fetchRecords = async () => {
    const { data } = await api.get('/patients/records');
    setRecords(data);
  };

  const saveProfile = async () => {
    try {
      const { data } = await api.patch('/patients/profile', form);
      setProfile(data);
      login(token, { ...user, name: data.name });
      toast.success('Profile updated!');
      setEditing(false);
    } catch { toast.error('Update failed'); }
  };

  const cancelAppt = async (id) => {
    if (!confirm('Cancel this appointment? Wallet will be refunded.')) return;
    try {
      await api.post(`/appointments/${id}/cancel`);
      toast.success('Appointment cancelled. Wallet refunded!');
      fetchAppts();
      fetchProfile();
    } catch (err) { toast.error(err.response?.data?.error || 'Cancellation failed'); }
  };

  const uploadRecord = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('label', label || file.name);
    try {
      await api.post('/patients/records', fd);
      toast.success('Record uploaded!');
      fetchRecords();
      setLabel('');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  if (!profile) return <div style={{ textAlign:'center', padding:'80px 0', color:'var(--muted)' }}>Loading…</div>;

  const upcoming = appts.filter(a => a.status === 'upcoming');
  const past     = appts.filter(a => a.status !== 'upcoming');

  return (
    <div style={{ maxWidth:960, margin:'0 auto', padding:'28px 24px' }}>
      {/* Profile header */}
      <div className="glass fade-up" style={{ padding:28, marginBottom:24, display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--primary)', display:'flex',alignItems:'center',justifyContent:'center', fontSize:28, fontWeight:900, color:'white' }}>
          {profile.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          {editing ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:400 }}>
              <input className="input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Name"/>
              <input className="input" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="Phone"/>
              <input className="input" type="date" value={form.dob} onChange={e => setForm(f=>({...f,dob:e.target.value}))} style={{colorScheme:'light'}}/>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn-primary" onClick={saveProfile} style={{padding:'9px 20px'}}>Save</button>
                <button className="btn-secondary" onClick={() => setEditing(false)} style={{padding:'9px 16px'}}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize:26, fontWeight:800, marginBottom:4 }}>{profile.name}</h1>
              <p style={{ color:'var(--muted)', fontSize:14, marginBottom:2 }}>📧 {profile.email}</p>
              {profile.phone && <p style={{ color:'var(--muted)', fontSize:14 }}>📱 {profile.phone}</p>}
              <button className="btn-secondary" onClick={() => setEditing(true)} style={{ marginTop:10, padding:'7px 16px', fontSize:13 }}>Edit Profile</button>
            </>
          )}
        </div>

        {/* Wallet card */}
        <div className="glass" style={{ padding:'20px 28px', textAlign:'center', border:'1px solid #bfdbfe' }}>
          <Wallet size={20} color="var(--accent)" style={{ marginBottom:6 }}/>
          <div style={{ fontSize:30, fontWeight:900, color:'var(--accent)' }}>₹{profile.wallet}</div>
          <div style={{ fontSize:12, color:'var(--muted)' }}>Wallet Balance</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'var(--surface)', borderRadius:12, padding:4, marginBottom:24 }}>
        {[['appointments','📅 Appointments'],['records','📄 Medical Records']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex:1, padding:'10px 0', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600, fontSize:14,
            background: tab===key ? 'var(--surface)' : 'transparent',
            color: tab===key ? 'var(--primary)' : 'var(--muted)', transition:'all 0.2s',
            boxShadow: tab===key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
          }}>{label}</button>
        ))}
      </div>

      {/* Appointments tab */}
      {tab === 'appointments' && (
        <div className="fade-up">
          {upcoming.length > 0 && (
            <>
              <h3 style={{ fontWeight:700, marginBottom:12, color:'var(--accent)' }}>Upcoming</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
                {upcoming.map(a => (
                  <div key={a.id} className="glass" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700 }}>Dr. {a.doctor_name}</p>
                      <p style={{ color:'var(--muted)', fontSize:13 }}>
                        <Clock size={12} style={{ display:'inline', marginRight:4 }}/>
                        {new Date(a.start_time_utc).toLocaleString()} · {SHIFT_LABELS[a.shift_no-1]}
                      </p>
                    </div>
                    <span style={{ padding:'4px 12px', borderRadius:6, fontWeight:600, fontSize:12, background:'#eff6ff', color:'var(--primary)' }}>Upcoming</span>
                    <span style={{ fontWeight:700, color:'var(--accent)' }}>₹{a.fee_paid}</span>
                    <button onClick={() => cancelAppt(a.id)} style={{ background:'#fef2f2', color:'var(--danger)', border:'1px solid #fecaca', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:13, fontWeight:600 }}>Cancel</button>
                  </div>
                ))}
              </div>
            </>
          )}
          {past.length > 0 && (
            <>
              <h3 style={{ fontWeight:700, marginBottom:12, color:'var(--muted)' }}>Past</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {past.map(a => (
                  <div key={a.id} className="glass" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:16, opacity:0.8, flexWrap:'wrap' }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:600 }}>Dr. {a.doctor_name}</p>
                      <p style={{ color:'var(--muted)', fontSize:12 }}>{new Date(a.start_time_utc).toLocaleString()}</p>
                      {a.doctor_notes && <p style={{ fontSize:12, color:'var(--accent)', marginTop:4 }}>📋 {a.doctor_notes}</p>}
                    </div>
                    <span style={{ padding:'3px 10px', borderRadius:6, fontWeight:600, fontSize:11, background: a.status === 'upcoming' ? '#eff6ff' : a.status === 'completed' ? '#f0fdf4' : '#fef2f2', color:STATUS_COLORS[a.status] }}>{a.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {appts.length === 0 && <p style={{ color:'var(--muted)', textAlign:'center', padding:'40px 0' }}>No appointments yet. Book your first one!</p>}
        </div>
      )}

      {/* Records tab */}
      {tab === 'records' && (
        <div className="fade-up">
          {/* Upload area */}
          <div className="glass" style={{ padding:20, marginBottom:20, border:'2px dashed var(--border)', textAlign:'center', cursor:'pointer', borderRadius:14, transition:'border-color 0.2s' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--primary)'; }}
            onDragLeave={e => { e.currentTarget.style.borderColor='var(--border)'; }}
            onDrop={e => { e.preventDefault(); uploadRecord(e.dataTransfer.files[0]); e.currentTarget.style.borderColor='var(--border)'; }}>
            <Upload size={28} color="var(--muted)" style={{ marginBottom:8 }}/>
            <p style={{ fontWeight:600 }}>Click or drag file to upload</p>
            <p style={{ color:'var(--muted)', fontSize:13 }}>PDF, JPG, PNG up to 10MB</p>
            <input ref={fileRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={e => uploadRecord(e.target.files[0])}/>
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            <input className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Label for this record (optional)" style={{ flex:1 }}/>
          </div>

          {records.length === 0 ? (
            <p style={{ color:'var(--muted)', textAlign:'center', padding:'30px 0' }}>No records uploaded yet</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {records.map(r => (
                <div key={r.id} className="glass" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
                  <FileText size={20} color="var(--primary)"/>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:600, fontSize:14 }}>{r.label || r.filename}</p>
                    <p style={{ color:'var(--muted)', fontSize:11 }}>
                      {r.uploaded_by === 'doctor' ? `📋 Attached by Dr. ${r.doctor_name}` : '👤 Uploaded by you'} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <a href={`/uploads/${r.filepath.split(/[\\/]/).pop()}`} target="_blank" rel="noreferrer"
                    style={{ fontSize:12, color:'var(--accent)', fontWeight:600, textDecoration:'none' }}>View ↗</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
