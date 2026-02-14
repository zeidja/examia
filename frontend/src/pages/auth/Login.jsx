import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
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
        <h2 className="text-2xl font-bold tracking-tight text-examia-dark">Sign in</h2>
        <p className="text-examia-mid mt-1.5 text-sm">Enter your credentials to access Examia.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 text-red-700 text-sm font-medium" role="alert">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold text-examia-dark">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-auth"
            placeholder="you@school.com"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold text-examia-dark">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-auth"
            placeholder="••••••••"
          />
        </div>
        <div className="flex items-center justify-end">
          <Link to="/forgot-password" className="text-sm text-examia-mid hover:text-examia-dark font-medium transition">
            Forgot password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-auth-primary"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-8 text-center text-examia-mid text-sm border-t border-examia-soft/30 pt-6">
        No signup — your school admin or Super Admin creates your account.
      </p>
    </motion.div>
  );
}
