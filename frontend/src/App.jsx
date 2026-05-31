import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

import Auth             from './pages/Auth';
import DoctorListing    from './pages/patient/DoctorListing';
import DoctorProfile    from './pages/patient/DoctorProfile';
import PatientProfile   from './pages/patient/PatientProfile';
import DoctorProfilePage from './pages/doctor/DoctorProfilePage';
import DoctorBookings   from './pages/doctor/DoctorBookings';

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/auth"         element={<Auth />} />
        <Route path="/"             element={<DoctorListing />} />
        <Route path="/doctor/:id"   element={<DoctorProfile />} />

        {/* Patient protected */}
        <Route path="/profile" element={
          <PrivateRoute role="patient"><PatientProfile /></PrivateRoute>
        }/>

        {/* Doctor protected */}
        <Route path="/doctor/profile" element={
          <PrivateRoute role="doctor"><DoctorProfilePage /></PrivateRoute>
        }/>
        <Route path="/doctor/bookings" element={
          <PrivateRoute role="doctor"><DoctorBookings /></PrivateRoute>
        }/>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '10px',
              fontSize: '14px',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
