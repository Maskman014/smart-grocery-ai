import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, Building2, CheckCircle2, ArrowLeft, Loader2, ShieldCheck, Banknote, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Payment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { items, total, store, raw_text, explanation } = location.state || { items: [], total: 0, store: 'Unknown Store', raw_text: '', explanation: '' };

  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking' | 'cod'>('upi');
  const [address, setAddress] = useState({ street: '', city: '', pincode: '' });
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const isAddressValid = address.street.trim() !== '' && address.city.trim() !== '' && address.pincode.trim().length >= 6;

  const handlePayment = async () => {
    if (!isAddressValid) return;
    setProcessing(true);
    
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Save the order to history
      const res = await fetch('/api/grocery/save-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          raw_text: raw_text || '',
          parsed_items: items,
          total_estimated_cost: total,
          recommended_store: store,
          confidence_score: 1.0,
          explanation_text: explanation || `Ordered from ${store} for delivery to ${address.street}, ${address.city}`,
          status: 'ordered'
        }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        throw new Error('Failed to save order history');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center space-y-6 bg-gray-800 p-8 rounded-2xl border border-emerald-500/30 shadow-2xl">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-bold text-white">Order Placed!</h2>
        <p className="text-gray-400">
          Your order from <span className="text-emerald-400 font-bold">{store}</span> has been confirmed.
          {method === 'cod' ? ' Please keep the cash ready for delivery.' : ' Payment was successful.'}
        </p>
        <div className="bg-gray-900/50 p-4 rounded-xl text-left border border-gray-700">
          <p className="text-xs text-gray-500 uppercase font-bold mb-2">Delivery Address</p>
          <p className="text-sm text-gray-300">{address.street}, {address.city} - {address.pincode}</p>
        </div>
        <button
          onClick={() => navigate('/history')}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all"
        >
          View Order History
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-3xl font-bold text-white">Checkout</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Address Section */}
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5 text-emerald-500" />
              <h3 className="text-xl font-bold text-white">Delivery Address</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Street Address</label>
                <input
                  type="text"
                  placeholder="House No, Building, Street Name"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">City</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Pincode</label>
                <input
                  type="text"
                  placeholder="6-digit Pincode"
                  maxLength={6}
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-6">Select Payment Method</h3>
            
            <div className="space-y-4">
              <button
                onClick={() => setMethod('upi')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                  method === 'upi' ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${method === 'upi' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white">UPI (GPay, PhonePe, Paytm)</div>
                    <div className="text-xs text-gray-500">Pay directly from your bank account</div>
                  </div>
                </div>
                {method === 'upi' && <div className="w-4 h-4 rounded-full bg-emerald-500" />}
              </button>

              <button
                onClick={() => setMethod('card')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                  method === 'card' ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${method === 'card' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white">Credit / Debit Card</div>
                    <div className="text-xs text-gray-500">Visa, Mastercard, RuPay supported</div>
                  </div>
                </div>
                {method === 'card' && <div className="w-4 h-4 rounded-full bg-emerald-500" />}
              </button>

              <button
                onClick={() => setMethod('cod')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                  method === 'cod' ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${method === 'cod' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white">Cash on Delivery</div>
                    <div className="text-xs text-gray-500">Pay when your groceries arrive</div>
                  </div>
                </div>
                {method === 'cod' && <div className="w-4 h-4 rounded-full bg-emerald-500" />}
              </button>

              <button
                onClick={() => setMethod('netbanking')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                  method === 'netbanking' ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${method === 'netbanking' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white">Net Banking</div>
                    <div className="text-xs text-gray-500">All major Indian banks available</div>
                  </div>
                </div>
                {method === 'netbanking' && <div className="w-4 h-4 rounded-full bg-emerald-500" />}
              </button>
            </div>
          </div>

          <div className="bg-emerald-900/20 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <p className="text-sm text-emerald-200/70">Your payment is secured with 256-bit SSL encryption. We do not store your card details.</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg sticky top-6 space-y-6">
            <h3 className="text-xl font-bold text-white">Order Summary</h3>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-400">{item.quantity}x {item.name}</span>
                  <span className="text-white font-mono">₹{item.estimated_price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-700 space-y-3">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Delivery Fee</span>
                <span className="text-emerald-400">FREE</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-2">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-xs text-gray-500 mb-4 text-center">Ordering from <span className="text-emerald-400 font-bold">{store}</span></div>
              <button
                onClick={handlePayment}
                disabled={processing || !isAddressValid}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>{method === 'cod' ? 'Place Order' : `Pay ₹${total.toFixed(2)} Now`}</>
                )}
              </button>
              {!isAddressValid && (
                <p className="text-[10px] text-red-400 mt-2 text-center">Please fill in your delivery address to proceed</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
