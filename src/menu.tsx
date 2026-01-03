import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Sidebar from './assets/components/sidebar';
import '../src/assets/css/menu.css';
import {  FaShoppingCart } from 'react-icons/fa';

interface Product {
  product_id: number;
  product_name: string;
  category_id: number;
  price: number;
  image_url: string;
  stock: number;
  status?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Category {
  category_id: number;
  category_name: string;
}

const Menu = () => {
  const [activeFilter, setActiveFilter] = useState<number | 'All'>('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [amountGiven, setAmountGiven] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const changeDue = amountGiven !== null ? amountGiven - totalAmount : 0;

  // ------------------ USER ------------------
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    };
    getUser();
  }, []);

  // ------------------ FETCH CATEGORIES ------------------
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (!error) setCategories(data || []);
    };
    fetchCategories();
  }, []);

  // ------------------ FETCH PRODUCTS ------------------
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(category_name)');
      if (!error) {
        const formatted = (data || []).map(p => ({
          ...p,
          status: p.status?.toLowerCase() || 'available',
        }));
        setProducts(formatted);
      }
    };
    fetchProducts();
  }, []);

  // ------------------ CART HANDLERS ------------------
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0 || product.status !== 'available') return;

    setCart(prev => {
      const existing = prev.find(item => item.product.product_id === product.product_id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item =>
          item.product.product_id === product.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (id: number, qty: number) => {
    setCart(prev =>
      prev.map(item =>
        item.product.product_id === id
          ? { ...item, quantity: Math.min(qty, item.product.stock) }
          : item
      )
    );
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.product.product_id !== id));
  };

  // Open cart modal when cart has items
  useEffect(() => {
    if (cart.length > 0) setShowCartModal(true);
  }, [cart]);

  // ------------------ CHECKOUT HANDLERS ------------------
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Your cart is empty. Please add items before checkout.');
      return;
    }
    setShowCheckoutModal(true);
  };

  const closeCheckoutModal = () => {
    setShowCheckoutModal(false);
    setAmountGiven(null);
  };

  const handleAmountClick = (amount: number) => {
    setAmountGiven(amount);
  };

  const handleConfirmPayment = async () => {
    if (!userId) return;

    if (cart.length === 0) {
      alert('Your cart is empty. Cannot proceed with checkout.');
      return;
    }

    if (amountGiven === null) {
      alert('Please enter the amount given.');
      return;
    }

    if (changeDue < 0) {
      alert(`Insufficient amount. You still need ₱${Math.abs(changeDue)} more.`);
      return;
    }

    try {
      // STOCK VALIDATION
      for (const item of cart) {
        if (item.quantity > item.product.stock) {
          alert(`Not enough stock for ${item.product.product_name}`);
          return;
        }
      }

      // INSERT SALE
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([
          {
            total_amount: totalAmount,
            cash_received: amountGiven,
            change_amount: changeDue,
            user_id: userId,
          },
        ])
        .select()
        .single();

      if (saleError) throw saleError;

      // INSERT SALE ITEMS + UPDATE PRODUCT STOCK
      for (const item of cart) {
        await supabase.from('sales_items').insert({
          sale_id: saleData.sale_id,
          product_id: item.product.product_id,
          quantity: item.quantity,
          price: item.product.price,
          subtotal: item.product.price * item.quantity,
        });

        await supabase
          .from('products')
          .update({ stock: item.product.stock - item.quantity })
          .eq('product_id', item.product.product_id);
      }

      // RESET UI
      setCart([]);
      setAmountGiven(null);
      setShowCheckoutModal(false);
      setShowCartModal(false);

      // REFRESH PRODUCTS
      const { data: refreshedProducts } = await supabase.from('products').select('*');
      setProducts(refreshedProducts || []);

      alert('Payment Successful!');
    } catch (err) {
      console.error(err);
      alert('Checkout failed.');
    }
  };

  // ------------------ FILTERED PRODUCTS ------------------
  const filteredProducts = products.filter(product => {
    const categoryMatch = activeFilter === 'All' || product.category_id === activeFilter;
    const searchMatch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const statusOk = product.status === 'available' && product.stock > 0;
    return categoryMatch && searchMatch && statusOk;
  });

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="dashboard__content">
        {/* FILTER & SEARCH */}
        <div className="filter">
          <ul className="filter__list">
            <li className={activeFilter === 'All' ? 'active' : ''} onClick={() => setActiveFilter('All')}>
              All
            </li>
            {categories.map(category => (
              <li
                key={category.category_id}
                className={activeFilter === category.category_id ? 'active' : ''}
                onClick={() => setActiveFilter(category.category_id)}
              >
                {category.category_name}
              </li>
            ))}
          </ul>

          <div className="search-cart-row">
            <div className="search__box">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <button className="cart-btn" onClick={() => setShowCartModal(true)}>
              <FaShoppingCart />
              {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
            </button>
          </div>
        </div>

        {/* PRODUCTS */}
        <div className="dashboard__items">
          {filteredProducts.map(product => (
            <div className="dashboard__item card" key={product.product_id}>
              <img className="card-img" src={product.image_url} alt={product.product_name} />
              <div className="card-body">
                <h3 className="card-title">{product.product_name}</h3>
                <p className="card-price">₱{product.price}</p>
                <button
                  disabled={product.stock <= 0 || product.status !== 'available'}
                  onClick={() => handleAddToCart(product)}
                  style={{
                    backgroundColor: product.stock <= 0 || product.status !== 'available' ? '#aaa' : '',
                    cursor: product.stock <= 0 || product.status !== 'available' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {product.stock <= 0
                    ? 'Out of Stock'
                    : product.status !== 'available'
                    ? 'Unavailable'
                    : 'Add to Cart'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* SIDE CART */}
        {showCartModal && (
          <>
            <div className="cart-overlay" onClick={() => setShowCartModal(false)} />
            <div className="side-cart">
              <div className="side-cart-header">
                <h2>Your Cart</h2>
                <button className="close-btn" onClick={() => setShowCartModal(false)}>
                  ✕
                </button>
              </div>

              <div className="side-cart-body">
                {cart.length === 0 ? (
                  <p>Your cart is empty.</p>
                ) : (
                  cart.map(item => (
                    <div key={item.product.product_id} className="cart-item">
                      <img className="cart-img" src={item.product.image_url} alt={item.product.product_name} />
                      <div className="cart-details">
                        <h4>{item.product.product_name}</h4>
                        <p>₱{item.product.price}</p>
                        <div className="cart-qty">
                          <button
                            onClick={() =>
                              updateCartQuantity(item.product.product_id, Math.max(1, item.quantity - 1))
                            }
                          >
                            -
                          </button>
                          <span className="count">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateCartQuantity(item.product.product_id, item.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                        <button className="remove-btn" onClick={() => removeFromCart(item.product.product_id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="side-cart-footer">
                <p>Total: ₱{totalAmount}</p>
                <button className="checkout-btn" onClick={handleCheckout}>
                  Checkout
                </button>
              </div>
            </div>
          </>
        )}

        {/* CHECKOUT MODAL */}
        {showCheckoutModal && (
          <div className="checkout-overlay">
            <div className="checkout-modal">
              <h2>Checkout</h2>
              <div className="checkout-total">
                Total Amount: <span>₱{totalAmount}</span>
              </div>

              <div className="amount-section">
                <p>Amount Given</p>
                <div className="amount-buttons">
                  {[50, 100, 500, 1000].map(amount => (
                    <button
                      key={amount}
                      className={amountGiven === amount ? 'active' : ''}
                      onClick={() => handleAmountClick(amount)}
                    >
                      ₱{amount}
                    </button>
                  ))}
                </div>

                <div
                  className="amount-exact-input"
                  style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span>Exact Amount:</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={amountGiven === null ? '' : amountGiven}
                    onChange={e => setAmountGiven(e.target.value === '' ? null : Number(e.target.value))}
                    style={{
                      width: '120px',
                      backgroundColor: '#fff',
                      color: '#250909',
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px solid #6f4e37',
                      fontSize: '1rem',
                    }}
                    placeholder="Enter amount"
                  />
                </div>

                <div
                  className="amount-numpad"
                  style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px', maxWidth: '220px' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                    <button
                      key={num}
                      style={{
                        width: '48px',
                        height: '38px',
                        fontSize: '1.1rem',
                        borderRadius: '6px',
                        background: '#f4f4f4',
                        border: '1px solid #6f4e37',
                        color: '#250909',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setAmountGiven(prev => {
                          const prevStr = prev === null ? '' : String(prev);
                          const newStr = prevStr === '0' ? String(num) : prevStr + String(num);
                          return Number(newStr);
                        });
                      }}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    style={{
                      width: '104px',
                      height: '38px',
                      fontSize: '1.1rem',
                      borderRadius: '6px',
                      background: '#e53935',
                      border: '1px solid #6f4e37',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                    onClick={() => setAmountGiven(null)}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {amountGiven !== null && (
                <div className="change">Change: <span>₱{changeDue >= 0 ? changeDue : 0}</span></div>
              )}

              <div className="checkout-actions">
                <button className="cancel" onClick={closeCheckoutModal}>Cancel</button>
                <button className="confirm" disabled={amountGiven === null || changeDue < 0} onClick={handleConfirmPayment}>
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
