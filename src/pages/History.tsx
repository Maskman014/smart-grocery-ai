import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

interface HistoryItem {
  id: number;
  created_at: string;
  total_cost: number;
  recommended_store: string;
  parsed_items: any[];
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export const History: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/grocery/grocery-history', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Prepare Chart Data
  const storeData = history.reduce((acc: any, item) => {
    acc[item.recommended_store] = (acc[item.recommended_store] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(storeData).map((key) => ({
    name: key,
    value: storeData[key],
  }));

  const costData = history.slice(0, 10).reverse().map(item => ({
    date: new Date(item.created_at).toLocaleDateString(),
    cost: item.total_cost
  }));

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Shopping History</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cost Trend Chart */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-lg font-bold mb-6 text-white">Spending Trend (Last 10 Trips)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                  itemStyle={{ color: '#10B981' }}
                />
                <Bar dataKey="cost" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Store Preference Chart */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-lg font-bold mb-6 text-white">Store Recommendations</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">Recent Lists</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Recommended Store</th>
                <th className="px-6 py-3 text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 text-gray-300">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-gray-300">{item.parsed_items.length} items</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-emerald-400 border border-gray-600">
                      {item.recommended_store}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-white font-medium">${item.total_cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
