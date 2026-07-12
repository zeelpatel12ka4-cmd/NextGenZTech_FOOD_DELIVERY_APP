import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { MapPin, Plus, Trash2, Tag, ShoppingCart, CreditCard, Wallet, Landmark, ChevronRight } from 'lucide-react';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    cart, 
    cartCount, 
    cartSubtotal, 
    cartTax, 
    cartDeliveryFee, 
    cartGrandTotal, 
    discount, 
    couponCode, 
    addToCart, 
    removeFromCart, 
    applyCoupon, 
    removeCoupon,
    clearCart 
  } = useCart();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  
  // New address form state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Payment option: 'Card' | 'UPI' | 'COD'
  const [paymentMethod, setPaymentMethod] = useState('Card');
  
  // Coupon input
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Address fetch triggers
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }

    const fetchAddresses = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/orders/addresses', {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setAddresses(data);
          // Auto select default address
          const def = data.find(addr => addr.is_default);
          if (def) {
            setSelectedAddressId(def.id);
          } else if (data.length > 0) {
            setSelectedAddressId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching addresses:', err);
      }
    };

    fetchAddresses();
  }, [authLoading, user, navigate]);

  // Handle adding new address
  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/orders/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          address_line: addressLine,
          city,
          state,
          postal_code: postalCode,
          is_default: addresses.length === 0 ? 1 : 0
        })
      });
      if (res.ok) {
        const newAddr = await res.json();
        setAddresses(prev => [newAddr, ...prev]);
        setSelectedAddressId(newAddr.id);
        setShowAddAddress(false);
        setAddressLine('');
        setCity('');
        setState('');
        setPostalCode('');
      }
    } catch (err) {
      console.error('Error adding address:', err);
    }
  };

  // Coupons
  const handleApplyCoupon = () => {
    setCouponError('');
    setCouponSuccess('');
    const res = applyCoupon(couponInput);
    if (res.success) {
      setCouponSuccess(res.message);
      setCouponInput('');
    } else {
      setCouponError(res.message);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponSuccess('');
  };

  // Upsell Suggestions: items that are NOT in cart
  const upsellCatalog = [
    { id: 11, name: 'Garlic Naan', price: 80, is_veg: true, description: 'Soft Naan infused with minced garlic and butter.' },
    { id: 13, name: 'Gulab Jamun', price: 100, is_veg: true, description: 'Golden fried milk balls in cardamom syrup.' },
    { id: 16, name: 'Mango Lassi', price: 90, is_veg: true, description: 'Chilled creamy yogurt blended with mango.' }
  ];

  const suggestedItems = upsellCatalog.filter(
    item => !cart.some(cartItem => cartItem.id === item.id)
  );

  // Helper to load Razorpay SDK dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle checkout process
  const handleProceedToPayment = async () => {
    if (!selectedAddressId) {
      alert('Please select or add a delivery address.');
      return;
    }

    setSubmitting(true);
    setValidationError('');

    try {
      // 1. Submit the pending order to DB first
      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          address_id: selectedAddressId,
          payment_method: paymentMethod,
          payment_status: 'pending',
          items: cart,
          discount,
          grand_total: paymentMethod === 'COD' ? cartGrandTotal + 10 : cartGrandTotal
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to place order.');
      }

      const orderData = await res.json(); // { id, grand_total }

      if (paymentMethod === 'COD') {
        // Direct checkout for Cash on Delivery
        clearCart();
        navigate(`/confirmation?orderId=${orderData.id}&time=35`);
        return;
      }

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
      }

      // 3. Request Razorpay order ID from backend
      const rpRes = await fetch('http://localhost:5000/api/payments/razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.id,
          amount: paymentMethod === 'COD' ? cartGrandTotal + 10 : cartGrandTotal
        })
      });

      if (!rpRes.ok) {
        const errData = await rpRes.json();
        throw new Error(errData.message || 'Razorpay Order ID compilation failed.');
      }

      const rpOrder = await rpRes.json(); // { id, amount }

      // 4. Open Razorpay Checkout popup
      const options = {
        key: 'rzp_test_TCZDA82xLofmcJ', // User sandbox API key
        amount: rpOrder.amount,
        currency: 'INR',
        name: 'The Modest Restaurant',
        description: `Food Order Payment - #ORD${orderData.id.slice(-5)}`,
        order_id: rpOrder.id,
        handler: async function (response) {
          try {
            const verifyRes = await fetch('http://localhost:5000/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: orderData.id
              })
            });

            if (verifyRes.ok) {
              clearCart();
              navigate(`/confirmation?orderId=${orderData.id}&time=35`);
            } else {
              const verifyErr = await verifyRes.json();
              setValidationError(verifyErr.message || 'Payment signature verification failed.');
            }
          } catch (err) {
            console.error('Signature verification failed:', err);
            setValidationError('Connection error confirming signature.');
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: {
          color: '#C5A880'
        }
      };

      const rzp1 = new window.Razorpay(options);
      
      rzp1.on('payment.failed', function (response) {
        setValidationError(response.error.description || 'Payment transaction failed.');
      });

      rzp1.open();
    } catch (err) {
      console.error('Checkout error:', err);
      setValidationError(err.message || 'Checkout placement failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cartCount === 0) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-dark-bg text-dark-text p-6">
        <ShoppingCart size={64} className="text-dark-muted mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-white mb-2">Your Cart is Empty</h2>
        <p className="text-sm text-dark-muted mb-8">Add some mouthwatering Indian delicacies to get started.</p>
        <button
          onClick={() => navigate('/menu')}
          className="bg-brand hover:bg-brand-gold text-neutral-950 font-bold px-8 py-3.5 rounded-xl transition"
        >
          Go to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text py-12">
      <div className="container mx-auto px-6 max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Address, Upsell, Payments */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Address Section */}
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <MapPin size={22} className="text-brand" />
                <span>Delivery Address</span>
              </h2>
              {!showAddAddress && (
                <button
                  onClick={() => setShowAddAddress(true)}
                  className="text-xs text-brand hover:underline font-bold flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Add New</span>
                </button>
              )}
            </div>

            {showAddAddress ? (
              <form onSubmit={handleAddAddress} className="space-y-4 bg-dark-bg border border-dark-border p-5 rounded-2xl animate-fade-in">
                <div className="space-y-1">
                  <label className="text-xs text-dark-muted uppercase font-bold">Address Line</label>
                  <input
                    type="text"
                    required
                    placeholder="Flat 102, Building Name, Street..."
                    className="w-full bg-dark-card border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-white outline-none text-sm transition"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-dark-muted uppercase font-bold">City</label>
                    <input
                      type="text"
                      required
                      placeholder="Mumbai"
                      className="w-full bg-dark-card border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-white outline-none text-sm transition"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-dark-muted uppercase font-bold">State</label>
                    <input
                      type="text"
                      required
                      placeholder="MH"
                      className="w-full bg-dark-card border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-white outline-none text-sm transition"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-dark-muted uppercase font-bold">Pincode</label>
                    <input
                      type="text"
                      required
                      placeholder="400053"
                      className="w-full bg-dark-card border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-white outline-none text-sm transition"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(false)}
                    className="flex-1 bg-dark-card border border-dark-border hover:border-dark-muted py-3 rounded-xl font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-brand hover:bg-brand-gold text-neutral-950 py-3 rounded-xl font-bold text-xs transition"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            ) : addresses.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-dark-border rounded-2xl">
                <p className="text-sm text-dark-muted mb-4">No delivery addresses saved yet.</p>
                <button
                  onClick={() => setShowAddAddress(true)}
                  className="bg-neutral-900 border border-neutral-800 text-brand px-5 py-2 rounded-xl text-xs font-bold transition hover:bg-neutral-800"
                >
                  Add Your First Address
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map(addr => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`p-4 border rounded-2xl flex items-start space-x-3 cursor-pointer transition ${
                      selectedAddressId === addr.id
                        ? 'border-brand bg-brand/5'
                        : 'border-dark-border bg-dark-bg hover:border-dark-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 accent-brand"
                    />
                    <div>
                      <p className="text-sm text-white font-bold">{addr.address_line}</p>
                      <p className="text-xs text-dark-muted mt-0.5">{addr.city}, {addr.state} - {addr.postal_code}</p>
                      {addr.is_default === 1 && (
                        <span className="inline-block mt-2 bg-brand/10 border border-brand/20 text-brand text-[9px] font-black uppercase px-2 py-0.5 rounded">
                          Default Address
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggested Upsell Section */}
          {suggestedItems.length > 0 && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Complete Your Feast</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestedItems.map(item => (
                  <div key={item.id} className="bg-dark-bg border border-dark-border p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{item.name}</h4>
                      <p className="text-xs text-brand font-black mt-1">₹{item.price}</p>
                      <p className="text-[10px] text-dark-muted mt-1.5 line-clamp-2">{item.description}</p>
                    </div>
                    <button
                      onClick={() => addToCart(item, {})}
                      className="mt-4 w-full bg-neutral-900 hover:bg-brand hover:text-neutral-950 text-brand font-bold py-2 rounded-xl text-xs border border-neutral-800 hover:border-brand transition"
                    >
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Options */}
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">Select Payment Mode</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card option */}
              <div
                onClick={() => setPaymentMethod('Card')}
                className={`p-4 border rounded-2xl flex items-center space-x-3 cursor-pointer transition ${
                  paymentMethod === 'Card' ? 'border-brand bg-brand/5' : 'border-dark-border bg-dark-bg hover:border-dark-muted'
                }`}
              >
                <div className={`p-2.5 rounded-xl border ${paymentMethod === 'Card' ? 'bg-brand/10 border-brand/20 text-brand' : 'bg-dark-card border-dark-border text-dark-muted'}`}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Credit/Debit Card</h4>
                  <p className="text-[10px] text-dark-muted">Visa, Mastercard, RuPay</p>
                </div>
              </div>

              {/* UPI option */}
              <div
                onClick={() => setPaymentMethod('UPI')}
                className={`p-4 border rounded-2xl flex items-center space-x-3 cursor-pointer transition ${
                  paymentMethod === 'UPI' ? 'border-brand bg-brand/5' : 'border-dark-border bg-dark-bg hover:border-dark-muted'
                }`}
              >
                <div className={`p-2.5 rounded-xl border ${paymentMethod === 'UPI' ? 'bg-brand/10 border-brand/20 text-brand' : 'bg-dark-card border-dark-border text-dark-muted'}`}>
                  <Wallet size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">UPI Sandbox</h4>
                  <p className="text-[10px] text-dark-muted">GPay, PhonePe, QR scan</p>
                </div>
              </div>

              {/* COD option */}
              <div
                onClick={() => setPaymentMethod('COD')}
                className={`p-4 border rounded-2xl flex items-center space-x-3 cursor-pointer transition ${
                  paymentMethod === 'COD' ? 'border-brand bg-brand/5' : 'border-dark-border bg-dark-bg hover:border-dark-muted'
                }`}
              >
                <div className={`p-2.5 rounded-xl border ${paymentMethod === 'COD' ? 'bg-brand/10 border-brand/20 text-brand' : 'bg-dark-card border-dark-border text-dark-muted'}`}>
                  <Landmark size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Cash on Delivery</h4>
                  <p className="text-[10px] text-dark-muted">Pay on arrival (+₹10 fee)</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Checkout Summary & Total */}
        <div className="space-y-6">
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl sticky top-6">
            <h3 className="text-lg font-bold text-white mb-4">Order Summary</h3>

            {/* Items scroll */}
            <div className="max-h-60 overflow-y-auto divide-y divide-dark-border pr-2 mb-6 scrollbar-thin scrollbar-thumb-dark-border">
              {cart.map(item => (
                <div key={`${item.id}-${JSON.stringify(item.customizations)}`} className="py-3.5 flex items-center justify-between">
                  <div className="max-w-[70%]">
                    <p className="text-sm font-bold text-white leading-tight">{item.name}</p>
                    <p className="text-[10px] text-dark-muted mt-0.5">
                      Qty: {item.quantity} {Object.keys(item.customizations || {}).length > 0 && `| ${Object.values(item.customizations).join(', ')}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">₹{item.price * item.quantity}</p>
                    <button
                      onClick={() => removeFromCart(item.id, item.customizations)}
                      className="text-[10px] text-red-400 hover:text-red-300 transition mt-1 uppercase tracking-wider font-bold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon codes panel */}
            <div className="mb-6 pt-4 border-t border-dark-border">
              {couponCode ? (
                <div className="bg-veg/10 border border-veg/30 text-veg text-xs font-semibold px-4 py-3.5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="uppercase tracking-widest font-black mr-2 bg-veg/20 px-2 py-0.5 rounded text-[10px]">{couponCode}</span>
                    <span>Applied</span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-red-400 hover:text-red-300 transition text-[10px] font-black uppercase">Remove</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Try 'WELCOME100' or 'MODEST50'"
                      className="flex-1 bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-2 px-3 text-xs text-white placeholder-dark-muted outline-none uppercase"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="bg-neutral-900 border border-neutral-800 hover:border-brand text-brand hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-[10px] text-red-400">{couponError}</p>}
                  {couponSuccess && <p className="text-[10px] text-veg font-semibold">{couponSuccess}</p>}
                </div>
              )}
            </div>

            {/* Billing breakdown */}
            <div className="space-y-3.5 pt-4 border-t border-dark-border text-sm">
              <div className="flex justify-between text-dark-muted">
                <span>Items Subtotal</span>
                <span>₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-dark-muted">
                <span>Taxes & charges (5% GST)</span>
                <span>₹{cartTax}</span>
              </div>
              <div className="flex justify-between text-dark-muted">
                <span>Delivery Partner Fee</span>
                <span>₹{paymentMethod === 'COD' ? cartDeliveryFee + 10 : cartDeliveryFee}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-veg font-semibold">
                  <span>Coupon discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-extrabold text-base pt-3 border-t border-dark-border">
                <span>Grand Total</span>
                <span className="text-brand">₹{paymentMethod === 'COD' ? cartGrandTotal + 10 : cartGrandTotal}</span>
              </div>
            </div>

            {validationError && (
              <p className="text-[10px] text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-xl font-bold mt-4">{validationError}</p>
            )}

            <button
              onClick={handleProceedToPayment}
              disabled={submitting}
              className="w-full mt-6 bg-brand hover:bg-brand-gold disabled:opacity-50 text-neutral-950 font-bold py-4 rounded-xl transition duration-300 shadow-lg shadow-brand/10 text-sm flex items-center justify-center space-x-2"
            >
              <span>
                {submitting ? 'Processing Order...' : paymentMethod === 'COD' ? 'Place Order (Cash on Delivery)' : 'Pay & Place Order'}
              </span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CheckoutPage;
