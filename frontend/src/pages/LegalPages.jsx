import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, RefreshCcw } from 'lucide-react';

const CardWrapper = ({ children, title, icon: Icon }) => (
  <div className="bg-dark-card border border-dark-border rounded-3xl p-8 max-w-3xl mx-auto shadow-2xl relative">
    <div className="absolute top-6 right-6 w-32 h-32 bg-brand/5 rounded-full blur-2xl pointer-events-none" />
    <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-dark-border">
      <div className="p-2.5 rounded-xl bg-brand/10 border border-brand/20 text-brand">
        <Icon size={22} />
      </div>
      <h1 className="text-2xl font-extrabold text-white">{title}</h1>
    </div>
    <div className="space-y-6 text-sm text-dark-muted leading-relaxed">
      {children}
    </div>
    <div className="mt-8 pt-6 border-t border-dark-border text-center">
      <Link to="/" className="inline-flex items-center space-x-1.5 text-brand hover:text-brand-gold font-bold text-xs transition">
        <ArrowLeft size={14} />
        <span>Return to Home</span>
      </Link>
    </div>
  </div>
);

export const TermsOfService = () => (
  <div className="min-h-screen bg-dark-bg text-dark-text py-16 px-6">
    <CardWrapper title="Terms of Service" icon={FileText}>
      <p>Welcome to **The Modest Restaurant**. By accessing or ordering through our website, you agree to comply with and be bound by the following terms and conditions.</p>
      
      <div>
        <h3 className="text-white font-bold mb-1.5 text-sm uppercase tracking-wider">1. Ordering & Contract</h3>
        <p>All orders placed through our website are subject to acceptance by the restaurant. The order contract is finalized once we accept the payment and send a confirmation.</p>
      </div>

      <div>
        <h3 className="text-white font-bold mb-1.5 text-sm uppercase tracking-wider">2. Pricing & Delivery</h3>
        <p>Prices listed are inclusive of packaging fees but exclude delivery fees and GST (which are shown in the invoice checkout summary). Delivery estimates are approximations subject to local traffic and weather conditions.</p>
      </div>

      <div>
        <h3 className="text-white font-bold mb-1.5 text-sm uppercase tracking-wider">3. FSSAI & Food Sourcing</h3>
        <p>All food preparations comply with government safety rules in India under FSSAI license requirements. Customers with severe nut or dairy allergies must contact staff directly prior to ordering.</p>
      </div>
    </CardWrapper>
  </div>
);

export const PrivacyPolicy = () => (
  <div className="min-h-screen bg-dark-bg text-dark-text py-16 px-6">
    <CardWrapper title="Privacy Policy" icon={ShieldCheck}>
      <p>At **The Modest Restaurant**, we prioritize your privacy. This policy outlines how we gather, process, and secure user data.</p>
      
      <div>
        <h3 className="text-white font-bold mb-1.5 text-sm uppercase tracking-wider">1. Information Gathered</h3>
        <p>We collect your name, email, phone number, and delivery addresses during signup/checkout to handle order deliveries and transactions.</p>
      </div>

      <div>
        <h3 className="text-white font-bold mb-1.5 text-sm uppercase tracking-wider">2. Cookie Policy</h3>
        <p>We use httpOnly, secure, Lax cookies to handle authentication sessions. Cookies cannot be accessed by client-side Javascript, protecting you against XSS theft.</p>
      </div>

      <div>
        <h3 className="text-white font-bold mb-1.5 text-sm uppercase tracking-wider">3. Payment Security</h3>
        <p>We do not store card details or CVVs. All checkout processing happens through our secure payment gateway partner, Razorpay, which is fully PCI-DSS compliant.</p>
      </div>
    </CardWrapper>
  </div>
);

export const RefundPolicy = () => (
  <div className="min-h-screen bg-dark-bg text-dark-text py-16 px-6">
    <CardWrapper title="Refund & Cancellation" icon={RefreshCcw}>
      <p>Thank you for choosing **The Modest Restaurant**. Our refund and cancellation terms are outlined below.</p>
      
      <div>
        <h3 className="text-white font-bold mb-1.5 text-sm uppercase tracking-wider">1. Cancellation Terms</h3>
        <p>Customers can cancel their order free of charge before the restaurant begins food preparation. Once marked as "dispatched" or "out for delivery," cancellations are no longer permitted.</p>
      </div>

      <div>
        <h3 className="text-white font-bold mb-1.5 text-sm uppercase tracking-wider">2. Refunds Flow</h3>
        <p>If an order is cancelled prior to preparation, a refund will be initiated immediately. Online transactions (Cards, UPI) are settled directly via Razorpay and may take 5–7 business days to reflect in your bank account.</p>
      </div>

      <div>
        <h3 className="text-white font-bold mb-1.5 text-sm uppercase tracking-wider">3. Damaged or Missing Items</h3>
        <p>In case of missing food items, please contact us within 1 hour of delivery. A coupon refund or replacement will be arranged after verification.</p>
      </div>
    </CardWrapper>
  </div>
);
