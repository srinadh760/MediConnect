import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, LogOut, User, Calendar } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => { logout(); nav('/auth'); };

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255,255,255,0.9)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      {/* Logo */}
      <Link to={user?.role === 'doctor' ? '/doctor/bookings' : '/'} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'var(--primary)', display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Stethoscope size={18} color="white"/>
        </div>
        <span style={{ fontFamily:'Outfit,sans-serif', fontWeight:800, fontSize:20 }} className="gradient-text">MediConnect</span>
      </Link>

      {/* Right */}
      {user ? (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {user.role === 'patient' && (
            <Link to="/profile" style={{ textDecoration:'none' }}>
              <button className="btn-secondary" style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px' }}>
                <User size={15}/> Profile
              </button>
            </Link>
          )}
          {user.role === 'doctor' && (
            <>
              <Link to="/doctor/profile" style={{ textDecoration:'none' }}>
                <button className="btn-secondary" style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px' }}>
                  <User size={15}/> My Profile
                </button>
              </Link>
              <Link to="/doctor/bookings" style={{ textDecoration:'none' }}>
                <button className="btn-secondary" style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px' }}>
                  <Calendar size={15}/> Bookings
                </button>
              </Link>
            </>
          )}
          <div style={{ padding:'0 8px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--primary)', display:'flex',alignItems:'center',justifyContent:'center', fontSize:13, fontWeight:700, color:'white' }}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--muted)' }}>{user.name?.split(' ')[0]}</span>
          </div>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding:'8px 12px', display:'flex', alignItems:'center', gap:6, color:'var(--danger)', borderColor:'var(--danger)' }}>
            <LogOut size={15}/>
          </button>
        </div>
      ) : (
        <Link to="/auth"><button className="btn-primary">Sign In</button></Link>
      )}
    </nav>
  );
}
