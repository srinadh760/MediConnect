import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Clock, IndianRupee, Calendar, CheckCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const SHIFT_LABELS = ['Morning (8AM–1PM)', 'Afternoon (2PM–7PM)', 'Evening (8PM–1AM)', 'Night (2AM–7AM)'];
const SLOT_MIN = 5;
const SLOTS_PER_SHIFT = 60;

function slotToTime(shiftNo, slotIdx) {
  const startMins = [8*60, 14*60, 20*60, 26*60][shiftNo - 1];
  const total = startMins + slotIdx * SLOT_MIN;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

export default function DoctorProfile() {
  const { id }  = useParams();
  const nav     = useNavigate();
  const { user } = useAuth();

  const [doc,         setDoc]         = useState(null);
  const [avail,       setAvail]       = useState(null);
  const [date,        setDate]        = useState(() => new Date().toISOString().slice(0,10));
  const [selShift,    setSelShift]    = useState(1);
  const [selStart,    setSelStart]    = useState(null);
  const [duration,    setDuration]    = useState(15);   // minutes
  const [booking,     setBooking]     = useState(false);
  const [myReview,    setMyReview]    = useState({ rating:0, comment:'' });
  const [submittingR, setSubmittingR] = useState(false);

  useEffect(() => { fetchDoc(); }, [id]);
  useEffect(() => { fetchAvail(); }, [date, id]);

  const fetchDoc = async () => {
    const { data } = await api.get(`/doctors/${id}`);
    setDoc(data);
  };

  const fetchAvail = async () => {
    setAvail(null);
    setSelStart(null);
    const { data } = await api.get(`/schedules/${id}/${date}`);
    setAvail(data.shifts);
  };

  const handleSlotClick = (slotIdx) => {
    const slots = avail?.[`shift_${selShift}`]?.slots || [];
    if (!slots[slotIdx]) return; // booked
    setSelStart(slotIdx);
  };

  const getSelectedSlots = () => {
    if (selStart === null) return [];
    const count = duration / SLOT_MIN;
    return Array.from({ length: count }, (_, i) => selStart + i);
  };

  const isSlotHighlighted = i => {
    const sel = getSelectedSlots();
    return sel.includes(i);
  };

  const book = async () => {
    if (!user) { nav('/auth'); return; }
    if (selStart === null) { toast.error('Please select a start slot'); return; }
    const count = duration / SLOT_MIN;
    if (selStart + count > SLOTS_PER_SHIFT) { toast.error('Selection crosses shift boundary'); return; }

    setBooking(true);
    try {
      await api.post('/appointments/book', {
        doctor_id: id,
        date,
        shift_no: selShift,
        start_slot: selStart,
        duration_minutes: duration,
      });
      toast.success('Appointment booked! 🎉');
      fetchAvail();
      setSelStart(null);
    } catch (err) {
      const code = err.response?.data?.error;
      if (code === 'slot_unavailable') toast.error('This slot was just taken — please pick another!');
      else if (code === 'insufficient_funds') toast.error('Insufficient wallet balance');
      else toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const submitReview = async () => {
    if (!myReview.rating) { toast.error('Please select a rating'); return; }
    setSubmittingR(true);
    try {
      await api.post('/reviews', { doctor_id: id, rating: myReview.rating, comment: myReview.comment });
      toast.success('Review submitted!');
      fetchDoc();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not submit review');
    } finally {
      setSubmittingR(false);
    }
  };

  if (!doc) return (
    <div style={{ textAlign:'center', padding:'80px 0', color:'var(--muted)' }}>
      <div style={{ fontSize:36, marginBottom:12 }}>⏳</div>Loading doctor profile…
    </div>
  );

  const tags   = typeof doc.specialization_tags === 'string' ? JSON.parse(doc.specialization_tags) : (doc.specialization_tags || []);
  const shifts = avail || {};
  const currentShiftSlots = shifts[`shift_${selShift}`]?.slots || Array(60).fill(false);
  const shiftActive = shifts[`shift_${selShift}`]?.active;

  return (
    <div style={{ maxWidth: 1000, margin:'0 auto', padding:'28px 24px' }}>
      {/* Back */}
      <button onClick={() => nav(-1)} className="btn-secondary" style={{ display:'flex', alignItems:'center', gap:6, marginBottom:24, fontSize:13 }}>
        <ChevronLeft size={16}/> Back to Doctors
      </button>

      {/* Profile card */}
      <div className="glass fade-up" style={{ padding:32, marginBottom:24 }}>
        <div style={{ display:'flex', gap:24, alignItems:'flex-start', flexWrap:'wrap' }}>
          <div style={{ width:72, height:72, borderRadius:18, background:'var(--primary)', display:'flex',alignItems:'center',justifyContent:'center', fontSize:30, fontWeight:900, color:'white', flexShrink:0 }}>
            {doc.name[0]}
          </div>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:28, fontWeight:800, marginBottom:4 }}>Dr. {doc.name}</h1>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <Star size={16} fill="#f59e0b" color="#f59e0b"/>
              <span style={{ fontWeight:700, color:'#f59e0b' }}>{Number(doc.avg_rating||0).toFixed(1)}</span>
              <span style={{ color:'var(--muted)', fontSize:13 }}>({doc.rating_count} reviews)</span>
            </div>
            {doc.bio && <p style={{ color:'var(--muted)', fontSize:14, lineHeight:1.6 }}>{doc.bio}</p>}
          </div>
          <div className="glass" style={{ padding:'16px 24px', textAlign:'center' }}>
            <div style={{ fontSize:28, fontWeight:800, color:'var(--accent)' }}>₹{doc.fee}</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>per visit</div>
          </div>
        </div>
        {tags.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:16 }}>
            {tags.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        )}
      </div>

      {/* Booking section */}
      <div className="glass fade-up" style={{ padding:28, marginBottom:24 }}>
        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>📅 Book Appointment</h2>

        {/* Date + Duration */}
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:180 }}>
            <label style={{ fontSize:12, color:'var(--muted)', marginBottom:6, display:'block', fontWeight:600 }}>Select Date</label>
            <input className="input" type="date" value={date} min={new Date().toISOString().slice(0,10)}
              onChange={e => setDate(e.target.value)} style={{ colorScheme:'light' }}/>
          </div>
          <div style={{ flex:1, minWidth:180 }}>
            <label style={{ fontSize:12, color:'var(--muted)', marginBottom:6, display:'block', fontWeight:600 }}>Duration</label>
            <select className="input" value={duration} onChange={e => { setDuration(Number(e.target.value)); setSelStart(null); }}>
              {[5,10,15,20,25,30,45,60].map(d => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>
        </div>

        {/* Shift tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {SHIFT_LABELS.map((label, i) => {
            const sn = i + 1;
            const active = shifts[`shift_${sn}`]?.active;
            return (
              <button key={sn} onClick={() => { if(active){ setSelShift(sn); setSelStart(null); }}}
                style={{
                  padding:'8px 16px', borderRadius:10, border:'none', cursor: active ? 'pointer' : 'not-allowed',
                  background: selShift===sn && active ? 'var(--primary)' : active ? 'var(--surface2)' : 'transparent',
                  color: selShift===sn && active ? 'white' : active ? 'var(--text)' : 'var(--muted)',
                  fontWeight:600, fontSize:13, transition:'all 0.2s',
                  opacity: active ? 1 : 0.5
                }}>
                <Clock size={13} style={{ display:'inline', marginRight:4 }}/>{label}
              </button>
            );
          })}
        </div>

        {/* Slot grid */}
        {!avail ? (
          <p style={{ color:'var(--muted)', fontSize:13 }}>Loading availability…</p>
        ) : !shiftActive ? (
          <div style={{ padding:'20px', textAlign:'center', color:'var(--muted)', background:'var(--surface2)', borderRadius:12 }}>
            🚫 Doctor is not available during this shift
          </div>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(12, 1fr)', gap:4, marginBottom:16 }}>
              {currentShiftSlots.map((free, i) => {
                const highlighted = isSlotHighlighted(i);
                const time = slotToTime(selShift, i);
                return (
                  <button key={i} onClick={() => free && handleSlotClick(i)}
                    title={time} style={{
                      height:28, borderRadius:5, border:`1px solid`, fontSize:8,
                      cursor: free ? 'pointer' : 'not-allowed',
                      transition:'all 0.15s',
                      ...(highlighted    ? { background:'var(--primary)', borderColor:'var(--primary-dark)', color:'white' }
                        : free          ? { background:'#f0fdf4', borderColor:'#bbf7d0', color:'var(--success)' }
                                        : { background:'#fef2f2',  borderColor:'#fecaca',  color:'var(--danger)' })
                    }}>
                    {i % 6 === 0 ? time.slice(0,5) : ''}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--muted)', marginBottom:16 }}>
              {[['#f0fdf4','#bbf7d0','var(--success)','Free'],
                ['var(--primary)','var(--primary-dark)','white','Selected'],
                ['#fef2f2','#fecaca','var(--danger)','Booked']
              ].map(([bg,border,color,label]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:14, height:14, borderRadius:3, background:bg, border:`1px solid ${border}` }}/>
                  {label}
                </div>
              ))}
            </div>

            {selStart !== null && (
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'#eff6ff', borderRadius:12, border:'1px solid #bfdbfe', marginBottom:16 }}>
                <CheckCircle size={18} color="var(--primary)"/>
                <div>
                  <p style={{ fontWeight:600, fontSize:14 }}>
                    {slotToTime(selShift, selStart)} → {slotToTime(selShift, selStart + duration/SLOT_MIN)}
                  </p>
                  <p style={{ color:'var(--muted)', fontSize:12 }}>{duration} min · ₹{doc.fee}</p>
                </div>
                <button onClick={book} disabled={booking} className="btn-primary" style={{ marginLeft:'auto', padding:'10px 22px' }}>
                  {booking ? 'Booking…' : 'Confirm Booking'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reviews */}
      <div className="glass fade-up" style={{ padding:28, marginBottom:24 }}>
        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>⭐ Reviews</h2>

        {user?.role === 'patient' && (
          <div style={{ background:'var(--surface2)', borderRadius:12, padding:20, marginBottom:24 }}>
            <p style={{ fontWeight:600, marginBottom:10, fontSize:14 }}>Leave a Review</p>
            <div style={{ display:'flex', gap:6, marginBottom:12 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} className="star" onClick={() => setMyReview(r => ({...r, rating:n}))}
                  style={{ background:'none', border:'none', color: n <= myReview.rating ? '#f59e0b' : 'var(--border)' }}>★</button>
              ))}
            </div>
            <textarea className="input" rows={3} value={myReview.comment} onChange={e => setMyReview(r => ({...r, comment:e.target.value}))}
              placeholder="Share your experience (optional)…" style={{ resize:'vertical', marginBottom:10 }}/>
            <button className="btn-primary" onClick={submitReview} disabled={submittingR} style={{ padding:'10px 20px' }}>
              {submittingR ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        )}

        {doc.reviews?.length === 0 ? (
          <p style={{ color:'var(--muted)', fontSize:14 }}>No reviews yet. Be the first!</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {doc.reviews?.map((r, i) => (
              <div key={i} style={{ background:'var(--surface2)', borderRadius:12, padding:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--primary)', display:'flex',alignItems:'center',justifyContent:'center', fontSize:13, fontWeight:700, color:'white' }}>
                    {r.patient_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight:600, fontSize:13 }}>{r.patient_name}</p>
                    <div>{Array(5).fill(0).map((_,j) => <span key={j} style={{ color: j<r.rating ? '#f59e0b' : 'var(--border)', fontSize:13 }}>★</span>)}</div>
                  </div>
                  <p style={{ marginLeft:'auto', fontSize:11, color:'var(--muted)' }}>{new Date(r.updated_at||r.created_at).toLocaleDateString()}</p>
                </div>
                {r.comment && <p style={{ color:'var(--muted)', fontSize:13, lineHeight:1.5 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
