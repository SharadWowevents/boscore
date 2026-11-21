import { useState } from 'react';
import './App.css';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  // Initialize state by checking URL params and session token
  const [currentView, setCurrentView] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('resetToken')) return 'reset';

    // Check if mode is explicitly requested in URL (e.g. ?mode=login from email CTA)
    const mode = searchParams.get('mode') || searchParams.get('view') || searchParams.get('auth');
    const token = localStorage.getItem('token');

    if (mode === 'login') {
      return token ? 'dashboard' : 'login';
    }

    if (mode === 'signup') {
      return token ? 'dashboard' : 'signup';
    }

    // Default behavior when user opens website directly in browser:
    // If logged in -> dashboard, otherwise default to signup
    return token ? 'dashboard' : 'signup';
  }); 

  return (
    <div>
      {currentView === 'login' && <Auth type="login" setView={setCurrentView} />}
      {currentView === 'signup' && <Auth type="signup" setView={setCurrentView} />}
      {currentView === 'forgot' && <Auth type="forgot" setView={setCurrentView} />}
      {currentView === 'reset' && (
        <Auth
          type="reset"
          resetToken={new URLSearchParams(window.location.search).get('resetToken')}
          setView={setCurrentView}
        />
      )}
      {currentView === 'dashboard' && <Dashboard setView={setCurrentView} />}
    </div>
  );
}

export default App;
