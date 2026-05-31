import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Clock, FileText, Upload, ChevronDown, ChevronUp } from 'lucide-react';

const SHIFT_LABELS = ['Morning (8AM–1PM)', 'Afternoon (2PM–7PM)', 'Evening (8PM–1AM)', 'Night (2AM–7AM)'];
const STATUS_COLORS = { upcoming:'var(--primary)', completed:'var(--success)', cancelled:'var(--danger)' };

export default function DoctorBookings() {
  const { user }  = useAuth();
  const [appts,   setAppts]   = useState([]);
  const [expanded,setExpanded]= useState(null);
  const [records, setRecords] = useState({});
  const [notes,   setNotes]   = useState({});
  const [saving,  setSaving]  = useState({});
  const [uploading,setUploading]=useState({});
  const fileRefs = useRef({});

  useEffect(() => { fetchAppts(); }, []);

  const fetchAppts = async () => {
    const { data } = await api.get('/appointments/doctor');
    setAppts(data);
  };

  const expandAppt = async (appt) => {
    if (expanded === appt.id) { setExpanded(null); return; }
    setExpanded(appt.id);
    if (!records[appt.patient_id]) {
      try {
        const { data } = await api.get(`/patients/${appt.patient_id}/records`);
        setRecords(r => ({ ...r, [appt.patient_id]: data }));
      } catch { /* no records yet */ }
    }
  };

  const saveNotes = async (appt) => {
    setSaving(s => ({...s, [appt.id]: true }));
    try {
      await api.patch(`/appointments/${appt.id}/notes`, { notes: notes[appt.id] || '' });
      toast.success('Notes saved & appointment marked complete!');
      fetchAppts();
    } catch { toast.error('Save failed'); }
    finally { setSaving(s => ({...s, [appt.id]: false })); }
  };

  const attachRecord = async (apptId, patientId, file) => {
    if (!file) return;
    setUploading(u => ({...u, [apptId]: true }));
    const fd = new FormData();
    fd.append('file', file);
    fd.append('label', 'Doctor Prescription');
    fd.append('appointment_id', apptId);
    try {
      await api.post(`/patients/${patientId}/records`, fd);
      toast.success('Record attached to patient profile!');
      // Refresh records
      const { data } = await api.get(`/patients/${patientId}/records`);
      setRecords(r => ({ ...r, [patientId]: data }));
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
    finally { setUploading(u => ({...u, [apptId]: false })); }
  };

  // Group by date
  const grouped = appts.reduce((acc, a) => {
    const d = a.start_time_utc?.slice(0,10) || a.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 24px' }}>
      <h1 style={{ fontSize:28, fontWeight:900, marginBottom:8 }}>
        📅 My <span className="gradient-text">Bookings</span>
      </h1>
      <p style={{ color:'var(--muted)', marginBottom:28, fontSize:14 }}>{appts.length} total appointment{appts.length !== 1 ? 's' : ''}</p>

      {appts.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--muted)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
          <p style={{ fontSize:18, fontWeight:600 }}>No bookings yet</p>
          <p style={{ fontSize:14 }}>Patients will appear here once they book with you</p>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => new Date(a) - new Date(b))
          .map(([date, dayAppts]) => (
            <div key={date} style={{ marginBottom:28 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ height:1, flex:1, background:'var(--border)' }}/>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--accent)', background:'var(--surface)', padding:'4px 14px', borderRadius:20, border:'1px solid var(--border)' }}>
                  {new Date(date).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                </span>
                <div style={{ height:1, flex:1, background:'var(--border)' }}/>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {dayAppts.map(appt => (
                  <div key={appt.id} className="glass" style={{ borderLeft:`3px solid ${STATUS_COLORS[appt.status]}`, overflow:'hidden' }}>
                    {/* Header row */}
                    <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14, cursor:'pointer' }}
                      onClick={() => expandAppt(appt)}>
                      {/* Time badge */}
                      <div style={{ background:'var(--surface2)', borderRadius:10, padding:'8px 12px', textAlign:'center', minWidth:70, flexShrink:0 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>
                          {new Date(appt.start_time_utc).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                        </div>
                        <div style={{ fontSize:9, color:'var(--muted)', fontWeight:600 }}>{SHIFT_LABELS[appt.shift_no-1]?.split(' ')[0]}</div>
                      </div>

                      <div style={{ flex:1 }}>
                        <p style={{ fontWeight:700, fontSize:15 }}>{appt.patient_name}</p>
                        <p style={{ color:'var(--muted)', fontSize:12 }}>
                          <Clock size={11} style={{ display:'inline', marginRight:3 }}/>
                          {appt.duration_slots * 5} min · {SHIFT_LABELS[appt.shift_no-1]}
                        </p>
                        {appt.patient_phone && <p style={{ color:'var(--muted)', fontSize:12 }}>📱 {appt.patient_phone}</p>}
                      </div>

                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ padding:'4px 12px', borderRadius:6, fontWeight:600, fontSize:12, background: appt.status === 'upcoming' ? '#eff6ff' : appt.status === 'completed' ? '#f0fdf4' : '#fef2f2', color:STATUS_COLORS[appt.status] }}>
                          {appt.status}
                        </span>
                        <span style={{ fontWeight:700, color:'var(--accent)' }}>₹{appt.fee_paid}</span>
                        {expanded === appt.id ? <ChevronUp size={16} color="var(--muted)"/> : <ChevronDown size={16} color="var(--muted)"/>}
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {expanded === appt.id && (
                      <div style={{ padding:'0 20px 20px', borderTop:'1px solid var(--border)' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16 }}>
                          {/* Patient records */}
                          <div>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                              <p style={{ fontWeight:700, fontSize:14 }}>📄 Medical Records</p>
                              <button onClick={() => fileRefs.current[appt.id]?.click()} className="btn-secondary"
                                style={{ padding:'5px 10px', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                                {uploading[appt.id] ? 'Uploading…' : <><Upload size={12}/> Attach</>}
                              </button>
                              <input ref={el => fileRefs.current[appt.id] = el} type="file" hidden
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={e => attachRecord(appt.id, appt.patient_id, e.target.files[0])}/>
                            </div>
                            {records[appt.patient_id]?.length ? (
                              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:180, overflowY:'auto' }}>
                                {records[appt.patient_id].map(r => (
                                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8, background:'var(--surface2)', borderRadius:8, padding:'8px 12px' }}>
                                    <FileText size={14} color="var(--primary)"/>
                                    <div style={{ flex:1 }}>
                                      <p style={{ fontSize:12, fontWeight:600 }}>{r.label || r.filename}</p>
                                      <p style={{ fontSize:10, color:'var(--muted)' }}>{r.uploaded_by === 'doctor' ? '👨‍⚕️ Doctor' : '👤 Patient'}</p>
                                    </div>
                                    <a href={`/uploads/${r.filepath.split(/[\\/]/).pop()}`} target="_blank" rel="noreferrer"
                                      style={{ fontSize:11, color:'var(--accent)', fontWeight:600, textDecoration:'none' }}>View ↗</a>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ color:'var(--muted)', fontSize:13 }}>No records yet</p>
                            )}
                          </div>

                          {/* Notes */}
                          <div>
                            <p style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>📋 Doctor Notes</p>
                            {appt.doctor_notes && appt.status !== 'upcoming' ? (
                              <div style={{ background:'var(--surface2)', borderRadius:8, padding:12, fontSize:13, color:'var(--muted)', lineHeight:1.5 }}>
                                {appt.doctor_notes}
                              </div>
                            ) : (
                              <>
                                <textarea className="input" rows={4} style={{ resize:'vertical', marginBottom:8, fontSize:13 }}
                                  value={notes[appt.id] ?? (appt.doctor_notes || '')}
                                  onChange={e => setNotes(n => ({...n, [appt.id]: e.target.value}))}
                                  placeholder="Add notes or prescription details…"/>
                                <button className="btn-primary" onClick={() => saveNotes(appt)} disabled={saving[appt.id]} style={{ padding:'8px 18px', fontSize:13 }}>
                                  {saving[appt.id] ? 'Saving…' : 'Save & Complete'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
