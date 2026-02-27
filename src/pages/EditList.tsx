import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Save, ShoppingCart, Loader2, ArrowLeft } from 'lucide-react';

interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimated_price: number;
}

interface Recommendation {
  recommended_store: string;
  confidence_score: number;
  explanation_text: string;
  total_estimated_cost: number;
  analysis: any;
  raw_text?: string;
}

export const EditList: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  useEffect(() => {
    if (location.state?.initialItems) {
      setItems(location.state.initialItems);
      setRawText(location.state.rawText || '');
      // Trigger initial recommendation calculation
      calculateRecommendation(location.state.initialItems);
    } else {
      // Fallback or redirect if accessed directly
      navigate('/dashboard');
    }
  }, [location.state, navigate]);

  const calculateRecommendation = async (currentItems: ParsedItem[]) => {
    // We can reuse the analyze endpoint or create a specific one for just recommendation
    // For now, let's just re-analyze the text representation of the items
    // Or better, since we have the items, we should have an endpoint that accepts items directly
    // But to keep it simple with existing endpoints, we'll construct a text representation
    
    const text = currentItems.map(i => `${i.quantity}${i.unit !== 'qty' ? i.unit : ''} ${i.name}`).join(', ');
    
    try {
      const res = await fetch('/api/grocery/analyze-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ raw_text: text }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setRecommendation(data);
      }
    } catch (err) {
      console.error("Failed to update recommendation", err);
    }
  };

  const updateItem = (index: number, field: keyof ParsedItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    // Debounce recommendation update in a real app
  };

  const deleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { name: 'New Item', quantity: 1, unit: 'qty', category: 'Uncategorized', estimated_price: 0 }]);
  };

  const handleSave = async () => {
    if (!recommendation) {
        await calculateRecommendation(items); // Ensure we have a recommendation before saving
    }
    
    setLoading(true);
    try {
      const totalCost = items.reduce((sum, item) => sum + Number(item.estimated_price), 0);

      // We need to ensure recommendation is available. If calculateRecommendation is async and state update hasn't happened yet, 
      // we might need to await the fetch result directly. 
      // For safety, let's re-fetch the analysis one last time to be sure we have the latest recommendation for the DB
      
      const text = items.map(i => `${i.quantity}${i.unit !== 'qty' ? i.unit : ''} ${i.name}`).join(', ');
      const analysisRes = await fetch('/api/grocery/analyze-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ raw_text: text }),
      });
      const finalAnalysis = await analysisRes.json();

      const res = await fetch('/api/grocery/save-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          raw_text: text, // Use the constructed text from current items
          parsed_items: items,
          total_estimated_cost: totalCost,
          recommended_store: finalAnalysis.recommended_store,
          confidence_score: finalAnalysis.confidence_score,
          explanation_text: finalAnalysis.explanation_text,
          status: 'saved'
        }),
      });

      if (!res.ok) throw new Error('Failed to save list');
      navigate('/history');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <h2 className="text-2xl font-bold text-white">Edit Grocery List</h2>
        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items Table */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Items</h3>
              <button onClick={addItem} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-sm">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 w-20">Qty</th>
                    <th className="px-4 py-3 w-20">Unit</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right w-24">Price (₹)</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          className="bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none text-white w-full"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value))}
                          className="bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none text-gray-300 w-full"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          className="bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none text-gray-300 w-full"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(idx, 'category', e.target.value)}
                          className="bg-gray-700 text-xs rounded border-none text-gray-300 focus:ring-0 cursor-pointer w-full"
                        >
                          <option>Dairy</option>
                          <option>Bakery</option>
                          <option>Produce</option>
                          <option>Meat</option>
                          <option>Grains</option>
                          <option>Uncategorized</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.estimated_price}
                          onChange={(e) => updateItem(idx, 'estimated_price', parseFloat(e.target.value))}
                          className="bg-transparent border-b border-transparent focus:border-emerald-500 focus:outline-none text-gray-300 w-full text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => deleteItem(idx)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 sticky top-6">
            <h3 className="text-xl font-bold mb-6 text-white">Summary</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Items</span>
                <span className="text-white font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                <span className="text-gray-400">Estimated Total</span>
                <span className="text-3xl font-bold text-white">
                  ₹{items.reduce((sum, item) => sum + Number(item.estimated_price), 0).toFixed(2)}
                </span>
              </div>
            </div>

            {recommendation && (
               <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4 mb-6">
                 <div className="text-xs text-emerald-400 uppercase tracking-wider font-semibold mb-1">Recommended Store</div>
                 <div className="text-xl font-bold text-white mb-2">{recommendation.recommended_store}</div>
                 <p className="text-xs text-gray-400 leading-relaxed">{recommendation.explanation_text}</p>
               </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Save List'}
                {!loading && <Save className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  const total = items.reduce((sum, item) => sum + Number(item.estimated_price), 0);
                  // Construct raw text from current items to ensure it matches
                  const currentRawText = items.map(i => `${i.quantity}${i.unit !== 'qty' ? i.unit : ''} ${i.name}`).join(', ');
                  
                  navigate('/payment', { state: { 
                    items, 
                    total, 
                    store: recommendation?.recommended_store || 'Selected Store',
                    raw_text: currentRawText,
                    explanation: recommendation?.explanation_text || ''
                  }});
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <ShoppingCart className="w-5 h-5" />
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
