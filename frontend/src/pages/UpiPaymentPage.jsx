import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, ShieldCheck, QrCode, AlertCircle, ArrowRight } from 'lucide-react';

const UpiPaymentPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkoutData, setCheckoutData] = useState(null);

  // Form states
  const [upiId, setUpiId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [qrVerified, setQrVerified] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('pending_checkout');
    if (!raw) {
      navigate('/menu');
      return;
    }
    setCheckoutData(JSON.parse(raw));
  }, [navigate]);

  const handleManualUpiSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    if (!upiRegex.test(upiId.trim())) {
      setValidationError('Please enter a valid UPI address format (e.g. mobile@upi or username@okhdfc).');
      return;
    }

    setSubmitting(true);

    try {
      // Simulate API verification call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const paymentDetails = {
        upi_id: upiId.trim(),
        gateway: 'razorpay_sandbox'
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
          payment_method: 'UPI',
          payment_status: 'paid',
          payment_details: paymentDetails,
          items: checkoutData.items,
          discount: checkoutData.discount,
          grand_total: checkoutData.grand_total
        })
      });

      if (res.ok) {
        const order = await res.json();
        sessionStorage.removeItem('pending_checkout');
        localStorage.removeItem('cart');
        navigate(`/confirmation?orderId=${order.id}&time=${order.estimated_delivery_time}`);
      } else {
        const errData = await res.json();
        setValidationError(errData.message || 'UPI request declined. Try again.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Error placing UPI order:', err);
      setValidationError('Connection error. Could not reach servers.');
      setSubmitting(false);
    }
  };

  const handleQrCodeVerify = async () => {
    setValidationError('');
    setSubmitting(true);

    try {
      // Simulate scanning check
      await new Promise(resolve => setTimeout(resolve, 2500));

      const paymentDetails = {
        scan_to_pay: 'dynamic_qr_code',
        gateway: 'razorpay_sandbox'
      };

      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          address_id: checkoutData.address_id,
          payment_method: 'UPI',
          payment_status: 'paid',
          payment_details: paymentDetails,
          items: checkoutData.items,
          discount: checkoutData.discount,
          grand_total: checkoutData.grand_total
        })
      });

      if (res.ok) {
        const order = await res.json();
        sessionStorage.removeItem('pending_checkout');
        localStorage.removeItem('cart');
        navigate(`/confirmation?orderId=${order.id}&time=${order.estimated_delivery_time}`);
      } else {
        setValidationError('Scan validation failed. Make sure your payment went through.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Error placing QR code order:', err);
      setValidationError('Connection error.');
      setSubmitting(false);
    }
  };

  if (!checkoutData) return null;

  return (
    <div className="min-h-[85vh] bg-dark-bg text-dark-text py-12 px-6 flex items-center justify-center relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-brand/5 rounded-full blur-[130px] pointer-events-none" />
      
      <div className="w-full max-w-lg bg-dark-card border border-dark-border rounded-3xl p-8 shadow-2xl relative z-10 grid grid-cols-1 gap-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-dark-border">
          <div>
            <h2 className="text-2xl font-bold text-white">UPI Portal</h2>
            <p className="text-xs text-dark-muted mt-1">Unified Payments Interface (Sandbox)</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Amount Due</p>
            <p className="text-xl font-black text-brand">₹{checkoutData.grand_total}</p>
          </div>
        </div>

        {validationError && (
          <div className="bg-nonveg/10 border border-nonveg/30 text-nonveg text-sm p-4 rounded-xl">
            {validationError}
          </div>
        )}

        {/* QR Section */}
        <div className="bg-dark-bg border border-dark-border p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center space-x-2">
            <QrCode size={18} className="text-brand" />
            <span>Scan QR Code to Pay</span>
          </h3>

          {/* Clean Vector QR Code Simulation */}
          <div className="bg-white p-4 rounded-2xl inline-block mb-4 relative group">
            <div className="w-40 h-40 bg-neutral-100 flex items-center justify-center border border-neutral-300 relative overflow-hidden">
              {/* Fake QR pattern using subgrids */}
              <div className="grid grid-cols-4 gap-1.5 p-1 w-full h-full">
                {[...Array(16)].map((_, idx) => {
                  const isBlack = (idx * 7 + 3) % 2 === 0 || idx === 0 || idx === 3 || idx === 12;
                  return (
                    <div 
                      key={idx} 
                      className={`rounded ${isBlack ? 'bg-neutral-900' : 'bg-white'}`} 
                    />
                  );
                })}
              </div>
              {/* Dynamic QR Scan HUD overlay */}
              <div className="absolute inset-0 border-2 border-brand/50 flex items-center justify-center animate-pulse">
                <span className="w-32 h-[2px] bg-brand/80 absolute top-1/2 left-0 transform -translate-y-1/2 shadow-lg shadow-brand animate-pulse" />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-dark-muted max-w-xs mb-5">Open GPay, PhonePe, or Paytm and scan the QR code above to pay instantly</p>
          
          <button
            onClick={handleQrCodeVerify}
            disabled={submitting}
            className="w-full bg-brand hover:bg-brand-gold disabled:opacity-50 text-neutral-950 font-bold py-3 rounded-xl transition text-xs flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <span>Verifying Scan Transaction...</span>
            ) : (
              <span>I Have Scanned and Paid</span>
            )}
          </button>
        </div>

        {/* Split separator */}
        <div className="flex items-center justify-between text-dark-muted text-xs">
          <span className="h-[1px] bg-dark-border flex-1 mr-4" />
          <span>OR PAY MANUALLY</span>
          <span className="h-[1px] bg-dark-border flex-1 ml-4" />
        </div>

        {/* Manual VPA Entry */}
        <form onSubmit={handleManualUpiSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-dark-muted">Enter UPI Address / VPA</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-dark-muted">
                <Wallet size={18} />
              </span>
              <input
                type="text"
                required
                disabled={submitting}
                className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-dark-muted outline-none transition"
                placeholder="username@okhdfc"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-neutral-900 border border-neutral-800 hover:border-brand text-brand hover:text-white font-bold py-3.5 rounded-xl transition text-xs flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <span>Requesting UPI approval...</span>
            ) : (
              <>
                <span>Submit UPI Request</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Security Alert info */}
        <div className="flex items-center space-x-2.5 bg-neutral-900 border border-neutral-800 p-4 rounded-xl text-xs text-dark-muted">
          <ShieldCheck size={18} className="text-brand shrink-0" />
          <span>Unified Payments Interface verification mode is in sandbox testing.</span>
        </div>

      </div>
    </div>
  );
};

export default UpiPaymentPage;
