import React, { useState } from 'react';

function Auth({ type, setView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // New state for handling loading and errors
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = type === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const payload = type === 'login' ? { email, password } : { name, email, password };

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Authentication failed');
      }

      // Save the JWT token to localStorage for authenticated requests later
      localStorage.setItem('token', data.token);
      
      // Navigate to the dashboard
      setView('dashboard');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to switch views and clear errors
  const handleSwitchView = (newView) => {
    setError('');
    setView(newView);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="brand" style={{ textAlign: 'center', marginBottom: '10px' }}>
          WOWOS FAST TRACK
        </div>
        <h2 className="auth-title">
          {type === 'login' ? 'Welcome Back' : 'Create an Account'}
        </h2>
        
        {/* Error Message Display */}
        {error && (
          <div style={{ color: '#EF4444', fontSize: '13px', textAlign: 'center', marginBottom: '15px', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '6px' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {type === 'signup' && (
            <input 
              type="text" 
              placeholder="Full Name" 
              className="auth-input" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
            />
          )}
          <input 
            type="email" 
            placeholder="Email Address" 
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="auth-input" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          <button type="submit" className="btn-save" style={{ width: '100%', opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Processing...' : (type === 'login' ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-switch">
          {type === 'login' ? (
             <p onClick={() => handleSwitchView('signup')}>Don't have an account? <span>Sign Up</span></p>
          ) : (
             <p onClick={() => handleSwitchView('login')}>Already have an account? <span>Log In</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;