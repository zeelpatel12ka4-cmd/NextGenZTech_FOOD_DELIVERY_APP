import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

const ResetPasswordPage = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const msg = await resetPassword(email, newPassword);
      setSuccessMsg(msg || 'Password updated successfully!');
    } catch (err) {
      setError(err.message || 'Error resetting password. Make sure the email exists.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-dark-bg text-dark-text px-6 py-12 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[140px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-dark-card border border-dark-border rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white mb-2">Reset Password</h2>
          <p className="text-sm text-dark-muted">Verify your registered email and specify a new access key</p>
        </div>

        {error && (
          <div className="bg-nonveg/10 border border-nonveg/30 text-nonveg text-sm p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {successMsg ? (
          <div className="text-center py-6 space-y-6">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-veg/10 border border-veg/30 text-veg">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Password Updated</h3>
              <p className="text-sm text-dark-muted">{successMsg}</p>
            </div>
            <Link 
              to="/login"
              className="w-full inline-flex items-center justify-center space-x-2 bg-brand hover:bg-brand-gold text-neutral-950 font-bold py-4 rounded-xl transition duration-300 shadow-lg shadow-brand/10"
            >
              <span>Go to Sign In</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
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
                  placeholder="your-email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-dark-muted">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-dark-muted">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  required
                  className="w-full bg-dark-bg border border-dark-border focus:border-brand/60 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-dark-muted outline-none transition"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand hover:bg-brand-gold disabled:opacity-50 text-neutral-950 font-bold py-4 rounded-xl transition duration-300 shadow-lg"
            >
              {submitting ? 'Resetting Password...' : 'Reset Password'}
            </button>
            
            <div className="text-center text-sm">
              <Link to="/login" className="text-dark-muted hover:text-white transition">Cancel and return</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
