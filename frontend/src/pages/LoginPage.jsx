import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('--- [DEBUG] handleLogin function started ---'); // ΚΑΤΑΣΚΟΠΟΣ #1

    try {
      console.log(`--- [DEBUG] Trying to log in with email: ${email}`); // ΚΑΤΑΣΚΟΠΟΣ #2
      const response = await axios.post('http://localhost:3000/api/users/login', { email, password });
      
      console.log('--- [DEBUG] Login API call was successful! ---', response.data); // ΚΑΤΑΣΚΟΠΟΣ #3

      login(response.data.token);
      navigate('/dashboard');
    } catch (err) {
      console.error('--- [DEBUG] ERROR during login API call:', err); // ΚΑΤΑΣΚΟΠΟΣ #4
      setError(err.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <div className="login-container">
      <h2>Erasmos App Login</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Login</button>
      </form>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default LoginPage;