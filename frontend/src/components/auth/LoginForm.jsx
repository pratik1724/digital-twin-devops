import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button.jsx';

export function LoginForm() {
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Backend base URL
      const backend =
        process.env.REACT_APP_BACKEND_URL?.trim() ||
        'http://13.202.218.246:8001';

      const response = await fetch(`${backend}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      // ✅ Handle non-200 responses safely
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.success && data.user) {
        // Store auth state
        localStorage.setItem('dmr_authenticated', 'true');
        localStorage.setItem('dmr_user', data.user.username);
        localStorage.setItem('dmr_user_data', JSON.stringify(data.user));

        navigate('/digital-twins');
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="form-group">
        <label htmlFor="username" className="form-label">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          value={credentials.username}
          onChange={handleInputChange}
          className="form-input"
          placeholder="Enter username"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={credentials.password}
          onChange={handleInputChange}
          className="form-input"
          placeholder="Enter password"
          required
        />
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading || !credentials.username || !credentials.password}
        className="login-button"
      >
        {isLoading ? 'Signing in...' : 'Login'}
      </Button>
    </form>
  );
}
