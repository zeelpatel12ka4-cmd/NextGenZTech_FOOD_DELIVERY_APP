import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Lock, ShieldCheck, HelpCircle } from 'lucide-react';

const CardPaymentPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkoutData, setCheckoutData] = useState(null);

  // Form states
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('pending_checkout');
    if (!raw) {
      navigate('/menu');
      return;
    }
    setCheckoutData(JSON.parse(raw));
  }, [navigate]);

  // Basic Luhn algorithm approximation or digit length checks for card verification
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // keep only numbers
    if (value.length > 16) value = value.slice(0, 16);
    // Format card number with spaces (e.g. 4444 4444 4444 4444)
    const matches = value.match(/\d{1,4}/g);
    setCardNumber(matches ? matches.join(' ') : '');
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      setExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
    } else {
      setExpiry(value);
    }
  };

  const handleCvvChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) value = value.slice(0, 3);
    setCvv(value);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    
    const numDigits = cardNumber.replace(/\s/g, '');
    if (numDigits.length !== 16) {
      setValidationError('Please enter a valid 16-digit card number.');
      return;
    }

    if (expiry.length !== 5) {
      setValidationError('Please specify card expiry date as MM/YY.');
      return;
    }

    if (cvv.length !== 3) {
      setValidationError('Please specify a valid 3-digit CVV key.');
      return;
    }

    if (name.trim().length < 3) {
      setValidationError('Please enter the full name of the cardholder.');
      return;
    }

    setSubmitting(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const paymentDetails = {
        card_holder: name,
        card_mask: `•••• •••• •••• ${numDigits.slice(-4)}`,
        gateway: 'stripe_sandbox'
      };

      // Submit checkout details to DB
      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          address_id: checkoutData.address_id,
          payment_method: 'Card',
          payment_status: 'paid',
          payment_details: paymentDetails,
          items: checkoutData.items,
          discount: checkoutData.discount,
          grand_total: checkoutData.grand_total
        })
      });

      if (res.ok) {
        const order = await res.json();
        // Clear carts
        sessionStorage.removeItem('pending_checkout');
        localStorage.removeItem('cart');
        navigate(`/confirmation?orderId=${order.id}&time=${order.estimated_delivery_time}`);
      } else {
        const errData = await res.json();
        setValidationError(errData.message || 'Payment processing failed. Try again.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Error placing card order:', err);
      setValidationError('Connection error. Could not reach servers.');
      setSubmitting(false);
    }
  };

  if (!checkoutData) return null;

  return (
    <div className="min-h-[85vh] bg-dark-bg text-dark-text py-12 px-6 flex items-center justify-center relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-brand/5 rounded-full blur-[130px] pointer-events-none" />
      
      <div className="w-full max-w-lg bg-dark-card border border-dark-border rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-dark-border">
          <div>
            <h2 className="text-2xl font-bold text-white">Payment Gateway</h2>
            <p className="text-xs text-dark-muted mt-1">PCI-DSS Compliant Secure Encrypted sandbox</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Amount Due</p>
            <p className="text-xl font-black text-brand">₹{checkoutData.grand_total}</p>
          </div>
        </div>

        {validationError && (
          <div className="bg-nonveg/10 border border-nonveg/30 text-nonveg text-sm p-4 rounded-xl mb-6">
            {validationError}
          </div>
        )}

        {/* Card Mockup Graphic */}
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 p-6 rounded-2xl mb-8 relative shadow-lg overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand/10 rounded-full blur-2xl group-hover:bg-brand/15 transition duration-500" />
          <div className="flex justify-between items-start mb-10">
            <CreditCard size={32} className="text-brand" />
            <span className="text-xs font-black italic text-dark-muted tracking-widest uppercase">SandBox Card</span>
          </div>
          
          <div className="space-y-4">
            <p className="text-xl font-semibold font-mono tracking-widest text-white">
              {cardNumber || '•••• •••• •••• ••••'}
            </p>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[8px] text-dark-muted font-bold uppercase tracking-wider">Card Holder</p>
                <p className="text-xs font-bold text-neutral-200 tracking-wide uppercase line-clamp-1">
                  {name || 'YOUR FULL NAME'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-dark-muted font-bold uppercase tracking-wider">Expires</p>
                <p className="text-xs font-bold text-neutral-200 font-mono">
                  {expiry || 'MM/YY'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Form */}
        <form onSubmit={handlePaymentSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-dark-muted">Cardholder Name</label>
            <input
              type="text"
              required
              disabled={submitting}
              className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-sm text-white placeholder-dark-muted outline-none transition uppercase"
              placeholder="e.g. AARAV MEHTA"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-dark-muted">Card Number</label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={submitting}
                className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-sm text-white placeholder-dark-muted outline-none transition font-mono tracking-widest"
                placeholder="4532 9812 3423 9810"
                value={cardNumber}
                onChange={handleCardNumberChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-dark-muted">Expiry (MM/YY)</label>
              <input
                type="text"
                required
                disabled={submitting}
                className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-sm text-white placeholder-dark-muted outline-none transition font-mono"
                placeholder="12/28"
                value={expiry}
                onChange={handleExpiryChange}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-dark-muted flex items-center justify-between">
                <span>CVV</span>
                <HelpCircle size={12} className="text-dark-muted cursor-help" title="3 digit code behind your card" />
              </label>
              <input
                type="password"
                required
                disabled={submitting}
                className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-sm text-white placeholder-dark-muted outline-none transition font-mono"
                placeholder="•••"
                value={cvv}
                onChange={handleCvvChange}
              />
            </div>
          </div>

          {/* Secure details */}
          <div className="flex items-center space-x-2.5 bg-neutral-900 border border-neutral-800 p-4 rounded-xl text-xs text-dark-muted">
            <ShieldCheck size={18} className="text-brand shrink-0" />
            <span>Encrypted sandbox transaction. No real money will be charged from your account.</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand hover:bg-brand-gold disabled:opacity-50 text-neutral-950 font-bold py-4 rounded-xl transition duration-300 shadow-lg shadow-brand/10 text-sm flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <span>Authorizing Transaction...</span>
            ) : (
              <>
                <Lock size={16} />
                <span>Verify & Pay ₹{checkoutData.grand_total}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CardPaymentPage;
