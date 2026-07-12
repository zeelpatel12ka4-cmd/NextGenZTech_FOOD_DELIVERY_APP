import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Search, ShoppingBag, Plus, Minus, Check, SlidersHorizontal, Flame, Heart } from 'lucide-react';

const MenuPage = () => {
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, cartCount, cartGrandTotal, updateQuantity } = useCart();
  
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Customization modal state
  const [activeCustomItem, setActiveCustomItem] = useState(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState({});

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/menu');
        if (res.ok) {
          const data = await res.json();
          setMenuItems(data);
          
          // Generate unique categories
          const cats = ['All', ...new Set(data.map(item => item.category))];
          setCategories(cats);
        }
      } catch (err) {
        console.error('Error fetching menu items:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  // Filter logic
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesVeg = !vegOnly || item.is_veg;
    return matchesCategory && matchesSearch && matchesVeg;
  });

  const handleAddClick = (item) => {
    if (item.customization_options && item.customization_options.length > 0) {
      // Set up default selections
      const defaults = {};
      item.customization_options.forEach(opt => {
        defaults[opt.title] = opt.options[0];
      });
      setSelectedCustomizations(defaults);
      setActiveCustomItem(item);
    } else {
      addToCart(item, {});
    }
  };

  const handleConfirmCustomizations = () => {
    addToCart(activeCustomItem, selectedCustomizations);
    setActiveCustomItem(null);
  };

  // Helper to count quantity of specific item (combining all customizations of that item in cart)
  const getItemQuantityInCart = (itemId) => {
    return cart
      .filter(cartItem => cartItem.id === itemId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text font-sans pb-28">
      {/* Background Accent Glow */}
      <div className="absolute top-20 right-10 w-80 h-80 bg-brand/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Banner */}
      <div className="bg-dark-card border-b border-dark-border py-10 mb-8">
        <div className="container mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">Our Complete Menu</h1>
          <p className="text-dark-muted mt-2">Prepared fresh daily, served with pure spices and lots of love.</p>
        </div>
      </div>

      <div className="container mx-auto px-6">
        {/* Search, Filters, and Toggles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-4 flex items-center text-dark-muted">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search delicious curries, starters, naans..."
              className="w-full bg-dark-card border border-dark-border focus:border-brand/60 rounded-xl py-3 pl-12 pr-4 text-white outline-none transition placeholder-dark-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters (Veg / Non-veg toggle) */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl border text-sm font-semibold transition ${
                vegOnly 
                  ? 'bg-veg/10 border-veg text-veg' 
                  : 'bg-dark-card border-dark-border text-dark-text hover:border-dark-muted'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${vegOnly ? 'bg-veg animate-pulse' : 'bg-veg'}`} />
              <span>Veg Only</span>
            </button>
          </div>
        </div>

        {/* Categories Carousel */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-8 scrollbar-thin scrollbar-thumb-dark-border">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-full border text-sm font-bold whitespace-nowrap transition duration-200 ${
                selectedCategory === cat
                  ? 'bg-brand border-brand text-neutral-950 shadow-md shadow-brand/10'
                  : 'bg-dark-card border-dark-border text-dark-muted hover:text-white hover:border-dark-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-dark-card border border-dark-border rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-dark-card/50 border border-dark-border rounded-2xl">
            <p className="text-lg text-dark-muted">No dishes found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => {
              const qtyInCart = getItemQuantityInCart(item.id);
              const isAvailable = item.is_available;

              return (
                <div 
                  key={item.id} 
                  className={`bg-dark-card border border-dark-border rounded-2xl overflow-hidden hover:border-brand/40 hover:shadow-lg transition duration-300 relative flex flex-col justify-between ${
                    !isAvailable && 'opacity-65'
                  }`}
                >
                  <div>
                    {/* Image */}
                    <div className="h-48 overflow-hidden relative bg-neutral-800">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-dark-muted font-bold">
                          The Modest Kitchen
                        </div>
                      )}
                      
                      {/* Veg / Non-veg Badge */}
                      <div className="absolute top-3 left-3 bg-dark-bg/90 border border-dark-border px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-sm">
                        <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-veg' : 'bg-nonveg'}`} />
                        <span className="text-neutral-300 text-[10px] uppercase tracking-wider">{item.is_veg ? 'Veg' : 'Non-veg'}</span>
                      </div>

                      {!isAvailable && (
                        <div className="absolute inset-0 bg-dark-bg/70 flex items-center justify-center">
                          <span className="bg-red-950/80 border border-red-500/30 text-red-400 font-extrabold text-xs uppercase px-4 py-1.5 rounded-full tracking-wider">
                            Sold Out
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-bold text-white text-lg line-clamp-1">{item.name}</h3>
                        <span className="text-brand font-black text-md whitespace-nowrap">₹{item.price}</span>
                      </div>
                      <p className="text-xs text-dark-muted line-clamp-2 leading-relaxed mb-4">{item.description}</p>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="px-5 pb-5 pt-0">
                    {isAvailable && (
                      <div className="flex items-center justify-between">
                        {qtyInCart > 0 ? (
                          <div className="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 rounded-xl p-1.5 w-full">
                            <span className="text-xs text-dark-muted px-2 font-semibold">Added ({qtyInCart})</span>
                            <button
                              onClick={() => navigate('/checkout')}
                              className="ml-auto bg-brand hover:bg-brand-gold text-neutral-950 text-xs font-black px-4 py-2 rounded-lg transition"
                            >
                              Go to Cart
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddClick(item)}
                            className="w-full flex items-center justify-center space-x-1.5 bg-neutral-900 border border-neutral-800 hover:border-brand/40 text-brand font-bold py-2.5 rounded-xl transition hover:bg-neutral-800 text-sm"
                          >
                            <Plus size={16} />
                            <span>Add to Cart</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Persistent Bottom Checkout Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-brand text-neutral-950 py-4 px-6 shadow-[0_-10px_25px_-5px_rgba(245,158,11,0.15)] flex items-center justify-between z-40 transition-transform duration-300 animate-slide-up">
          <div className="flex items-center space-x-3">
            <div className="bg-neutral-950 text-brand w-10 h-10 rounded-full flex items-center justify-center font-black text-sm">
              {cartCount}
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Active Cart</p>
              <p className="text-lg font-black leading-tight">₹{cartGrandTotal}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            className="flex items-center space-x-2 bg-neutral-950 hover:bg-neutral-900 text-white font-bold py-3 px-6 rounded-xl transition duration-300 text-sm shadow-md"
          >
            <span>Checkout</span>
            <ShoppingBag size={16} />
          </button>
        </div>
      )}

      {/* Customizations Selection Modal */}
      {activeCustomItem && (
        <div className="fixed inset-0 bg-dark-bg/85 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-dark-card border border-dark-border w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slide-up">
            <h3 className="text-xl font-bold text-white mb-2">Customize "{activeCustomItem.name}"</h3>
            <p className="text-xs text-dark-muted mb-6">Choose options as per your preference</p>

            <div className="space-y-6 mb-8">
              {activeCustomItem.customization_options.map(opt => (
                <div key={opt.title} className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-dark-muted flex items-center">
                    <Flame size={14} className="text-brand mr-1.5" />
                    <span>{opt.title}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {opt.options.map(val => {
                      const isSelected = selectedCustomizations[opt.title] === val;
                      return (
                        <button
                          key={val}
                          onClick={() => setSelectedCustomizations(prev => ({ ...prev, [opt.title]: val }))}
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            isSelected 
                              ? 'bg-brand/10 border-brand text-brand' 
                              : 'bg-dark-bg border-dark-border text-dark-muted hover:border-dark-muted'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setActiveCustomItem(null)}
                className="flex-1 bg-dark-bg hover:bg-neutral-900 border border-dark-border hover:border-dark-muted text-dark-muted hover:text-white font-bold py-3.5 rounded-xl transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCustomizations}
                className="flex-1 bg-brand hover:bg-brand-gold text-neutral-950 font-bold py-3.5 rounded-xl transition text-sm"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
