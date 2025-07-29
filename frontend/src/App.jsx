import React, { useState, useEffect } from 'react';
import Eventos from './Eventos';
import LoginPage from './loginPage';


import './App.css';

function App() {
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('auth');
    if (auth === 'true') setAutenticado(true);
  }, []);

  return (
    <>
      {autenticado ? (
        <Eventos onLogout={() => setAutenticado(false)} />
      ) : (
        <LoginPage onLoginSuccess={() => setAutenticado(true)} />
      )}
    </>
  );
}

export default App;

