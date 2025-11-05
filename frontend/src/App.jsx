import React, { useState, useEffect } from 'react';
import Eventos from './Eventos';
import EventosUsuario from './EventosUsuario';
import LoginPage from './loginPage';

function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [rol, setRol] = useState('');

  useEffect(() => {
    const authStr = localStorage.getItem('auth');
    if (authStr) {
      const auth = JSON.parse(authStr);
      if (auth.rol) {
        setRol(auth.rol);
        setAutenticado(true);
      }
    }
  }, []);

  const login = (rolUsuario) => {
    setRol(rolUsuario);
    setAutenticado(true);
  };

  const logout = () => {
    localStorage.removeItem('auth');
    setAutenticado(false);
    setRol('');
  };

  if (!autenticado) {
    return <LoginPage onLoginSuccess={login} />;
  }

  return rol === 'admin' ? (
    <Eventos onLogout={logout} />
  ) : (
    <EventosUsuario onLogout={logout} />
  );
}

export default App;
