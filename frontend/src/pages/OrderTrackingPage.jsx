import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { Clock, MapPin, CheckCircle2, ShieldAlert, Send, ArrowLeft, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';

const OrderTrackingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const orderId = searchParams.get('orderId');
  
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [chat, setChat] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const chatEndRef = useRef(null);
  const wsRef = useRef(null);

  // Load initial order details
  const fetchOrderDetails = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        setItems(data.items);
        setChat(data.chat);
      } else {
        setError('Order not found or permission denied.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else {
        fetchOrderDetails();
      }
    }
  }, [orderId, authLoading, user]);

  // Socket.IO Connection Manager
  useEffect(() => {
    if (!orderId || authLoading || !user) return;

    // Connect to Socket.IO Namespace
    const socket = io('http://localhost:5000', {
      query: { orderId }
    });

    socket.on('connect', () => {
      console.log(`[SOCKET-IO]: Connected client listening to order #${orderId}`);
    });

    socket.on('STATUS_UPDATE', (payload) => {
      if (payload.orderId === Number(orderId) || payload.orderId.toString() === orderId.toString()) {
        setOrder(prev => ({
          ...prev,
          ...payload.data
        }));
      }
    });

    socket.on('NEW_CHAT_MESSAGE', (payload) => {
      if (payload.orderId === Number(orderId) || payload.orderId.toString() === orderId.toString()) {
        setChat(prev => {
          const msgId = payload.data._id || payload.data.id;
          if (prev.some(msg => (msg._id === msgId || msg.id === msgId))) return prev;
          return [...prev, payload.data];
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, authLoading, user]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    try {
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ message: typedMessage.trim() })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setChat(prev => {
          const msgId = newMsg._id || newMsg.id;
          if (prev.some(msg => (msg._id === msgId || msg.id === msgId))) return prev;
          return [...prev, newMsg];
        });
        setTypedMessage('');
      }
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  // Cancel order
  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}/cancel`, {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        setOrder(prev => ({ ...prev, status: 'cancelled' }));
      } else {
        const data = await res.json();
        alert(data.message || 'Could not cancel order.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  if (!orderId) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-dark-bg text-dark-text p-6">
        <AlertCircle size={48} className="text-brand mb-4" />
        <h2 className="text-xl font-bold text-white">Missing Order reference</h2>
        <button onClick={() => navigate('/menu')} className="mt-4 bg-brand text-neutral-950 px-6 py-2 rounded-xl font-bold">Return to Menu</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center bg-dark-bg text-dark-text">
        <RefreshCw className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center bg-dark-bg text-dark-text p-6">
        <ShieldAlert size={48} className="text-nonveg mb-4" />
        <h2 className="text-xl font-bold text-white">{error || 'Could not load order.'}</h2>
        <button onClick={() => navigate('/menu')} className="mt-4 bg-brand text-neutral-950 px-6 py-2.5 rounded-xl font-bold">Return to Menu</button>
      </div>
    );
  }

  // Calculate status steps index
  const statusSteps = ['pending', 'preparing', 'out_for_delivery', 'delivered'];
  const currentStepIndex = statusSteps.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  // Helper helper to color progress step states
  const getStepClass = (stepName) => {
    const stepIdx = statusSteps.indexOf(stepName);
    if (isCancelled) return 'text-dark-muted border-dark-border bg-dark-bg';
    if (currentStepIndex >= stepIdx) {
      return 'border-brand text-brand bg-brand/10 font-bold';
    }
    return 'border-dark-border text-dark-muted bg-dark-bg';
  };

  const getStepConnectorClass = (connectorTargetStep) => {
    const stepIdx = statusSteps.indexOf(connectorTargetStep);
    if (isCancelled) return 'bg-dark-border';
    if (currentStepIndex >= stepIdx) {
      return 'bg-brand';
    }
    return 'bg-dark-border';
  };

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text py-12">
      <div className="container mx-auto px-6 max-w-6xl">
        
        {/* Back Link */}
        <button 
          onClick={() => navigate('/menu')} 
          className="flex items-center space-x-1.5 text-xs text-dark-muted hover:text-white font-bold mb-8 transition"
        >
          <ArrowLeft size={14} />
          <span>Return to Menu</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Columns: Stepper, Metadata, Cancellation */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status Card */}
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>Order #ORD{order.id}</span>
                  </h2>
                  <p className="text-xs text-dark-muted mt-1">Placed on {new Date(order.created_at).toLocaleTimeString()}</p>
                </div>
                
                {!isCancelled && order.estimated_delivery_time > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Est. Arrival</p>
                    <p className="text-lg font-black text-brand">{order.estimated_delivery_time} Mins</p>
                  </div>
                )}
              </div>

              {/* Stepper HUD */}
              {isCancelled ? (
                <div className="bg-red-950/20 border border-red-900/30 p-5 rounded-2xl flex items-center space-x-3 text-red-400">
                  <ShieldAlert size={20} />
                  <span className="text-sm font-bold">This order has been cancelled.</span>
                </div>
              ) : (
                <div className="py-6 flex items-center justify-between relative px-2">
                  {/* Connectors lines */}
                  <div className="absolute top-1/2 left-8 right-8 h-[2px] bg-dark-border -translate-y-6 z-0">
                    <div className="flex justify-between w-full h-full">
                      <div className={`h-full w-[33%] ${getStepConnectorClass('preparing')}`} />
                      <div className={`h-full w-[33%] ${getStepConnectorClass('out_for_delivery')}`} />
                      <div className={`h-full w-[33%] ${getStepConnectorClass('delivered')}`} />
                    </div>
                  </div>

                  {/* Step 1: Confirmed */}
                  <div className="flex flex-col items-center z-10 relative text-center">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-all ${getStepClass('pending')}`}>
                      1
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-white">Confirmed</span>
                  </div>

                  {/* Step 2: Preparing */}
                  <div className="flex flex-col items-center z-10 relative text-center">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-all ${getStepClass('preparing')}`}>
                      2
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-white">Preparing</span>
                  </div>

                  {/* Step 3: Out */}
                  <div className="flex flex-col items-center z-10 relative text-center">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-all ${getStepClass('out_for_delivery')}`}>
                      3
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-white">Out for Delivery</span>
                  </div>

                  {/* Step 4: Delivered */}
                  <div className="flex flex-col items-center z-10 relative text-center">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-all ${getStepClass('delivered')}`}>
                      4
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-white">Delivered</span>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Partner Assigned Card */}
            {order.delivery_partner_name && (
              <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-black">
                    {order.delivery_partner_name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{order.delivery_partner_name}</h3>
                    <p className="text-xs text-dark-muted mt-0.5">Your designated delivery partner</p>
                  </div>
                </div>
                <div className="bg-veg/10 border border-veg/20 text-veg text-[10px] font-black uppercase px-2.5 py-1 rounded">
                  En Route
                </div>
              </div>
            )}

            {/* Cancellation Option (Only available on 'pending' or 'preparing') */}
            {!isCancelled && (order.status === 'pending' || order.status === 'preparing') && (
              <div className="bg-dark-card border border-red-950/20 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white text-sm">Need to cancel your order?</h3>
                  <p className="text-xs text-dark-muted mt-0.5">You can cancel the order free of charge prior to dispatch.</p>
                </div>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="bg-red-950/40 hover:bg-red-900/60 border border-red-950 hover:border-red-500 text-red-400 font-bold px-6 py-2.5 rounded-xl transition text-xs select-none disabled:opacity-50 shrink-0"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            )}

            {/* Order Items summary dropdown */}
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Items in this Order</h3>
              <div className="divide-y divide-dark-border">
                {items.map(item => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-bold text-white">{item.name} <span className="text-dark-muted">x{item.quantity}</span></p>
                      {Object.keys(item.customizations || {}).length > 0 && (
                        <p className="text-[10px] text-dark-muted mt-0.5">{Object.values(item.customizations).join(', ')}</p>
                      )}
                    </div>
                    <span className="font-bold text-brand">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Chat with Delivery Partner */}
          <div>
            <div className="bg-dark-card border border-dark-border rounded-3xl shadow-xl flex flex-col h-[550px] sticky top-6 overflow-hidden">
              
              {/* Chat Header */}
              <div className="bg-dark-card border-b border-dark-border p-4 flex items-center space-x-3.5 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Delivery Partner Chat</h3>
                  <p className="text-[10px] text-dark-muted">
                    {order.delivery_partner_name ? 'Active' : 'Awaiting assignment'}
                  </p>
                </div>
              </div>

              {/* Chat messages stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-bg/20 scrollbar-thin scrollbar-thumb-dark-border">
                {!order.delivery_partner_name ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-dark-muted p-6">
                    <Clock size={36} className="text-dark-muted animate-pulse mb-3" />
                    <p className="text-xs">Once your order is picked up by our delivery partner, chat options will activate here.</p>
                  </div>
                ) : chat.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-xs text-dark-muted">
                    <span>No messages yet. Send a note to coordinate delivery.</span>
                  </div>
                ) : (
                  chat.map((msg, idx) => {
                    const isCustomer = msg.sender_role === 'customer';
                    return (
                      <div 
                        key={msg.id || idx} 
                        className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                            isCustomer 
                              ? 'bg-brand text-neutral-950 font-medium rounded-tr-none' 
                              : 'bg-dark-card border border-dark-border text-white rounded-tl-none'
                          }`}
                        >
                          {msg.message}
                        </div>
                        <span className="text-[9px] text-dark-muted mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input section */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-dark-border bg-dark-card shrink-0 flex items-center space-x-2">
                <input
                  type="text"
                  disabled={!order.delivery_partner_name}
                  placeholder={order.delivery_partner_name ? "Tell driver where to leave food..." : "Chat locked until pickup"}
                  className="flex-1 bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white placeholder-dark-muted outline-none transition disabled:opacity-50"
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!order.delivery_partner_name || !typedMessage.trim()}
                  className="bg-brand hover:bg-brand-gold disabled:opacity-50 text-neutral-950 p-3 rounded-xl transition flex items-center justify-center shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
