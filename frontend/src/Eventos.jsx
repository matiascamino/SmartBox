import { useEffect, useState } from 'react';
import './App.css';
import { Button, Box, Typography, MenuItem, Select, FormControl, InputLabel, Collapse } from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
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
  const [cajas, setCajas] = useState([
    { numero: 1, estado: null, cerrojoAbierto: false, real: true },
    { numero: 2, estado: { cerrojo: 'cerrado', sensor: 'cerrado', alarma: false }, cerrojoAbierto: false, real: false },
    { numero: 3, estado: { cerrojo: 'cerrado', sensor: 'cerrado', alarma: false }, cerrojoAbierto: false, real: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroCaja, setFiltroCaja] = useState('');
  const [filtroOrigen, setFiltroOrigen] = useState('');
  const [filtroAlarma, setFiltroAlarma] = useState('');
  const [filtroCerrojo, setFiltroCerrojo] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [simulandoSensor, setSimulandoSensor] = useState(false);

  const backendUrl = 'http://172.20.10.3:3000/api/eventos';
  const esp32Url = 'http://172.20.10.2';

  // Carga inicial de eventos
  useEffect(() => {
    fetchEventos();
  }, []);

  // Refresco de eventos cada 3 segundos
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

  const fetchCajaReal = async () => {
    if (simulandoSensor) return; // ⛔ No pisar el estado simulado
    try {
      const res = await fetch(`${esp32Url}/estado?caja=1`);
      if (!res.ok) return;
      const data = await res.json();
      setCajas(prev =>
        prev.map(c =>
          c.numero === 1 ? { ...c, estado: data, cerrojoAbierto: data.cerrojo === 'abierto' } : c
        )
      );
    } catch {}
  };

  // Refresco del estado de la caja real (caja 1)
  useEffect(() => {
    const interval = setInterval(fetchCajaReal, 1000);
    return () => clearInterval(interval);
  }, []);

  const enviarComando = async (comando, numeroCaja) => {
    const caja = cajas.find(c => c.numero === numeroCaja);
    setSimulandoSensor(false);

    if (caja.real) {
      try {
        await fetch(`${esp32Url}/${comando}?caja=${numeroCaja}`);
        const nuevoEstado = comando === 'abrir' ? 'abierto' : 'cerrado';
        await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero_caja: numeroCaja,
            estado_cerrojo: nuevoEstado,
            estado_sensor: nuevoEstado, 
            alarma: caja.estado?.alarma ?? false,
            origen: 'admin',
          }),
        });
        fetchCajaReal();
        setTimeout(() => {
          fetchEventos();
          fetchCajaReal();
        }, 2000);
      } catch {
        setError('No se pudo comunicar con el ESP32');
      }
    } else {
      const nuevoEstado = comando === 'abrir' ? 'abierto' : 'cerrado';
      setCajas(prev =>
        prev.map(c =>
          c.numero === numeroCaja
            ? {
                ...c,
                cerrojoAbierto: comando === 'abrir',
                estado: { cerrojo: nuevoEstado, sensor: nuevoEstado, alarma: false },
              }
            : c
        )
      );

      try {
        await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero_caja: numeroCaja,
            estado_cerrojo: nuevoEstado,
            estado_sensor: nuevoEstado,
            alarma: false,
            origen: 'admin',
          }),
        });
        setTimeout(fetchEventos, 500);
      } catch (err) {
        console.error('No se pudo registrar evento ficticio', err);
      }
    }
  };

  let eventosFiltradosUI = eventos.filter(evento => {
    let eventoFechaStr = '-';
    if (evento.fecha) {
      const d = new Date(evento.fecha);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      eventoFechaStr = `${yyyy}-${mm}-${dd}`;
    }
    const mismoDia = filtroFecha === '' || eventoFechaStr === filtroFecha;

    return (
      (filtroCaja === '' || evento.numero_caja === Number(filtroCaja)) &&
      (filtroOrigen === '' || evento.origen?.toLowerCase().trim() === filtroOrigen.toLowerCase().trim()) &&
      (filtroAlarma === '' || (filtroAlarma === 'true' ? evento.alarma : !evento.alarma)) &&
      (filtroCerrojo === '' || evento.estado_cerrojo === filtroCerrojo) &&
      mismoDia
    );
  });

  eventosFiltradosUI.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  eventosFiltradosUI = eventosFiltradosUI.slice(0, 50);

  if (loading) return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <span className="loader" />
      <p>Cargando eventos...</p>
    </div>
  );

  return (
    <div className="container-app">
      <div className="header" style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '2rem',
          fontWeight: 700,
          color: '#00FFB2',
          letterSpacing: '2px',
          fontFamily: 'Orbitron, Arial, sans-serif',
          pointerEvents: 'none'
        }}>
          SmartBox
        </div>
        <ChangePinModal />
        <button
          onClick={() => {
            localStorage.removeItem('auth');
            if (onLogout) onLogout();
          }}
          className="logout-button"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="container" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {cajas.map((caja) => (
          <Box key={caja.numero} className="bloque caja" sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <h2>Caja {caja.numero}</h2>
            <Box className="bloque status" sx={{ mb: 2 }}>
              {caja.estado ? (
                <>
                  <p>Estado Cerrojo: {caja.estado.cerrojo}</p>
                  <p>Estado Sensor: {caja.estado.sensor}</p>
                  {caja.estado.alarma && <Typography color="error">⚠️ ¡Alarma activa!</Typography>}
                </>
              ) : (
                <p style={{ color: '#aaa' }}>Sin conexión con el dispositivo</p>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<LockOpenIcon />}
                onClick={() => enviarComando('abrir', caja.numero)}
                disabled={caja.cerrojoAbierto}
              >
                Abrir
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<LockIcon />}
                onClick={() => enviarComando('cerrar', caja.numero)}
                disabled={!caja.cerrojoAbierto}
              >
                Cerrar
              </Button>

              {caja.numero === 1 && (
                <Button
                  variant="outlined"
                  color={caja.estado?.sensor === 'abierto' ? 'error' : 'primary'}
                  onClick={async () => {
                    try {
                      setSimulandoSensor(true);

                      const nuevoSensor = caja.estado?.sensor === 'abierto' ? 'cerrado' : 'abierto';
                      const alarmaActiva = caja.estado?.cerrojo === 'cerrado' && nuevoSensor === 'abierto';

                      const nuevoEstado = { 
                        ...caja.estado, 
                        sensor: nuevoSensor, 
                        alarma: alarmaActiva 
                      };

                      setCajas(prev =>
                        prev.map(c =>
                          c.numero === 1 ? { ...c, estado: nuevoEstado } : c
                        )
                      );

                      await fetch(backendUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          numero_caja: 1,
                          estado_cerrojo: nuevoEstado.cerrojo,
                          estado_sensor: nuevoEstado.sensor,
                          alarma: nuevoEstado.alarma,
                          origen: 'admin',
                        }),
                      });

                      fetchEventos();

                    } catch (err) {
                      console.error(err);
                      setError('No se pudo simular el sensor');
                    }
                  }}
                >
                  {caja.estado?.sensor === 'abierto' ? 'Cerrar puerta (SIMULADO)' : 'Abrir puerta (SIMULADO)'}
                </Button>
              )}

            </Box>
          </Box>
        ))}
      </div>

      <div className="bloque eventos" style={{ maxWidth: 800, margin: '2rem auto 0 auto' }}>
        <h3>Todos los eventos</h3>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => setMostrarFiltros(v => !v)}
          style={{ marginBottom: '1rem' }}
        >
          Filtrar
        </Button>
        <Collapse in={mostrarFiltros}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <FormControl size="small" style={{ minWidth: 160 }}>
              <InputLabel shrink htmlFor="filtro-fecha">Fecha</InputLabel>
              <input
                id="filtro-fecha"
                type="date"
                value={filtroFecha}
                onChange={e => setFiltroFecha(e.target.value)}
                style={{
                  background: '#23233a',
                  color: '#E0E0E0',
                  border: '1px solid #00FFB2',
                  borderRadius: 8,
                  padding: '8px',
                  fontFamily: 'Orbitron, Arial, sans-serif',
                  fontSize: '1rem'
                }}
              />
            </FormControl>
            <FormControl size="small" style={{ minWidth: 120 }}>
              <InputLabel id="filtro-caja-label">Caja</InputLabel>
              <Select
                labelId="filtro-caja-label"
                value={filtroCaja}
                label="Caja"
                onChange={e => setFiltroCaja(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {[...new Set(eventos.map(e => e.numero_caja))].map(num =>
                  <MenuItem key={num} value={num}>{num}</MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControl size="small" style={{ minWidth: 120 }}>
              <InputLabel id="filtro-origen-label">Origen</InputLabel>
              <Select
                labelId="filtro-origen-label"
                value={filtroOrigen}
                label="Origen"
                onChange={e => setFiltroOrigen(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {[...new Set(eventos.map(e => e.origen))].map(origen =>
                  <MenuItem key={origen} value={origen}>{origen}</MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControl size="small" style={{ minWidth: 120 }}>
              <InputLabel id="filtro-alarma-label">Alarma</InputLabel>
              <Select
                labelId="filtro-alarma-label"
                value={filtroAlarma}
                label="Alarma"
                onChange={e => setFiltroAlarma(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="true">Sí</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" style={{ minWidth: 120 }}>
              <InputLabel id="filtro-cerrojo-label">Cerrojo</InputLabel>
              <Select
                labelId="filtro-cerrojo-label"
                value={filtroCerrojo}
                label="Cerrojo"
                onChange={e => setFiltroCerrojo(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="abierto">Abierto</MenuItem>
                <MenuItem value="cerrado">Cerrado</MenuItem>
              </Select>
            </FormControl>
          </div>
        </Collapse>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Caja</TableCell>
                <TableCell>Cerrojo</TableCell>
                <TableCell>Sensor</TableCell>
                <TableCell>Alarma</TableCell>
                <TableCell>Origen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eventosFiltradosUI.map((evento, idx) => (
                <TableRow key={idx}>
                  <TableCell>{evento.fecha ? new Date(evento.fecha).toLocaleString() : '-'}</TableCell>
                  <TableCell>{evento.numero_caja ?? '-'}</TableCell>
                  <TableCell>{evento.estado_cerrojo ?? '-'}</TableCell>
                  <TableCell>{evento.estado_sensor ?? '-'}</TableCell>
                  <TableCell>{evento.alarma !== undefined ? (evento.alarma ? 'Sí' : 'No') : '-'}</TableCell>
                  <TableCell>{evento.origen ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default Eventos;
