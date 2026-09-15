import React, { useState, useEffect } from 'react';
import './App.css';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  // Start with a 'loading' or default state while we check localStorage
  const [currentView, setCurrentView] = useState('loading'); 

  useEffect(() => {
    // Session persistence check on app startup
    const token = localStorage.getItem('token');
    if (token) {
      setCurrentView('dashboard'); // Hold session if token exists
    } else {
      setCurrentView('login'); // Otherwise, prompt user to login
    }
  }, []);

  // Show a blank or loading state while checking the token to prevent flickering
  if (currentView === 'loading') {
    return <div style={{ background: '#0d1117', height: '100vh' }}></div>;
  }

  return (
    <div>
      {currentView === 'login' && <Auth type="login" setView={setCurrentView} />}
      {currentView === 'signup' && <Auth type="signup" setView={setCurrentView} />}
      {currentView === 'dashboard' && <Dashboard setView={setCurrentView} />}
    </div>
  );
}

export default App;