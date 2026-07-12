import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect to menu or checkout if specified
  const from = location.state?.from?.pathname || '/menu';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-dark-bg text-dark-text px-6 py-12 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[140px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-dark-card border border-dark-border rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white mb-2">Welcome Back</h2>
          <p className="text-sm text-dark-muted">Log in to your customer account to place orders</p>
        </div>

        {error && (
          <div className="bg-nonveg/10 border border-nonveg/30 text-nonveg text-sm p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-dark-muted">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                className="w-full bg-dark-bg border border-dark-border focus:border-brand/60 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-dark-muted outline-none transition"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Password</label>
              <Link to="/reset-password" className="text-xs text-brand hover:underline font-semibold">Forgot Password?</Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-dark-muted">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                className="w-full bg-dark-bg border border-dark-border focus:border-brand/60 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-dark-muted outline-none transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center space-x-2 bg-brand hover:bg-brand-gold disabled:opacity-50 text-neutral-950 font-bold py-4 rounded-xl transition duration-300 shadow-lg shadow-brand/10"
          >
            <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
            {!submitting && <LogIn size={18} />}
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-dark-border text-sm text-dark-muted">
          New to The Modest Restaurant?{' '}
          <Link to="/signup" className="text-brand hover:underline font-bold">Create an account</Link>
        </div>

        <div className="text-center mt-4">
          <Link to="/admin/login" className="text-xs text-dark-muted hover:text-white transition underline">
            Go to Staff Portal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
