import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimated_price: number;
}

interface AnalysisResult {
  parsed_items: ParsedItem[];
  raw_text: string;
}

export const AnalyzeImage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const processImage = async () => {
      const imageData = location.state?.image;
      if (!imageData) {
        navigate('/camera');
        return;
      }

      try {
        // 1. Get API Key
        let apiKey = process.env.GEMINI_API_KEY;
        
        // Fallback for platform-specific key selection if available
        if (!apiKey && (window as any).aistudio) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
            setError('API_KEY_REQUIRED');
            setLoading(false);
            return;
          }
          // The platform injects the key into process.env.API_KEY or similar
          // In this environment, we assume it's handled if hasSelectedApiKey is true
        }

        if (!apiKey || apiKey === 'undefined' || apiKey === 'MY_GEMINI_API_KEY') {
          setError('API_KEY_MISSING');
          setLoading(false);
          return;
        }

        const ai = new GoogleGenAI({ apiKey });
        const base64Data = imageData.split(',')[1];
        
        const response = await ai.models.generateContent({
          model: "gemini-flash-latest",
          config: {
            tools: [{ googleSearch: {} }]
          },
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              },
              {
                text: "Extract the grocery list from this image. Then, use Google Search to find the CURRENT AVERAGE PRICES in Indian Rupees (INR) for these items in major Indian supermarkets (like BigBasket, Reliance Fresh, or DMart). Return ONLY a comma-separated list of items with their quantities, units, and estimated prices in INR. Example: '2kg rice (₹120), 1 liter milk (₹60), 6 eggs (₹42)'. Do not include any other text."
              }
            ]
          }
        });

        const extractedText = response.text;
        
        // 2. Send extracted text to our backend for parsing/pricing
        const res = await fetch('/api/grocery/analyze-list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ raw_text: extractedText }),
        });

        if (!res.ok) throw new Error('Failed to analyze list structure');
        const data = await res.json();
        
        setResult({
          parsed_items: data.parsed_items,
          raw_text: extractedText || ''
        });
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to process image");
      } finally {
        setLoading(false);
      }
    };

    processImage();
  }, [location.state, navigate, token]);

  const handleConfirm = () => {
    if (result) {
      navigate('/edit-list', { state: { 
        initialItems: result.parsed_items,
        rawText: result.raw_text
      }});
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="text-gray-300 text-lg animate-pulse">Analyzing image with AI...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700 text-center space-y-6">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
          
          {error === 'API_KEY_REQUIRED' ? (
            <>
              <h3 className="text-2xl font-bold text-white">API Key Required</h3>
              <p className="text-gray-300">This feature requires a Gemini API key to process images.</p>
              <button 
                onClick={async () => {
                  await (window as any).aistudio.openSelectKey();
                  window.location.reload();
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-bold transition-colors"
              >
                Select API Key
              </button>
            </>
          ) : error === 'API_KEY_MISSING' ? (
            <div className="text-left space-y-4">
              <h3 className="text-2xl font-bold text-white text-center">Local Setup Required</h3>
              <p className="text-gray-300">It looks like you're running this locally. To use AI image analysis, you need to configure your Gemini API key.</p>
              
              <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm text-emerald-400 border border-gray-700">
                <p className="mb-2 text-gray-500"># 1. Create a .env file in root</p>
                <p className="mb-2 text-gray-500"># 2. Add your key:</p>
                <p>GEMINI_API_KEY=your_key_here</p>
              </div>
              
              <div className="flex flex-col gap-2">
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline text-sm inline-flex items-center gap-1"
                >
                  Get a free API key from Google AI Studio →
                </a>
                <p className="text-xs text-gray-500">After adding the key, restart your dev server (npm run dev).</p>
              </div>
              
              <button 
                onClick={() => navigate('/camera')}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold transition-colors mt-4"
              >
                Go Back
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-white">Analysis Failed</h3>
              <p className="text-red-200">{error}</p>
              <button 
                onClick={() => navigate('/camera')}
                className="w-full py-3 bg-red-700 hover:bg-red-600 rounded-lg text-white font-bold transition-colors"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckCircle className="text-emerald-500" />
            Items Found
          </h2>
        </div>

        <div className="space-y-4 mb-8">
          {result?.parsed_items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-gray-600 rounded-full text-sm font-bold text-emerald-400">
                  {item.quantity}
                </span>
                <div>
                  <p className="font-medium text-white capitalize">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.unit !== 'qty' ? item.unit : ''} • {item.category}</p>
                </div>
              </div>
              <span className="text-gray-300 font-mono">₹{item.estimated_price.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate('/camera')}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Retake Photo
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
          >
            Review & Edit <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
