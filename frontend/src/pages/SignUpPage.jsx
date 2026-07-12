import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, UserPlus } from 'lucide-react';

const SignUpPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signup(name, email, phone, password);
      navigate('/menu');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-dark-bg text-dark-text px-6 py-12 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[140px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-dark-card border border-dark-border rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white mb-2">Create Account</h2>
          <p className="text-sm text-dark-muted">Sign up to order hot and authentic Indian meals</p>
        </div>

        {error && (
          <div className="bg-nonveg/10 border border-nonveg/30 text-nonveg text-sm p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-dark-muted">
                <User size={18} />
              </span>
              <input
                type="text"
                required
                className="w-full bg-dark-bg border border-dark-border focus:border-brand/60 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-dark-muted outline-none transition"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-dark-muted">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                className="w-full bg-dark-bg border border-dark-border focus:border-brand/60 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-dark-muted outline-none transition"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Phone Number</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-dark-muted">
                <Phone size={18} />
              </span>
              <input
                type="tel"
                required
                className="w-full bg-dark-bg border border-dark-border focus:border-brand/60 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-dark-muted outline-none transition"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-dark-muted">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                className="w-full bg-dark-bg border border-dark-border focus:border-brand/60 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-dark-muted outline-none transition"
                placeholder="Min 6 characters"
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
            <span>{submitting ? 'Registering...' : 'Register'}</span>
            {!submitting && <UserPlus size={18} />}
          </button>
        </form>

        <div className="text-center mt-8 pt-6 border-t border-dark-border text-sm text-dark-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-brand hover:underline font-bold">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
