import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button.jsx';
import authConfig from '../../config/auth.json';

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
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Call backend authentication API
      const backend = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${backend}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        // Store authentication state and user info
        localStorage.setItem('dmr_authenticated', 'true');
        localStorage.setItem('dmr_user', credentials.username);
        localStorage.setItem('dmr_user_data', JSON.stringify(data.user));
        navigate('/digital-twins');
      } else {
        setError(data.message || 'Invalid Username or Password. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    }
    
    setIsLoading(false);
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