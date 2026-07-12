import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, ArrowRight, ShoppingBag } from 'lucide-react';

const OrderConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || '98741';
  const deliveryTime = searchParams.get('time') || '35';

  return (
    <div className="min-h-[85vh] bg-dark-bg text-dark-text py-12 px-6 flex items-center justify-center relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-brand/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg bg-dark-card border border-dark-border rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6">
        
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-veg/10 border border-veg/30 text-veg animate-pulse">
          <CheckCircle2 size={48} />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-white">Order Confirmed!</h2>
          <p className="text-sm text-dark-muted">Thank you for dining with The Modest Restaurant.</p>
        </div>

        {/* Details Card */}
        <div className="bg-dark-bg border border-dark-border rounded-2xl p-5 divide-y divide-dark-border text-sm space-y-4">
          <div className="flex justify-between items-center pb-3">
            <span className="text-dark-muted font-bold">Order Reference</span>
            <span className="text-white font-mono font-bold">#ORD{orderId}</span>
          </div>

          <div className="flex justify-between items-center pt-3 pb-3">
            <span className="text-dark-muted font-bold flex items-center space-x-1.5">
              <Clock size={16} className="text-brand" />
              <span>Est. Delivery</span>
            </span>
            <span className="text-white font-bold">{deliveryTime} Minutes</span>
          </div>

          <div className="flex justify-between items-start pt-3">
            <span className="text-dark-muted font-bold flex items-center space-x-1.5">
              <MapPin size={16} className="text-brand" />
              <span>Delivery Partner</span>
            </span>
            <span className="text-white text-right max-w-[60%] font-bold">
              Assigned upon dispatch
            </span>
          </div>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col gap-3 pt-4">
          <Link 
            to={`/track?orderId=${orderId}`}
            className="w-full bg-brand hover:bg-brand-gold text-neutral-950 font-black py-4 rounded-xl transition duration-300 shadow-lg shadow-brand/10 text-sm flex items-center justify-center space-x-2"
          >
            <span>Track Your Order Live</span>
            <ArrowRight size={18} />
          </Link>
          
          <Link 
            to="/menu"
            className="w-full bg-neutral-900 border border-neutral-800 hover:border-brand/40 text-white font-semibold py-4 rounded-xl transition text-sm flex items-center justify-center space-x-2"
          >
            <ShoppingBag size={16} />
            <span>Order Something Else</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default OrderConfirmationPage;
