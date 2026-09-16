import React, { useState } from 'react';
import './App.css';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  // Initialize state by checking if a session token already exists
  const [currentView, setCurrentView] = useState(() => {
    const token = localStorage.getItem('token');
    return token ? 'dashboard' : 'signup';
  }); 

  return (
    <div>
      {currentView === 'login' && <Auth type="login" setView={setCurrentView} />}
      {currentView === 'signup' && <Auth type="signup" setView={setCurrentView} />}
      {currentView === 'dashboard' && <Dashboard setView={setCurrentView} />}
    </div>
  );
}

export default App;