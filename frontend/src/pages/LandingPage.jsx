import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Star, Clock, MapPin, ChefHat, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';

const LandingPage = () => {
  const { cartCount } = useCart();

  const signatureDishes = [
    {
      id: 6,
      name: 'Butter Chicken',
      price: 390,
      image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=60',
      description: 'Smoked tandoori chicken cooked in a rich, creamy tomato butter gravy.',
      isVeg: false,
      rating: '4.9'
    },
    {
      id: 7,
      name: 'Paneer Butter Masala',
      price: 320,
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=60',
      description: 'Soft cottage cheese cubes simmered in a luscious tomato cashew cream.',
      isVeg: true,
      rating: '4.8'
    },
    {
      id: 9,
      name: 'Chicken Biryani',
      price: 380,
      image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=60',
      description: 'Fragrant basmati rice layered with spiced chicken and saffron.',
      isVeg: false,
      rating: '4.9'
    }
  ];

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text font-sans">
      {/* Hero Section */}
      <header className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1544025162-d76694265947?w=1600&auto=format&fit=crop&q=80')",
            filter: "brightness(0.3)" 
          }}
        />
        
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-gold/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative container mx-auto px-6 text-center z-10 max-w-4xl animate-slide-up">
          <div className="inline-flex items-center space-x-2 bg-neutral-900/80 border border-brand/20 px-4 py-2 rounded-full mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span className="text-xs text-brand uppercase tracking-widest font-semibold">Fine Dining & Fast Delivery</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
            Taste the Essence of <span className="text-brand">Modesty</span> & <span className="text-brand-gold">Flavor</span>
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Crafting authenticity in every spice. Experience premium, traditional Indian recipes prepared by master chefs, delivered warm to your doorstep.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/menu"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-brand hover:bg-brand-gold text-neutral-950 font-bold px-8 py-4 rounded-xl transition duration-300 shadow-lg shadow-brand/20 group"
            >
              <span>Explore Our Menu</span>
              <ArrowRight size={20} className="transform group-hover:translate-x-1 transition" />
            </Link>
            <Link 
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-8 py-4 rounded-xl border border-neutral-800 hover:border-neutral-700 transition duration-300 backdrop-blur-md"
            >
              Login / Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Info Badges */}
      <section className="py-12 border-y border-dark-border bg-dark-card/50 backdrop-blur-md">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-center space-x-4 p-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <ChefHat size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white">Master Chefs</h3>
              <p className="text-sm text-dark-muted">Centuries-old recipes curated with passion.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white">35 Mins Delivery</h3>
              <p className="text-sm text-dark-muted">Superfast delivery tracking for hot food.</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 p-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white">Fresh & Hygenic</h3>
              <p className="text-sm text-dark-muted">Double-sealed, zero-contact safety packaging.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Dishes Grid */}
      <section className="py-20 container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Chef's Recommendations</h2>
          <p className="text-dark-muted">Indulge in our award-winning Indian classics, ordered by hundreds of customers daily.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {signatureDishes.map((dish) => (
            <div 
              key={dish.id} 
              className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 transition duration-350 group"
            >
              <div className="h-64 overflow-hidden relative">
                <img 
                  src={dish.image} 
                  alt={dish.name}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500"
                />
                <div className="absolute top-4 left-4 bg-dark-bg/85 border border-dark-border px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-sm">
                  <span className={`w-2.5 h-2.5 rounded-full ${dish.isVeg ? 'bg-veg' : 'bg-nonveg'}`} />
                  <span className="text-neutral-300">{dish.isVeg ? 'Veg' : 'Non-Veg'}</span>
                </div>
                
                <div className="absolute top-4 right-4 bg-brand px-2.5 py-1 rounded-lg text-xs font-bold text-neutral-950 flex items-center space-x-1">
                  <Star size={14} className="fill-neutral-950" />
                  <span>{dish.rating}</span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">{dish.name}</h3>
                  <span className="text-brand font-extrabold text-lg">₹{dish.price}</span>
                </div>
                <p className="text-sm text-dark-muted mb-6 line-clamp-2">{dish.description}</p>
                
                <Link 
                  to="/menu"
                  className="w-full inline-flex items-center justify-center bg-neutral-900 hover:bg-brand hover:text-neutral-950 text-white font-bold py-3 rounded-xl border border-neutral-800 hover:border-brand transition duration-300"
                >
                  Order Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Heritage / Story Section */}
      <section className="py-20 border-t border-dark-border bg-dark-card/20">
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-72 h-72 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
            <img 
              src="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=60" 
              alt="Restaurant kitchen heritage"
              className="rounded-2xl border border-dark-border shadow-2xl relative z-10 w-full object-cover h-[450px]"
            />
          </div>

          <div className="space-y-6">
            <div className="inline-block bg-brand/10 border border-brand/20 px-3.5 py-1 rounded-full text-xs font-semibold text-brand tracking-widest uppercase">
              Our Legacy
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">The Story of The Modest Restaurant</h2>
            <p className="text-dark-muted leading-relaxed">
              Established in the heart of Mumbai, **The Modest Restaurant** began as a small family kitchen with a big dream: to serve authentic Indian dishes made with locally sourced, fresh spices and no compromise on quality.
            </p>
            <p className="text-dark-muted leading-relaxed">
              Our term "Modest" refers to our pricing and humble beginnings, but never our flavors. Each curry is slow-cooked for hours, each naan is baked fresh in a traditional tandoor clay oven, and our signature spice mixes are ground by hand. Experience a culinary journey that bridges heritage and modern excellence.
            </p>
            <div className="pt-4">
              <Link 
                to="/menu"
                className="inline-flex items-center space-x-2 text-brand hover:text-brand-gold font-bold transition"
              >
                <span>Read more about our sourcing</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-card border-t border-dark-border py-16">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-white tracking-wider flex items-center space-x-2">
              <span className="text-brand">THE</span>
              <span className="text-dark-text">MODEST</span>
            </h3>
            <p className="text-sm text-dark-muted">
              Authentic Indian fine dining & fast delivery. Humblest prices, grandest flavors.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Opening Hours</h4>
            <ul className="space-y-2 text-sm text-dark-muted">
              <li>Mon - Fri: 11:00 AM - 11:00 PM</li>
              <li>Sat - Sun: 11:00 AM - Midnight</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Contact Info</h4>
            <ul className="space-y-2 text-sm text-dark-muted">
              <li>Flat 402, Royal Residency, Andheri West, Mumbai, MH</li>
              <li>Phone: +91 98765 43210</li>
              <li>Email: contact@modestrestaurant.com</li>
              <li className="text-[10px] bg-brand/5 border border-brand/10 p-2 rounded-xl text-brand font-bold mt-2 inline-block">FSSAI Lic No. 12824009000123</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Quick Links</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-dark-muted">
              <Link to="/menu" className="hover:text-brand transition">Full Menu</Link>
              <Link to="/login" className="hover:text-brand transition">Login</Link>
              <Link to="/signup" className="hover:text-brand transition">Sign Up</Link>
              <Link to="/admin/login" className="hover:text-brand transition">Staff Portal</Link>
              <Link to="/terms" className="hover:text-brand transition">Terms</Link>
              <Link to="/privacy" className="hover:text-brand transition">Privacy</Link>
              <Link to="/refunds" className="hover:text-brand transition">Refunds</Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 pt-12 mt-12 border-t border-dark-border text-center text-xs text-dark-muted">
          © {new Date().getFullYear()} The Modest Restaurant. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
