import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

export const CameraCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure you have granted permissions.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setImage(imageData);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;
    setLoading(true);
    
    // In a real app, we would send this to a vision API
    // For this hackathon, we'll simulate the AI "reading" the image
    // by navigating to the analysis page with mock data or the image itself
    
    // Navigate to analysis page with the image data
    // We'll use state to pass the data
    navigate('/analyze', { state: { image } });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
          <Camera className="text-emerald-500" />
          Capture Grocery List
        </h2>

        {!image ? (
          <div className="space-y-6">
            {stream ? (
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={captureImage}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-emerald-500 flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <div className="w-12 h-12 bg-emerald-500 rounded-full" />
                </button>
                <button
                  onClick={stopCamera}
                  className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-xl hover:border-emerald-500 hover:bg-gray-700/50 transition-all group"
                >
                  <Camera className="w-12 h-12 text-gray-400 group-hover:text-emerald-500 mb-4" />
                  <span className="text-gray-300 font-medium">Open Camera</span>
                </button>
                
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-xl hover:border-emerald-500 hover:bg-gray-700/50 transition-all group cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 group-hover:text-emerald-500 mb-4" />
                  <span className="text-gray-300 font-medium">Upload Image</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative rounded-lg overflow-hidden aspect-video bg-black">
              <img src={image} alt="Captured" className="w-full h-full object-contain" />
              <button
                onClick={() => setImage(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <button
              onClick={processImage}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Analyze Image'}
            </button>
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
