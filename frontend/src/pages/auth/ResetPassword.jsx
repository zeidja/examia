import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';

export function ResetPassword() {
  const location = useLocation();
  const emailFromState = location.state?.email || '';
  const [email, setEmail] = useState(emailFromState);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      navigate('/login', { state: { message: 'Password reset. Sign in with your new password.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-examia-dark">New password</h2>
        <p className="text-examia-mid mt-1.5 text-sm">Enter the OTP from your email and choose a new password.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 text-red-700 text-sm font-medium" role="alert">{error}</div>
        )}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-examia-dark">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-auth" placeholder="you@school.com" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-examia-dark">OTP (6 digits)</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            className="input-auth font-mono text-lg tracking-[0.35em] text-center"
            placeholder="000000"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-examia-dark">New password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="input-auth" placeholder="Min 6 characters" />
        </div>
        <button type="submit" disabled={loading} className="btn-auth-primary">
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
      <p className="mt-8 text-center text-examia-mid text-sm border-t border-examia-soft/30 pt-6">
        <Link to="/login" className="font-medium hover:text-examia-dark transition">Back to sign in</Link>
      </p>
    </motion.div>
  );
}
