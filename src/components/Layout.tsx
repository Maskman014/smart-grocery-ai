import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, LogOut, History, Home, Camera } from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 text-emerald-400 font-bold text-xl">
                <ShoppingCart className="w-6 h-6" />
                Smart Grocery AI
              </Link>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <Link
                    to="/dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === '/dashboard' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Home className="inline-block w-4 h-4 mr-1" />
                    Dashboard
                  </Link>
                  <Link
                    to="/camera"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === '/camera' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Camera className="inline-block w-4 h-4 mr-1" />
                    Scan
                  </Link>
                  <Link
                    to="/history"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === '/history' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <History className="inline-block w-4 h-4 mr-1" />
                    History
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Welcome, {user?.username}</span>
              <button
                onClick={logout}
                className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
