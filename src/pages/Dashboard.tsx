import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, CheckCircle, AlertCircle, Loader2, Plus, Trash2, Save } from 'lucide-react';

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
  const { token } = useAuth();

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/grocery/analyze-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ raw_text: rawText }),
      });

      if (!res.ok) throw new Error('Failed to analyze list');
      const data = await res.json();
      setResult(data);
      setItems(data.parsed_items);
    } catch (err: any) {
      setError(err.message);
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
          explanation_text: result.explanation_text
        }),
      });

      if (!res.ok) throw new Error('Failed to save list');
      alert('List saved successfully!');
      setRawText('');
      setResult(null);
      setItems([]);
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
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
          <ShoppingCart className="text-emerald-500" />
          New Grocery List
        </h2>
        <div className="space-y-4">
          <textarea
            className="w-full h-32 bg-gray-900 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save to History
                </button>
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
                      <th className="px-4 py-3 text-right w-32">Price ($)</th>
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
