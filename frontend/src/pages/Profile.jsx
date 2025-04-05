// src/pages/Profile.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { auth } from '../utils/auth';

const Profile = () => {
  const user = auth.getCurrentUser();
  const navigate = useNavigate();
  
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  
  const handleLogout = () => {
    auth.logout();
    toast.info('You have been logged out');
    navigate('/login');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate updating profile
    setTimeout(() => {
      // In a real app, you would update the user profile
      toast.success('Profile updated successfully!');
      setLoading(false);
    }, 1000);
  };
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                User Profile
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                Manage your account details
              </p>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email cannot be changed</p>
                </div>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => navigate('/chat')}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:hover:bg-gray-700"
                  >
                    Go to Chat
                  </button>
                </div>
              </form>
              
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleLogout}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;