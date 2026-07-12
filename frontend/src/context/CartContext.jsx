import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const isInitialMount = useRef(true);

  const API_URL = 'http://localhost:5000/api';

  // 1. Listen to user logins / logouts
  useEffect(() => {
    const loadCart = async () => {
      if (user && user.role === 'customer') {
        try {
          const res = await fetch(`${API_URL}/auth/cart`, {
            credentials: 'include'
          });
          if (res.ok) {
            const data = await res.json();
            setCart(data);
          }
        } catch (err) {
          console.error('[CART-SYNC-ERROR]: Loading synced cart failed:', err);
        }
      } else {
        // Clear cart if logged out or if employee session
        setCart([]);
        setDiscount(0);
        setCouponCode('');
      }
    };

    loadCart();
  }, [user]);

  // 2. Persist Cart changes to Backend MERN sync
  useEffect(() => {
    // Skip posting on first load mount to prevent overwriting server cart
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const syncCart = async () => {
      if (user && user.role === 'customer') {
        try {
          await fetch(`${API_URL}/auth/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart }),
            credentials: 'include'
          });
        } catch (err) {
          console.error('[CART-SYNC-ERROR]: Syncing cart with DB failed:', err);
        }
      }
    };

    // Debounce/Timeout to avoid spamming the DB on rapid quantity changes
    const timeout = setTimeout(() => {
      syncCart();
    }, 400);

    return () => clearTimeout(timeout);
  }, [cart, user]);

  const areCustomizationsEqual = (c1 = {}, c2 = {}) => {
    const keys1 = Object.keys(c1);
    const keys2 = Object.keys(c2);
    if (keys1.length !== keys2.length) return false;
    return keys1.every(key => c1[key] === c2[key]);
  };

  const addToCart = (item, customizations = {}) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(
        cartItem => cartItem.id === item.id && areCustomizationsEqual(cartItem.customizations, customizations)
      );

      if (existingIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += 1;
        return newCart;
      } else {
        return [...prevCart, { ...item, quantity: 1, customizations }];
      }
    });
  };

  const removeFromCart = (itemId, customizations = {}) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(
        cartItem => cartItem.id === itemId && areCustomizationsEqual(cartItem.customizations, customizations)
      );

      if (existingIndex > -1) {
        const newCart = [...prevCart];
        if (newCart[existingIndex].quantity > 1) {
          newCart[existingIndex].quantity -= 1;
          return newCart;
        } else {
          return newCart.filter((_, idx) => idx !== existingIndex);
        }
      }
      return prevCart;
    });
  };

  const updateQuantity = (itemId, customizations = {}, quantity) => {
    if (quantity <= 0) {
      setCart(prevCart =>
        prevCart.filter(
          cartItem => !(cartItem.id === itemId && areCustomizationsEqual(cartItem.customizations, customizations))
        )
      );
      return;
    }

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(
        cartItem => cartItem.id === itemId && areCustomizationsEqual(cartItem.customizations, customizations)
      );
      if (existingIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingIndex].quantity = quantity;
        return newCart;
      }
      return prevCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCouponCode('');
  };

  const applyCoupon = (code) => {
    const codeUpper = code.toUpperCase();
    if (codeUpper === 'MODEST50') {
      setCouponCode('MODEST50');
      setDiscount(50);
      return { success: true, message: 'Coupon MODEST50 applied! Rs. 50 off.' };
    } else if (codeUpper === 'WELCOME100') {
      setCouponCode('WELCOME100');
      setDiscount(100);
      return { success: true, message: 'Coupon WELCOME100 applied! Rs. 100 off.' };
    }
    return { success: false, message: 'Invalid Coupon Code' };
  };

  const removeCoupon = () => {
    setDiscount(0);
    setCouponCode('');
  };

  // derived calculations
  const cartSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartTax = Math.round((cartSubtotal * 0.05) * 100) / 100;
  const cartDeliveryFee = cartSubtotal > 0 ? 30 : 0;
  const cartGrandTotal = Math.max(0, Math.round((cartSubtotal + cartTax + cartDeliveryFee - discount) * 100) / 100);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
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
        updateQuantity,
        clearCart,
        applyCoupon,
        removeCoupon
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
