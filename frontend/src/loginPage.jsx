// src/pages/LoginPage.jsx
import { useState } from 'react';
import logo from './logo/logo-Smartbox.png'; 

function LoginPage({ onLoginSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'PIN incorrecto');

      // Guardar autenticación en localStorage
      localStorage.setItem('auth', 'true');
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleSubmit}>
        <img src={logo} alt="Smartbox Logo" className="login-logo" />
        <h2>🔐 Ingresar PIN</h2>
        <input
          type="password"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="login-input"
        />
        <button type="submit" className="login-button">Ingresar</button>
        {error && <p className="login-error">{error}</p>}
      </form>
    </div>
  );
}

export default LoginPage;

