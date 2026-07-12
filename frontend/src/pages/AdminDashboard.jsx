import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { 
  ShoppingBag, Play, Truck, CheckCircle2, ChevronRight, Edit3, Trash2, Plus, 
  ToggleLeft, ToggleRight, Search, BarChart3, Key, Users, ListFilter, LogOut, ShieldAlert,
  HelpCircle, Check, Flame, ClipboardList, RefreshCw, Volume2, Download, CreditCard
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  
  // Guard access
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/admin/login');
      } else if (user.role === 'customer') {
        navigate('/');
      }
    }
  }, [authLoading, user, navigate]);

  // Sidebar Tab controller
  const [activeTab, setActiveTab] = useState('analytics');

  useEffect(() => {
    if (user?.role === 'kitchen_staff') {
      setActiveTab('orders');
    }
  }, [user]);

  // States for sub-panels
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [staff, setStaff] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  // Menu Form states
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuEditId, setMenuEditId] = useState(null);
  const [menuName, setMenuName] = useState('');
  const [menuPrice, setMenuPrice] = useState('');
  const [menuDesc, setMenuDesc] = useState('');
  const [menuImg, setMenuImg] = useState('');
  const [menuCat, setMenuCat] = useState('Starters');
  const [menuIsVeg, setMenuIsVeg] = useState(true);
  const [menuIsAvailable, setMenuIsAvailable] = useState(true);

  // Staff Form states
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState('kitchen_staff');
  const [staffError, setStaffError] = useState('');

  // API Key Form states
  const [zomatoKeyInput, setZomatoKeyInput] = useState('');
  const [swiggyKeyInput, setSwiggyKeyInput] = useState('');
  const [razorpayIdInput, setRazorpayIdInput] = useState('');
  const [razorpaySecretInput, setRazorpaySecretInput] = useState('');

  // Search/Filters
  const [orderFilter, setOrderFilter] = useState('all_active'); 
  const [menuSearch, setMenuSearch] = useState('');
  const [menuFilterCat, setMenuFilterCat] = useState('All');

  // Audio Synth Alert (Web Audio API)
  const playNewOrderBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Beep 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain1.gain.setValueAtTime(0, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.35);

      // Beep 2 (slightly higher, delayed)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(698.46, audioCtx.currentTime); // F5
        gain2.gain.setValueAtTime(0, audioCtx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.45);
      }, 180);

    } catch (err) {
      console.warn('Synthetic audio alert failed:', err.message);
    }
  };

  // Socket.IO listeners
  useEffect(() => {
    if (authLoading || !user || user.role === 'customer') return;

    // Connect to Socket.IO Namespace
    const socket = io('http://localhost:5000', {
      query: { admin: 'true' }
    });

    socket.on('connect', () => {
      console.log('[SOCKET-IO]: Connected to server live alerts feed.');
    });

    // Alert new orders
    socket.on('NEW_ORDER_ALERT', (newOrder) => {
      console.log('[SOCKET-IO]: Live incoming order alert received:', newOrder);
      
      // Play sound notification
      playNewOrderBeep();
      
      // Update local orders feed
      setOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
      
      // Re-trigger analytics load
      fetchData();
    });

    // Handle status updates
    socket.on('STATUS_UPDATE', (payload) => {
      setOrders(prev => prev.map(o => o.id === payload.orderId ? { ...o, status: payload.data.status } : o));
    });

    return () => {
      socket.disconnect();
    };
  }, [authLoading, user]);

  // Load backend data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Live Orders (Accessible by all roles)
      const resOrders = await fetch('http://localhost:5000/api/orders/history', {
        credentials: 'include'
      });
      if (resOrders.ok) {
        const orderHistory = await resOrders.json();
        setOrders(orderHistory);
      }

      // 2. Menu Items (Admins, Managers)
      if (user?.role === 'admin' || user?.role === 'manager') {
        const resMenu = await fetch('http://localhost:5000/api/menu');
        if (resMenu.ok) setMenuItems(await resMenu.json());

        const resAnal = await fetch('http://localhost:5000/api/admin/analytics', {
          credentials: 'include'
        });
        if (resAnal.ok) setAnalytics(await resAnal.json());
      }

      // 3. Staff and API Keys (Admin only)
      if (user?.role === 'admin') {
        const resStaff = await fetch('http://localhost:5000/api/admin/staff', {
          credentials: 'include'
        });
        if (resStaff.ok) setStaff(await resStaff.json());

        const resKeys = await fetch('http://localhost:5000/api/admin/api-keys', {
          credentials: 'include'
        });
        if (resKeys.ok) setApiKeys(await resKeys.json());
      }

    } catch (err) {
      console.error('Error loading admin dashboard panels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && user.role !== 'customer') {
      fetchData();
    }
  }, [authLoading, user]);

  // Handle Order Status Transitions
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    let body = { status: newStatus };
    if (newStatus === 'out_for_delivery') {
      const driver = prompt('Enter Delivery Partner Name:', 'Amit Kumar');
      if (!driver) return; 
      body.delivery_partner_name = driver;
      body.estimated_delivery_time = 15;
    }
    
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        credentials: 'include'
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, delivery_partner_name: body.delivery_partner_name || o.delivery_partner_name } : o));
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Menu CRUD actions ---
  const handleOpenAddMenu = () => {
    setMenuEditId(null);
    setMenuName('');
    setMenuPrice('');
    setMenuDesc('');
    setMenuImg('');
    setMenuCat('Starters');
    setMenuIsVeg(true);
    setMenuIsAvailable(true);
    setShowMenuModal(true);
  };

  const handleOpenEditMenu = (item) => {
    setMenuEditId(item.id);
    setMenuName(item.name);
    setMenuPrice(item.price);
    setMenuDesc(item.description);
    setMenuImg(item.image_url);
    setMenuCat(item.category);
    setMenuIsVeg(item.is_veg);
    setMenuIsAvailable(item.is_available);
    setShowMenuModal(true);
  };

  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    const payload = {
      name: menuName,
      price: Number(menuPrice),
      description: menuDesc,
      image_url: menuImg,
      category: menuCat,
      is_veg: menuIsVeg,
      is_available: menuIsAvailable
    };

    const url = menuEditId 
      ? `http://localhost:5000/api/menu/${menuEditId}` 
      : 'http://localhost:5000/api/menu';
    const method = menuEditId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (res.ok) {
        setShowMenuModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMenuAvailability = async (item) => {
    try {
      const res = await fetch(`http://localhost:5000/api/menu/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_available: !item.is_available }),
        credentials: 'include'
      });
      if (res.ok) {
        setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, is_available: !m.is_available } : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/menu/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setMenuItems(prev => prev.filter(m => m.id !== itemId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Staff CRUD Actions ---
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffError('');
    try {
      const res = await fetch('http://localhost:5000/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: staffName,
          email: staffEmail,
          phone: staffPhone,
          password: staffPassword,
          role: staffRole
        }),
        credentials: 'include'
      });

      if (res.ok) {
        setShowStaffModal(false);
        setStaffName('');
        setStaffEmail('');
        setStaffPhone('');
        setStaffPassword('');
        fetchData();
      } else {
        const err = await res.json();
        setStaffError(err.message || 'Staff registration error.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Revoke access for this employee and delete account?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/staff/${staffId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setStaff(prev => prev.filter(s => s.id !== staffId));
      } else {
        const err = await res.json();
        alert(err.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- API Key Management Actions ---
  const handleUpdateApiKey = async (service, keyVal) => {
    if (!keyVal.trim()) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/api-keys/${service}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: keyVal }),
        credentials: 'include'
      });

      if (res.ok) {
        alert(`${service.toUpperCase()} Integration API Key Saved (Encrypted).`);
        if (service === 'zomato') setZomatoKeyInput('');
        if (service === 'swiggy') setSwiggyKeyInput('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRazorpayKeys = async () => {
    if (!razorpayIdInput.trim() || !razorpaySecretInput.trim()) return;
    const compoundKey = `${razorpayIdInput.trim()}:${razorpaySecretInput.trim()}`;
    try {
      const res = await fetch('http://localhost:5000/api/admin/api-keys/razorpay', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: compoundKey }),
        credentials: 'include'
      });

      if (res.ok) {
        alert('Razorpay Merchant API configuration saved (Encrypted).');
        setRazorpayIdInput('');
        setRazorpaySecretInput('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleApiKeyStatus = async (service, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'revoked' : 'active';
    try {
      const res = await fetch(`http://localhost:5000/api/admin/api-keys/${service}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus }),
        credentials: 'include'
      });

      if (res.ok) {
        setApiKeys(prev => prev.map(k => k.service === service ? { ...k, status: nextStatus } : k));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- CSV Sales Ledger Export ---
  const handleExportCSV = () => {
    if (orders.length === 0) return;
    
    // Headers matching FSSAI and Accounting compliance
    const headers = ['Order ID', 'Customer Name', 'Phone', 'Address Line', 'City', 'Payment Method', 'Payment Status', 'Grand Total (INR)', 'Order Status', 'Placed Timestamp'];
    
    const rows = orders.map(o => [
      `ORD${o.id}`,
      o.customer_name || 'Guest',
      o.customer_phone || '—',
      `"${o.address_line ? o.address_line.replace(/"/g, '""') : '—'}"`,
      o.city || '—',
      o.payment_method,
      o.payment_status,
      o.grand_total,
      o.status,
      new Date(o.created_at).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','), 
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `restaurant_sales_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || (loading && !analytics && orders.length === 0)) {
    return (
      <div className="min-h-screen bg-dark-bg text-dark-text flex items-center justify-center">
        <RefreshCw className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  // Live order filtering logic
  const liveFeedOrders = orders.filter(o => {
    if (orderFilter === 'all_active') {
      return o.status !== 'delivered' && o.status !== 'cancelled';
    }
    return o.status === orderFilter;
  });

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text font-sans flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-dark-card border-r border-dark-border flex flex-col justify-between shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-black text-white tracking-widest flex items-center space-x-2">
            <span className="text-brand">MODEST</span>
            <span className="text-xs bg-brand/10 border border-brand/20 text-brand px-2 py-0.5 rounded uppercase font-black tracking-normal">Staff</span>
          </h2>
          
          <div className="mt-4 pb-4 border-b border-dark-border flex items-center justify-between">
            <div>
              <p className="text-xs text-white font-bold">{user?.name}</p>
              <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider mt-0.5">{user?.role?.replace('_', ' ') || ''}</p>
            </div>
            {/* Quick Beep Test button to ensure browser audio is active */}
            <button 
              onClick={playNewOrderBeep} 
              className="text-dark-muted hover:text-brand transition p-1.5 rounded-lg hover:bg-neutral-900"
              title="Test Alert Beep"
            >
              <Volume2 size={16} />
            </button>
          </div>

          <nav className="mt-6 space-y-1">
            {user?.role !== 'kitchen_staff' && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'analytics' ? 'bg-brand text-neutral-950' : 'text-dark-muted hover:text-white hover:bg-neutral-900'
                }`}
              >
                <BarChart3 size={16} />
                <span>Analytics Dashboard</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                activeTab === 'orders' ? 'bg-brand text-neutral-950' : 'text-dark-muted hover:text-white hover:bg-neutral-900'
              }`}
            >
              <ClipboardList size={16} />
              <span>Live Order Monitor</span>
            </button>

            {user?.role !== 'kitchen_staff' && (
              <button
                onClick={() => setActiveTab('menu')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'menu' ? 'bg-brand text-neutral-950' : 'text-dark-muted hover:text-white hover:bg-neutral-900'
                }`}
              >
                <ShoppingBag size={16} />
                <span>Menu Controller</span>
              </button>
            )}

            {user?.role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                    activeTab === 'staff' ? 'bg-brand text-neutral-950' : 'text-dark-muted hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <Users size={16} />
                  <span>Staff device accounts</span>
                </button>

                <button
                  onClick={() => setActiveTab('integrations')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                    activeTab === 'integrations' ? 'bg-brand text-neutral-950' : 'text-dark-muted hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <Key size={16} />
                  <span>API Integrations</span>
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="p-6 border-t border-dark-border">
          <button
            onClick={() => { logout(); navigate('/admin/login'); }}
            className="w-full flex items-center justify-center space-x-2 bg-neutral-900 border border-neutral-800 hover:border-brand/40 text-dark-muted hover:text-white py-3 rounded-xl text-xs font-bold transition"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-h-screen overflow-y-auto">
        
        {/* --- 1. Analytics Hub Tab --- */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-extrabold text-white">Analytics Overview</h1>
              <button
                onClick={handleExportCSV}
                className="bg-neutral-900 border border-neutral-800 hover:border-brand text-brand hover:text-white px-5 py-3 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Download size={14} />
                <span>Export Ledger (CSV)</span>
              </button>
            </div>

            {/* Statistics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-dark-card border border-dark-border p-5 rounded-2xl">
                <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Gross Revenue</p>
                <p className="text-2xl font-black text-brand mt-1">₹{analytics.summary.total_revenue.toLocaleString()}</p>
                <span className="text-[10px] text-veg font-semibold">+14.2% from last week</span>
              </div>
              <div className="bg-dark-card border border-dark-border p-5 rounded-2xl">
                <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Completed Orders</p>
                <p className="text-2xl font-black text-white mt-1">{analytics.summary.total_orders}</p>
                <span className="text-[10px] text-veg font-semibold">+8.5% from last week</span>
              </div>
              <div className="bg-dark-card border border-dark-border p-5 rounded-2xl">
                <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Average Ticket</p>
                <p className="text-2xl font-black text-white mt-1">₹{analytics.summary.avg_order_value}</p>
                <span className="text-[10px] text-dark-muted font-semibold">Standard checkout basket</span>
              </div>
              <div className="bg-dark-card border border-dark-border p-5 rounded-2xl">
                <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Net Profit ({analytics.summary.profit_margin_percent}%)</p>
                <p className="text-2xl font-black text-veg mt-1">₹{analytics.summary.net_profit.toLocaleString()}</p>
                <span className="text-[10px] text-veg font-semibold">Healthy 32% margin</span>
              </div>
            </div>

            {/* Visual Charts Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sales Trend Bar Chart */}
              <div className="lg:col-span-2 bg-dark-card border border-dark-border p-6 rounded-3xl space-y-6">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Daily Sales & Order Trend</h3>
                
                <div className="h-64 flex items-end justify-between gap-4 pt-6 border-b border-dark-border pb-2">
                  {analytics.trends.map(t => {
                    const percent = Math.min(100, Math.round((t.revenue / 35000) * 100));
                    return (
                      <div key={t.label} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        <div className="absolute -top-10 scale-0 group-hover:scale-100 transition bg-neutral-900 border border-dark-border text-[9px] text-white px-2 py-1.5 rounded-lg whitespace-nowrap z-20">
                          ₹{t.revenue.toLocaleString()} ({t.orders} ord)
                        </div>
                        <div 
                          className="w-full bg-neutral-900 border border-neutral-800 group-hover:border-brand/40 rounded-t-lg transition-all duration-500 overflow-hidden relative flex items-end justify-center"
                          style={{ height: `${percent}%` }}
                        >
                          <div className="w-full bg-gradient-to-t from-brand-dark to-brand h-full opacity-80 group-hover:opacity-100 transition" />
                        </div>
                        <span className="text-[10px] text-dark-muted mt-2 font-bold uppercase">{t.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Best selling items column */}
              <div className="bg-dark-card border border-dark-border p-6 rounded-3xl space-y-6">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Bestselling Items</h3>
                <div className="space-y-4">
                  {analytics.bestsellers.map(dish => (
                    <div key={dish.name} className="flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white flex items-center space-x-1.5">
                          <span className={`w-2 h-2 rounded-full ${dish.is_veg ? 'bg-veg' : 'bg-nonveg'}`} />
                          <span>{dish.name}</span>
                        </p>
                        <p className="text-[10px] text-dark-muted mt-0.5">{dish.quantity} units ordered</p>
                      </div>
                      <span className="font-bold text-brand">₹{dish.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 2. Live Order Dashboard Tab --- */}
        {activeTab === 'orders' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-extrabold text-white">Live Order Dashboard</h1>
              
              <div className="flex space-x-1.5 bg-neutral-950 p-1 border border-neutral-900 rounded-xl overflow-x-auto">
                {[
                  { key: 'all_active', label: 'All Active' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'preparing', label: 'Preparing' },
                  { key: 'out_for_delivery', label: 'Dispatched' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setOrderFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition ${
                      orderFilter === tab.key ? 'bg-brand text-neutral-950' : 'text-dark-muted hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {liveFeedOrders.length === 0 ? (
              <div className="text-center py-20 bg-dark-card border border-dark-border rounded-3xl">
                <p className="text-sm text-dark-muted">No live incoming orders in this queue.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {liveFeedOrders.map(order => (
                  <div key={order.id} className="bg-dark-card border border-dark-border p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-base">Order #ORD{order.id.slice(-5)}</h4>
                        <p className="text-[10px] text-dark-muted mt-0.5">Placed: {new Date(order.created_at).toLocaleTimeString()}</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded border ${
                        order.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        order.status === 'preparing' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                        'bg-purple-500/10 border-purple-500/20 text-purple-400'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="bg-dark-bg p-3 border border-dark-border rounded-xl text-xs space-y-1.5 text-dark-muted">
                      <p><span className="font-bold text-neutral-200">Customer:</span> {order.customer_name} ({order.customer_phone})</p>
                      <p><span className="font-bold text-neutral-200">Address:</span> {order.address_line}, {order.city}</p>
                      <p><span className="font-bold text-neutral-200">Payment:</span> {order.payment_method} ({order.payment_status})</p>
                      <p><span className="font-bold text-neutral-200">Total Bill:</span> <span className="text-brand font-black">₹{order.grand_total}</span></p>
                      {order.delivery_partner_name && (
                        <p><span className="font-bold text-neutral-200">Delivery Partner:</span> {order.delivery_partner_name}</p>
                      )}
                    </div>

                    <div className="flex space-x-2 pt-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5"
                        >
                          <Play size={14} />
                          <span>Start Kitchen prep</span>
                        </button>
                      )}
                      
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'out_for_delivery')}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5"
                        >
                          <Truck size={14} />
                          <span>Dispatch Order</span>
                        </button>
                      )}

                      {order.status === 'out_for_delivery' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                          className="w-full bg-veg hover:bg-emerald-600 text-neutral-950 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5"
                        >
                          <CheckCircle2 size={14} />
                          <span>Complete & Deliver</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- 3. Menu Controller Tab --- */}
        {activeTab === 'menu' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Menu Catalog</h1>
                <p className="text-xs text-dark-muted mt-1">Add, edit, or adjust food items status on checkout lists</p>
              </div>

              <button
                onClick={handleOpenAddMenu}
                className="bg-brand hover:bg-brand-gold text-neutral-950 font-bold px-5 py-3 rounded-xl text-xs flex items-center space-x-1.5 shrink-0"
              >
                <Plus size={16} />
                <span>Add Menu Item</span>
              </button>
            </div>

            <div className="bg-dark-card border border-dark-border rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-dark-border">
                  <thead className="bg-neutral-950 text-dark-muted font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Availability</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {menuItems.map(item => (
                      <tr key={item.id} className="hover:bg-dark-bg/40 transition">
                        <td className="px-6 py-4 font-bold text-white">{item.name}</td>
                        <td className="px-6 py-4 text-dark-muted">{item.category}</td>
                        <td className="px-6 py-4 font-black">₹{item.price}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.is_veg ? 'bg-veg/10 text-veg' : 'bg-nonveg/10 text-nonveg'}`}>
                            {item.is_veg ? 'VEG' : 'NON-VEG'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleMenuAvailability(item)}
                            className="text-dark-muted hover:text-white transition flex items-center space-x-1.5"
                          >
                            {item.is_available ? (
                              <>
                                <ToggleRight size={22} className="text-brand" />
                                <span>In Stock</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft size={22} className="text-dark-muted" />
                                <span className="text-red-400">Sold Out</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                          <button 
                            onClick={() => handleOpenEditMenu(item)}
                            className="text-dark-muted hover:text-brand transition"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteMenuItem(item.id)}
                            className="text-dark-muted hover:text-nonveg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- 4. Staff Directory Tab --- */}
        {activeTab === 'staff' && user?.role === 'admin' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white">Staff Management</h1>
                <p className="text-xs text-dark-muted mt-1">Grant or revoke device credentials for employees</p>
              </div>

              <button
                onClick={() => { setStaffError(''); setShowStaffModal(true); }}
                className="bg-brand hover:bg-brand-gold text-neutral-950 font-bold px-5 py-3 rounded-xl text-xs flex items-center space-x-1.5 shrink-0"
              >
                <Plus size={16} />
                <span>Create Staff Account</span>
              </button>
            </div>

            <div className="bg-dark-card border border-dark-border rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs divide-y divide-dark-border">
                <thead className="bg-neutral-950 text-dark-muted font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Employee Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Designated Role</th>
                    <th className="px-6 py-4 text-right">Access Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {staff.map(emp => (
                    <tr key={emp.id} className="hover:bg-dark-bg/40 transition">
                      <td className="px-6 py-4 font-bold text-white">{emp.name}</td>
                      <td className="px-6 py-4 text-dark-muted">{emp.email}</td>
                      <td className="px-6 py-4 text-dark-muted">{emp.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          emp.role === 'admin' ? 'bg-red-500/10 text-red-400' :
                          emp.role === 'manager' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {emp.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {emp.id !== user?.id ? (
                          <button
                            onClick={() => handleDeleteStaff(emp.id)}
                            className="text-dark-muted hover:text-red-400 font-bold uppercase text-[10px] tracking-wider transition border border-dark-border hover:border-red-900/40 px-3 py-1.5 rounded-lg bg-neutral-900"
                          >
                            Revoke Access
                          </button>
                        ) : (
                          <span className="text-[10px] text-dark-muted font-bold italic">Active Session</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 5. Delivery Integrations & Razorpay Settings (Admin only) --- */}
        {activeTab === 'integrations' && user?.role === 'admin' && (
          <div className="space-y-12 animate-fade-in">
            
            {/* Razorpay Merchant Keys Settings */}
            <div className="bg-dark-card border border-dark-border p-6 rounded-3xl space-y-6 shadow-xl">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-brand/10 border border-brand/20 rounded-xl text-brand">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Razorpay Merchant Credentials</h3>
                  <p className="text-xs text-dark-muted mt-0.5">Link the restaurant's own PAN/GST-verified gateway account credentials</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Razorpay Key ID</label>
                  <input
                    type="text"
                    placeholder="rzp_test_..."
                    className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none transition"
                    value={razorpayIdInput}
                    onChange={(e) => setRazorpayIdInput(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Razorpay Key Secret</label>
                  <input
                    type="password"
                    placeholder="Enter key secret value"
                    className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none transition"
                    value={razorpaySecretInput}
                    onChange={(e) => setRazorpaySecretInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleUpdateRazorpayKeys}
                  disabled={!razorpayIdInput.trim() || !razorpaySecretInput.trim()}
                  className="bg-brand hover:bg-brand-gold disabled:opacity-50 text-neutral-950 font-bold px-6 py-3 rounded-xl text-xs transition"
                >
                  Save Sandbox Credentials
                </button>
              </div>
            </div>

            {/* Aggregators Integrations */}
            <div>
              <h2 className="text-xl font-extrabold text-white mb-6">Delivery App Integrations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {apiKeys.filter(k => k.service !== 'razorpay').map(integration => {
                  const isZomato = integration.service === 'zomato';
                  const inputVal = isZomato ? zomatoKeyInput : swiggyKeyInput;
                  const setInputVal = isZomato ? setZomatoKeyInput : setSwiggyKeyInput;

                  return (
                    <div key={integration.service} className="bg-dark-card border border-dark-border p-6 rounded-3xl space-y-6 shadow-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-bold text-white uppercase tracking-wider">
                            {integration.service} Integration
                          </h3>
                          <p className="text-[10px] text-dark-muted mt-0.5">Last updated: {new Date(integration.updated_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded border ${
                          integration.status === 'active' 
                            ? 'bg-veg/10 border-veg/20 text-veg' 
                            : 'bg-red-950/20 border-red-900/30 text-red-400'
                        }`}>
                          {integration.status}
                        </span>
                      </div>

                      <div className="space-y-2 bg-dark-bg border border-dark-border p-4 rounded-2xl">
                        <p className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Active Token (Masked & Encrypted)</p>
                        <p className="text-xs text-neutral-300 font-mono tracking-wider break-all">
                          {integration.api_key}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Enter New Token</label>
                          <input
                            type="password"
                            placeholder={`Enter raw ${integration.service} api token`}
                            className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none transition"
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                          />
                        </div>
                        <div className="flex space-x-3 pt-2">
                          <button
                            onClick={() => handleToggleApiKeyStatus(integration.service, integration.status)}
                            className="flex-1 bg-neutral-900 border border-neutral-800 hover:border-brand hover:text-white py-3 rounded-xl text-[10px] font-black uppercase transition text-dark-muted"
                          >
                            {integration.status === 'active' ? 'Revoke Key' : 'Activate Key'}
                          </button>
                          <button
                            onClick={() => handleUpdateApiKey(integration.service, inputVal)}
                            disabled={!inputVal.trim()}
                            className="flex-1 bg-brand hover:bg-brand-gold text-neutral-950 py-3 rounded-xl text-[10px] font-black uppercase transition"
                          >
                            Save Token
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
          </div>
        )}

      </main>

      {/* --- Menu Controller Modal --- */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-dark-bg/85 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={handleSaveMenuItem} className="bg-dark-card border border-dark-border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 animate-slide-up">
            <h3 className="text-xl font-bold text-white">
              {menuEditId ? 'Edit Menu Dish' : 'Create New Menu Dish'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Butter Naan"
                  className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Price (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 180"
                  className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none"
                  value={menuPrice}
                  onChange={(e) => setMenuPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Description</label>
              <textarea
                rows={2}
                placeholder="Brief recipe descriptions..."
                className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none resize-none"
                value={menuDesc}
                onChange={(e) => setMenuDesc(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Image URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none"
                value={menuImg}
                onChange={(e) => setMenuImg(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Category</label>
                <select
                  className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none"
                  value={menuCat}
                  onChange={(e) => setMenuCat(e.target.value)}
                >
                  <option>Starters</option>
                  <option>Main Course</option>
                  <option>Breads</option>
                  <option>Desserts</option>
                  <option>Beverages</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Dish Type</label>
                <div className="flex space-x-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setMenuIsVeg(true)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                      menuIsVeg ? 'bg-veg/10 border-veg text-veg' : 'bg-dark-bg border-dark-border text-dark-muted'
                    }`}
                  >
                    Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuIsVeg(false)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                      !menuIsVeg ? 'bg-nonveg/10 border-nonveg text-nonveg' : 'bg-dark-bg border-dark-border text-dark-muted'
                    }`}
                  >
                    Non-Veg
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-3">
              <button
                type="button"
                onClick={() => setShowMenuModal(false)}
                className="flex-1 bg-dark-bg hover:bg-neutral-900 border border-dark-border hover:border-dark-muted text-dark-muted hover:text-white py-3.5 rounded-xl font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-brand hover:bg-brand-gold text-neutral-950 font-bold py-3.5 rounded-xl font-bold text-xs transition"
              >
                Save Dish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- Staff Creation Modal --- */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-dark-bg/85 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={handleCreateStaff} className="bg-dark-card border border-dark-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-up">
            <h3 className="text-xl font-bold text-white">Create Employee Account</h3>
            
            {staffError && (
              <p className="text-[10px] text-red-400 bg-red-950/20 p-2.5 rounded-lg border border-red-900/30">{staffError}</p>
            )}

            <div className="space-y-1">
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Employee Name</label>
              <input
                type="text"
                required
                className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none"
                placeholder="Chef Ramesh"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Staff Email</label>
              <input
                type="email"
                required
                className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none"
                placeholder="ramesh@modest.com"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Phone</label>
              <input
                type="tel"
                required
                className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none"
                placeholder="98765 09812"
                value={staffPhone}
                onChange={(e) => setStaffPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Temporary Password</label>
              <input
                type="password"
                required
                className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none"
                placeholder="Min 6 characters"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-wider">Select Role</label>
              <select
                className="w-full bg-dark-bg border border-dark-border focus:border-brand rounded-xl py-3 px-4 text-xs text-white outline-none"
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value)}
              >
                <option value="kitchen_staff">Kitchen Staff (Cook/Chef)</option>
                <option value="manager">Store Manager</option>
                <option value="admin">System Admin</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="flex-1 bg-dark-bg border border-dark-border hover:border-dark-muted text-dark-muted hover:text-white py-3 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-brand hover:bg-brand-gold text-neutral-950 py-3 rounded-xl text-xs font-bold transition"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
