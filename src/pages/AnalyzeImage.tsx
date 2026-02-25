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
        // 1. Send image to Gemini API for text extraction
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const base64Data = imageData.split(',')[1];
        
        const response = await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              },
              {
                text: "Extract the grocery list from this image. Return ONLY a comma-separated list of items with their quantities and units if visible. Example: '2kg rice, 1 liter milk, 6 eggs'. Do not include any other text."
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
      <div className="max-w-md mx-auto bg-red-900/50 border border-red-700 p-6 rounded-xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="text-xl font-bold text-white">Analysis Failed</h3>
        <p className="text-red-200">{error}</p>
        <button 
          onClick={() => navigate('/camera')}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-white transition-colors"
        >
          Try Again
        </button>
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
              <span className="text-gray-300 font-mono">${item.estimated_price.toFixed(2)}</span>
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
