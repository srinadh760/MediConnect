import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Stethoscope, User, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const [mode, setMode]       = useState('login');   // 'login' | 'signup'
  const [role, setRole]       = useState('patient'); // 'patient' | 'doctor'
  const [form, setForm]       = useState({ name:'', email:'', password:'', phone:'', dob:'' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login';
      const payload  = mode === 'signup'
        ? { name: form.name, email: form.email, password: form.password, role, phone: form.phone, dob: form.dob }
        : { email: form.email, password: form.password, role };

      const { data } = await api.post(endpoint, payload);
      const userData = data.user || { id: data.id, name: data.name, role: data.role };
      login(data.token, { ...userData, role: data.role });

      toast.success(`Welcome${mode === 'signup' ? ', ' + (data.name || form.name) : ' back'}!`);
      nav(data.role === 'doctor' ? '/doctor/profile' : '/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      padding: '20px'
    }}>
      <div className="glass fade-up" style={{ width: '100%', maxWidth: 440, padding: '40px 36px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary)', display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Stethoscope size={22} color="white" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800 }} className="gradient-text">MediConnect</h1>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {/* Role toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, background: 'var(--surface2)', borderRadius: 12, padding: 4 }}>
          {['patient', 'doctor'].map(r => (
            <button key={r} onClick={() => setRole(r)} style={{
              flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
              background: role === r ? 'var(--surface)' : 'transparent',
              color: role === r ? 'var(--primary)' : 'var(--muted)', transition: 'all 0.2s',
              boxShadow: role === r ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}>
              {r === 'patient' ? '🏥 Patient' : '👨‍⚕️ Doctor'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'signup' && (
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} />
              <input className="input" style={{ paddingLeft: 38 }} name="name" placeholder="Full name" value={form.name} onChange={handle} required />
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} />
            <input className="input" style={{ paddingLeft: 38 }} name="email" type="email" placeholder="Email address" value={form.email} onChange={handle} required />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} />
            <input className="input" style={{ paddingLeft: 38, paddingRight: 44 }} name="password" type={showPw ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={handle} required />
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)' }}>
              {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          {mode === 'signup' && role === 'patient' && (
            <>
              <input className="input" name="phone" placeholder="Phone (optional)" value={form.phone} onChange={handle} />
              <input className="input" name="dob" type="date" placeholder="Date of birth" value={form.dob} onChange={handle} style={{ colorScheme: 'light' }} />
            </>
          )}
          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 4, padding: '13px', fontSize: 15 }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--muted)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
            style={{ background:'none', border:'none', color:'var(--primary)', cursor:'pointer', fontWeight:600, fontSize:14 }}>
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
