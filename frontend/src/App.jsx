import React from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';

// Import Pages
import LandingPage from './pages/LandingPage';
import MenuPage from './pages/MenuPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CheckoutPage from './pages/CheckoutPage';
import CardPaymentPage from './pages/CardPaymentPage';
import UpiPaymentPage from './pages/UpiPaymentPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import { TermsOfService, PrivacyPolicy, RefundPolicy } from './pages/LegalPages';

// Icons
import { ShoppingBag, User, LogOut, Coffee } from 'lucide-react';

const NavigationBar = () => {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const location = useLocation();

  // Hide nav on admin dashboard pages to save sidebar screen real estate
  if (location.pathname.startsWith('/admin/dashboard')) return null;

  return (
    <nav className="bg-dark-card border-b border-dark-border text-dark-text sticky top-0 z-50 backdrop-blur-md bg-dark-card/90">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-2 text-xl font-black text-white tracking-wider">
          <Coffee size={24} className="text-brand" />
          <span className="text-brand">THE</span>
          <span>MODEST</span>
        </Link>

        {/* Links */}
        <div className="flex items-center space-x-6 text-xs font-bold uppercase tracking-wider">
          <Link to="/" className="hover:text-brand transition">Home</Link>
          <Link to="/menu" className="hover:text-brand transition">Menu</Link>
          
          {user?.role === 'customer' ? (
            <>
              <button 
                onClick={logout} 
                className="hover:text-brand transition flex items-center space-x-1"
                title="Sign Out"
              >
                <span>Logout</span>
                <LogOut size={14} />
              </button>
              <div className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-300 px-3 py-1.5 rounded-lg flex items-center space-x-1 font-semibold">
                <User size={12} className="text-brand" />
                <span>Hi, {user.name.split(' ')[0]}</span>
              </div>
            </>
          ) : user && user.role !== 'customer' ? (
            <Link to="/admin/dashboard" className="text-brand border border-brand/20 hover:border-brand/40 px-3 py-1.5 rounded-lg transition bg-brand/5">
              Dashboard
            </Link>
          ) : (
            <Link to="/login" className="hover:text-brand transition">Sign In</Link>
          )}

          {/* Cart Icon */}
          <Link to="/checkout" className="relative p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-brand/40 text-white transition">
            <ShoppingBag size={16} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-brand text-neutral-950 text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {cartCount}
              </span>
            )}
          </Link>
        </div>

      </div>
    </nav>
  );
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-dark-bg flex flex-col">
            <NavigationBar />
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/payment/card" element={<CardPaymentPage />} />
                <Route path="/payment/upi" element={<UpiPaymentPage />} />
                <Route path="/confirmation" element={<OrderConfirmationPage />} />
                <Route path="/track" element={<OrderTrackingPage />} />
                
                {/* Admin/Staff portal routes */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />

                {/* Legal compliance policy pages */}
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/refunds" element={<RefundPolicy />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
