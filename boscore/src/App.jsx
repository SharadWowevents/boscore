import React, { useState } from 'react';
import './App.css';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  // 'login', 'signup', or 'dashboard'
  const [currentView, setCurrentView] = useState('login'); 

  return (
    <div>
      {currentView === 'login' && <Auth type="login" setView={setCurrentView} />}
      {currentView === 'signup' && <Auth type="signup" setView={setCurrentView} />}
      {currentView === 'dashboard' && <Dashboard setView={setCurrentView} />}
    </div>
  );
}

export default App;