import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
      setTimeout(() => navigate('/reset-password', { state: { email } }), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8"
      >
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-examia-soft/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-examia-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-examia-dark mb-2">Check your email</h2>
        <p className="text-examia-mid text-sm">We sent a 6-digit OTP. Redirecting to reset…</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-examia-dark">Reset password</h2>
        <p className="text-examia-mid mt-1.5 text-sm">Enter your email and we'll send you a one-time code.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 text-red-700 text-sm font-medium" role="alert">{error}</div>
        )}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold text-examia-dark">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-auth" placeholder="you@school.com" />
        </div>
        <button type="submit" disabled={loading} className="btn-auth-primary">
          {loading ? 'Sending…' : 'Send OTP'}
        </button>
      </form>
      <p className="mt-8 text-center text-examia-mid text-sm border-t border-examia-soft/30 pt-6">
        <Link to="/login" className="font-medium hover:text-examia-dark transition">Back to sign in</Link>
      </p>
    </motion.div>
  );
}
