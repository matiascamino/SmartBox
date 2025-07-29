import { useEffect, useState } from 'react';
import './App.css';
import { Button, Grid, Box, Typography } from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import CircleNotificationsIcon from '@mui/icons-material/CircleNotifications';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import ChangePinModal from './NewPin';


function Eventos({ onLogout }) {
  const [eventos, setEventos] = useState([]);
  const [estadoActual, setEstadoActual] = useState(null);
  const [cerrojoAbierto, setCerrojoAbierto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backendUrl = 'http://172.20.10.5:3000/api/eventos';


  const esp32Url = 'http://172.20.10.7';

  useEffect(() => {
    fetchEventos();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchEventos, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchEventos = async () => {
    try {
      const res = await fetch(backendUrl);
      if (!res.ok) throw new Error('Backend no responde');
      const data = await res.json();
      setEventos(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el backend');
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${esp32Url}/estado`)
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
          setEstadoActual(data);
          // Actualiza el estado del botón según el valor real del cerrojo
          setCerrojoAbierto(data.cerrojo === 'abierto');
        })
        .catch(() => setEstadoActual(null));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const enviarComando = async (comando) => {
    try {
      await fetch(`${esp32Url}/${comando}`);
      setCerrojoAbierto(comando === 'abrir');
      setTimeout(fetchEventos, 2000);
    } catch {
      setError('No se pudo comunicar con el ESP32');
    }
  };

  const eventosAlarma = eventos.filter(e => e.alarma);

  if (loading) return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <span className="loader" />
      <p>Cargando eventos...</p>
    </div>
  );

  return (
    <div className="container-app">
      <button
        onClick={() => {
          localStorage.removeItem('auth');
          if (onLogout) onLogout();
        }}
        className="logout-button"
        style={{
          position: 'absolute',
          top: 24,
          right: 32,
          padding: '0.6rem 1.2rem',
          borderRadius: '8px',
          background: '#FF004C',
          color: '#fff',
          fontWeight: 'bold',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 8px #FF004C33',
          zIndex: 10
        }}
      >
        Cerrar sesión
      </button>
      <div className="container">
        {/* Columna izquierda: eventos con alarma */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '350px' }}>
          <div className="bloque eventos-alarma">
            <h3 style={{ color: 'red', display: 'flex', alignItems: 'center', gap: '0.5em', }}>
              <CircleNotificationsIcon style={{ color: 'red', fontSize: '1.2rem' }} />
              Eventos con Alarma
            </h3>
            <ul aria-label="Eventos con alarma">
              {eventosAlarma.length === 0
                ? <li style={{ color: '#888' }}>Sin alarmas recientes</li>
                : eventosAlarma.map((evento, idx) => (
                  <li key={idx} className="evento-item" style={{ color: 'red', fontWeight: 500 }}>
                    Fecha: {new Date(evento.fecha).toLocaleString('es-AR')} |{' '}
                    Cerrojo: {evento.estado_cerrojo} | Sensor: {evento.estado_sensor}
                  </li>
                ))}
            </ul>
          </div>

          <ChangePinModal />
          
        </div>

        {/* Columna derecha: control y tabla */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Grid container columns={12} spacing={2}>
            <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
              <Box className="bloque dashboard">
                <h2 className="title">Control de Cerrojo</h2>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<LockOpenIcon />}
                    onClick={() => enviarComando('abrir')}
                    disabled={cerrojoAbierto}
                  >
                    Abrir
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<LockIcon />}
                    onClick={() => enviarComando('cerrar')}
                    disabled={!cerrojoAbierto}
                  >
                    Cerrar
                  </Button>
                </div>
              </Box>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
              <Box className="bloque status">
                <h2 className="title">Estado actual del Cerrojo</h2>
                {estadoActual ? (
                  <div style={{ marginTop: '1em' }}>
                    <p>
                      Estado: {estadoActual.cerrojo} | Sensor: {estadoActual.sensor}
                    </p>
                    {estadoActual.alarma && (
                      <Typography color="error" fontWeight="bold">
                        ⚠️ ¡Alarma activa!
                      </Typography>
                    )}
                  </div>
                ) : (
                  <p style={{ color: '#aaa' }}>Sin conexión con el dispositivo</p>
                )}
              </Box>
            </Grid>
          </Grid>

          {error && <p style={{ color: 'red' }} aria-live="polite">{error}</p>}

          {/* Tabla de eventos recientes */}
          <div className="bloque eventos">
            <h3>Eventos recientes</h3>
            <TableContainer component={Paper} className="tabla-eventos-container">
              <Table className="tabla-eventos" size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Cerrojo</TableCell>
                    <TableCell>Sensor</TableCell>
                    <TableCell>Alarma</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventos.map((evento, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{new Date(evento.fecha).toLocaleString()}</TableCell>
                      <TableCell>{evento.estado_cerrojo}</TableCell>
                      <TableCell>{evento.estado_sensor}</TableCell>
                      <TableCell className={evento.alarma ? 'alarma-activa' : 'alarma-inactiva'}>
                        {evento.alarma ? 'Sí' : 'No'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Eventos;



