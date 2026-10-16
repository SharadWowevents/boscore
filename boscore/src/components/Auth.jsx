import { useState } from 'react';

function Auth({ type, resetToken, setView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [communicationsConsent, setCommunicationsConsent] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (type === 'reset' && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const endpoint = {
      login: '/api/auth/login',
      signup: '/api/auth/signup',
      forgot: '/api/auth/forgot-password',
      reset: '/api/auth/reset-password',
    }[type];

    const payload = type === 'signup'
      ? { name, email, password, mobile, communicationsConsent }
      : type === 'forgot'
        ? { email }
        : type === 'reset'
          ? { token: resetToken, password }
          : { email, password };

    try {
      const response = await fetch(`${endpoint}`, {
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

      if (type === 'forgot') {
        setSuccess(data.msg);
        return;
      }

      if (type === 'reset') {
        setSuccess(data.msg);
        return;
      }

      // Save the JWT token to localStorage
      localStorage.setItem('token', data.token);

      // Navigate to the dashboard
      setView('dashboard');

    } catch (err) {
      setError(err.message || 'Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchView = (newView) => {
    setError('');
    setSuccess('');
    setView(newView);
  };

  const title = {
    login: 'Welcome Back',
    signup: 'Create an Account',
    forgot: 'Forgot Password',
    reset: 'Set a New Password',
  }[type];

  return (
    <div className="auth-container">
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >

        {/* LOGO */}
        <img
          src="/logo.png"
          alt="WOWOS Logo"
          style={{ height: '80px', marginBottom: '50px' }}
        />

        <div className="auth-card">
          <div
            className="brand"
            style={{ textAlign: 'center', marginBottom: '10px' }}
          >
            WOWOS FAST TRACK
          </div>

          <h2 className="auth-title">
            {title}
          </h2>

          {(error || success) && (
            <div
              style={{
                color: error ? '#EF4444' : '#22C55E',
                fontSize: '13px',
                textAlign: 'center',
                marginBottom: '15px',
                background: error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                padding: '8px',
                borderRadius: '6px'
              }}
            >
              {error || success}
            </div>
          )}

          {!success && <form onSubmit={handleSubmit}>

            {type === 'signup' && (
              <>
                <input
                  type="text"
                  placeholder="Full Name"
                  className="auth-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <input
                  type="tel"
                  placeholder="Mobile Number"
                  className="auth-input"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                />
              </>
            )}

            {(type === 'login' || type === 'signup' || type === 'forgot') && (
              <input
                type="email"
                placeholder="Email Address"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}

            {(type === 'login' || type === 'signup' || type === 'reset') && (
              <input
                type="password"
                placeholder={type === 'reset' ? 'New Password (at least 8 characters)' : 'Password'}
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={type === 'reset' ? 8 : undefined}
                required
              />
            )}

            {type === 'reset' && (
              <input
                type="password"
                placeholder="Confirm New Password"
                className="auth-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            )}

            {/* Communication Consent Checkbox */}
            {type === 'signup' && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  margin: '15px 0',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: '#666',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={communicationsConsent}
                  onChange={(e) =>
                    setCommunicationsConsent(e.target.checked)
                  }
                  required
                  style={{
                    marginTop: '3px',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                />

                <span>
                  I agree to the{' '}
                  <a
                    href="https://wowos.in/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#C9890B', textDecoration: 'none' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a
                    href="https://wowos.in/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#C9890B', textDecoration: 'none' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>.
                </span>
              </label>
            )}

            <button
              type="submit"
              className="btn-save"
              style={{
                width: '100%',
                opacity: loading ? 0.7 : 1
              }}
              disabled={loading}
            >
              {loading
                ? 'Processing...'
                : ({
                  login: 'Log In',
                  signup: 'Sign Up',
                  forgot: 'Send Reset Link',
                  reset: 'Reset Password',
                }[type])}
            </button>
          </form>}

          <div className="auth-switch">
            {success && (type === 'forgot' || type === 'reset') ? (
              <p onClick={() => handleSwitchView('login')}>
                Back to <span>Log In</span>
              </p>
            ) : type === 'login' ? (
              <>
                <p onClick={() => handleSwitchView('forgot')}>
                  Forgot your password? <span>Reset it</span>
                </p>
                <p onClick={() => handleSwitchView('signup')}>
                  Don't have an account? <span>Sign Up</span>
                </p>
              </>
            ) : type === 'forgot' || type === 'reset' ? (
              <p onClick={() => handleSwitchView('login')}>
                Back to <span>Log In</span>
              </p>
            ) : (
              <p onClick={() => handleSwitchView('login')}>
                Already have an account? <span>Log In</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;