import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, CheckCircle, AlertCircle, Loader2, Plus, Trash2, Save, History, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";

interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimated_price: number;
}

interface Recommendation {
  parsed_items: ParsedItem[];
  total_estimated_cost: number;
  analysis: {
    total_items: number;
    bulk_items: number;
    categories: Record<string, number>;
  };
  recommended_store: string;
  confidence_score: number;
  explanation_text: string;
}

export const Dashboard: React.FC = () => {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Recommendation | null>(null);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/grocery/grocery-history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRecentActivity(data.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      }
    };
    fetchHistory();
  }, [token]);

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // 1. Get API Key
      const apiKey = (window as any).process?.env?.API_KEY || process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === 'undefined' || apiKey === 'MY_GEMINI_API_KEY') {
        const isAISPreview = (window as any).aistudio;
        if (isAISPreview) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) throw new Error('API_KEY_REQUIRED');
        }
        throw new Error('API_KEY_MISSING');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // 2. Use Gemini to filter and extract ONLY grocery items
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              text: `Extract ONLY the grocery items from the following text: "${rawText}". 
              STRICTLY IGNORE any non-grocery items (like electronics, clothing, tools, or general notes). 
              Return ONLY a comma-separated list of grocery items with their quantities, units, and estimated prices in Indian Rupees (INR) based on your internal knowledge. 
              Example: '2kg rice (₹120), 1 liter milk (₹60), 6 eggs (₹42)'. 
              If NO grocery items are found, return exactly 'NO_ITEMS_FOUND'.
              Do not include any other text.`
            }
          ]
        }
      });

      const filteredText = response.text;
      if (!filteredText || filteredText.trim().length < 2 || filteredText.includes('NO_ITEMS_FOUND')) {
        throw new Error('No grocery items found in your input.');
      }

      // 3. Send to backend for final structured parsing
      const res = await fetch('/api/grocery/analyze-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ raw_text: filteredText }),
      });

      if (!res.ok) {
        let errorMessage = 'Failed to analyze list';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          const text = await res.text().catch(() => '');
          if (text) errorMessage = `Server Error: ${text.substring(0, 100)}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      setResult(data);
      setItems(data.parsed_items);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'API_KEY_REQUIRED') {
        setError('Please select an API key to use AI analysis.');
      } else {
        setError(err.message || 'Failed to analyze list');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setLoading(true);
    try {
      // Recalculate total cost based on edited items
      const totalCost = items.reduce((sum, item) => sum + item.estimated_price, 0);

      const res = await fetch('/api/grocery/save-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          raw_text: rawText,
          parsed_items: items,
          total_estimated_cost: totalCost,
          recommended_store: result.recommended_store,
          confidence_score: result.confidence_score,
          explanation_text: result.explanation_text,
          status: 'saved'
        }),
      });

      if (!res.ok) throw new Error('Failed to save list');
      alert('List saved successfully!');
      setRawText('');
      setResult(null);
      setItems([]);
      
      // Refresh recent activity
      const historyRes = await fetch('/api/grocery/grocery-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setRecentActivity(historyData.slice(0, 3));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, field: keyof ParsedItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const deleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems([...items, { name: 'New Item', quantity: 1, unit: 'qty', category: 'Uncategorized', estimated_price: 0 }]);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* New List Input */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 h-full">
            <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
              <ShoppingCart className="text-emerald-500" />
              New Grocery List
            </h2>
            <div className="space-y-4">
              <textarea
                className="w-full h-48 bg-gray-900 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Enter your list here (e.g., '2kg rice, 1 liter milk, 6 eggs')..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <button
                onClick={handleAnalyze}
                disabled={loading || !rawText.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Analyze List'}
              </button>
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="text-blue-400 w-5 h-5" />
                Recent Activity
              </h3>
              <button 
                onClick={() => navigate('/history')}
                className="text-emerald-400 hover:text-emerald-300 text-xs font-bold uppercase tracking-wider"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="p-4 bg-gray-900/50 rounded-xl border border-gray-700 hover:border-gray-600 transition-all cursor-pointer group" onClick={() => navigate('/history')}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter border ${
                        activity.status === 'ordered' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {activity.status === 'ordered' ? 'Order' : 'List'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 font-medium line-clamp-1 mb-1 group-hover:text-white transition-colors">
                      {activity.parsed_items.length} items from {activity.recommended_store}
                    </p>
                    <p className="text-xs text-emerald-400 font-mono">₹{activity.total_cost.toFixed(2)}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">No recent activity yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recommendation Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-white">Recommendation</h3>
              <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4 mb-4">
                <div className="text-sm text-emerald-400 uppercase tracking-wider font-semibold mb-1">Best Store</div>
                <div className="text-3xl font-bold text-white">{result.recommended_store}</div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Why this store?</div>
                  <p className="text-gray-300 text-sm leading-relaxed">{result.explanation_text}</p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                  <span className="text-gray-400">Estimated Total</span>
                  <span className="text-2xl font-bold text-white">
                    ₹{items.reduce((sum, item) => sum + Number(item.estimated_price), 0).toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Save className="w-4 h-4" />
                    Save List
                  </button>
                  <button
                    onClick={() => {
                      const total = items.reduce((sum, item) => sum + Number(item.estimated_price), 0);
                      navigate('/payment', { state: { 
                        items, 
                        total, 
                        store: result.recommended_store,
                        raw_text: rawText,
                        explanation: result.explanation_text
                      }});
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Edit Items</h3>
                <button onClick={addItem} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-sm">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3 w-24">Qty</th>
                      <th className="px-4 py-3 w-24">Unit</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right w-32">Price (₹)</th>
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
                            className="bg-gray-700 text-xs rounded border-none text-gray-300 focus:ring-0 cursor-pointer"
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
        </div>
      )}
    </div>
  );
};
