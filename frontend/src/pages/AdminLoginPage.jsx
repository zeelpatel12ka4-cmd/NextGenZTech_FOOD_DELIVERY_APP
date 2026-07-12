import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ShieldAlert } from 'lucide-react';

const AdminLoginPage = () => {
  const { staffLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await staffLogin(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Staff login failed. Access Denied.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-dark-bg text-dark-text px-6 py-12 relative">
      {/* Red ambient warning glow for admin portal */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[140px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-dark-card border border-red-900/30 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-red-950/50 border border-red-900/40 text-red-500 mb-4">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2">Staff Gateway</h2>
          <p className="text-sm text-dark-muted">Access reserved for admins, managers, and kitchen crew</p>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-900/40 text-red-400 text-sm p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Staff Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-dark-muted">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                className="w-full bg-dark-bg border border-dark-border focus:border-red-500/60 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-dark-muted outline-none transition"
                placeholder="manager@modest.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Access Key (Password)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-dark-muted">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                className="w-full bg-dark-bg border border-dark-border focus:border-red-500/60 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-dark-muted outline-none transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition duration-300 shadow-lg shadow-red-950/40"
          >
            <span>{submitting ? 'Authenticating...' : 'Enter Dashboard'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
