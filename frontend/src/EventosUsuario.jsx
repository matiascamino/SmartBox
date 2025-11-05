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

function EventosUsuario({ onLogout }) {
  const [eventos, setEventos] = useState([]);
  const [caja1, setCaja1] = useState({ numero: 1, estado: null, cerrojoAbierto: false });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroOrigen, setFiltroOrigen] = useState('');
  const [filtroAlarma, setFiltroAlarma] = useState('');
  const [filtroCerrojo, setFiltroCerrojo] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const backendUrl = `${import.meta.env.VITE_API_URL}/api/eventos`;
  const esp32Url = 'http://172.20.10.2';

  useEffect(() => { fetchEventos(); }, []);
  useEffect(() => { const interval = setInterval(fetchEventos, 3000); return () => clearInterval(interval); }, []);
  useEffect(() => { const interval = setInterval(fetchCajaReal, 1000); return () => clearInterval(interval); }, []);

  const fetchEventos = async () => {
    try {
      const res = await fetch(backendUrl);
      const data = await res.json();
      // Solo caja 1 y excluir eventos duplicados de "usuario" si ya se registraron
 // Solo mostrar eventos del Usuario
const filtrados = data.filter(ev => 
  ev.numero_caja === 1 &&
  (ev.origen === 'usuario1' || ev.origen === 'admin') // admin también puede ver su caja
);

      setEventos(filtrados);

    } catch (err) {
      console.error('Error cargando eventos');
    }
  };

  const fetchCajaReal = async () => {
    try {
      const res = await fetch(`${esp32Url}/estado?caja=1`);
      if (!res.ok) return;
      const data = await res.json();
      setCaja1({ numero: 1, estado: data, cerrojoAbierto: data.cerrojo === 'abierto' });
    } catch {}
  };

  const enviarComando = async (comando) => {
    try {
  await fetch(`${esp32Url}/${comando}?caja=1&origen=usuario1`);

      const nuevoEstado = comando === 'abrir' ? 'abierto' : 'cerrado';
      await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_caja: 1,
          estado_cerrojo: nuevoEstado,
          estado_sensor: caja1.estado?.sensor ?? nuevoEstado,
          alarma: caja1.estado?.alarma ?? false,
          origen: 'usuario1'
        }),
      });
      setTimeout(() => { fetchEventos(); fetchCajaReal(); }, 1500);
    } catch (err) {
      console.error('No se pudo enviar el comando');
    }
  };

  // Filtrado adicional en la UI (solo sobre los eventos ya filtrados)
  let eventosFiltrados = eventos.filter(evento => {
    let fechaStr = evento.fecha ? new Date(evento.fecha).toISOString().split('T')[0] : '-';
    const mismoDia = filtroFecha === '' || fechaStr === filtroFecha;

    return (
      (filtroOrigen === '' || evento.origen === filtroOrigen) &&
      (filtroAlarma === '' || (filtroAlarma === 'true' ? evento.alarma : !evento.alarma)) &&
      (filtroCerrojo === '' || evento.estado_cerrojo === filtroCerrojo) &&
      mismoDia
    );
  });
eventosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

// mostrar solo los últimos 50
eventosFiltrados = eventosFiltrados.slice(0, 50);
  

  return (
    <div className="container-app">
      <div className="header" style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: '2rem', fontWeight: 700, color: '#00FFB2',
          letterSpacing: '2px', fontFamily: 'Orbitron, Arial, sans-serif',
          pointerEvents: 'none'
        }}>
          SmartBox (Usuario)
        </div>
        <button onClick={() => { localStorage.removeItem('auth'); onLogout?.(); }} className="logout-button">
          Cerrar sesión
        </button>
      </div>

      {/* CONTROL DE CAJA 1 */}
      <div className="container" style={{ display: 'flex', justifyContent: 'center' }}>
        <Box className="bloque caja" sx={{ minWidth: 300, width: '95%', minHeight: 300 }}>
          <h2>Caja 1</h2>
          <Box className="bloque status" sx={{ mb: 2 }}>
            {caja1.estado ? (
              <>
                <p>Estado Cerrojo: {caja1.estado.cerrojo}</p>
                <p>Estado Sensor: {caja1.estado.sensor}</p>
                {caja1.estado.alarma && <Typography color="error">⚠️ ¡Alarma activa!</Typography>}
              </>
            ) : <p style={{ color: '#aaa' }}>Sin conexión con el dispositivo</p>}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button variant="contained" color="success" startIcon={<LockOpenIcon />} onClick={() => enviarComando('abrir')} disabled={caja1.cerrojoAbierto}>Abrir</Button>
            <Button variant="contained" color="error" startIcon={<LockIcon />} onClick={() => enviarComando('cerrar')} disabled={!caja1.cerrojoAbierto}>Cerrar</Button>
          </Box>
        </Box>
      </div>

      {/* TABLA EVENTOS */}
      <div className="bloque eventos" style={{ maxWidth: 800, margin: '2rem auto 0 auto' }}>
        <h3>Movimientos de tu caja</h3>

        <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '1rem 0' }}>
          <Button variant="outlined" onClick={() => setMostrarFiltros(v => !v)}>Filtrar</Button>
        </div>
        <Collapse in={mostrarFiltros}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <FormControl size="small" style={{ minWidth: 160 }}>
              <InputLabel shrink htmlFor="filtro-fecha">Fecha</InputLabel>
              <input id="filtro-fecha" type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
                style={{ background: '#23233a', color: '#E0E0E0', border: '1px solid #00FFB2', borderRadius: 8, padding: 8 }} />
            </FormControl>
            <FormControl size="small" style={{ minWidth: 120 }}>
              <InputLabel id="filtro-origen-label">Origen</InputLabel>
              <Select labelId="filtro-origen-label" value={filtroOrigen} onChange={e => setFiltroOrigen(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {[...new Set(eventos.map(e => e.origen))].map(origen => <MenuItem key={origen} value={origen}>{origen}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" style={{ minWidth: 120 }}>
              <InputLabel id="filtro-alarma-label">Alarma</InputLabel>
              <Select labelId="filtro-alarma-label" value={filtroAlarma} onChange={e => setFiltroAlarma(e.target.value)}>
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="true">Sí</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" style={{ minWidth: 120 }}>
              <InputLabel id="filtro-cerrojo-label">Cerrojo</InputLabel>
              <Select labelId="filtro-cerrojo-label" value={filtroCerrojo} onChange={e => setFiltroCerrojo(e.target.value)}>
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
                <TableCell>Cerrojo</TableCell>
                <TableCell>Sensor</TableCell>
                <TableCell>Alarma</TableCell>
                <TableCell>Origen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eventosFiltrados.map((evento, idx) => (
                <TableRow key={idx}>
                  <TableCell>{evento.fecha ? new Date(evento.fecha).toLocaleString() : '-'}</TableCell>
                  <TableCell>{evento.estado_cerrojo ?? '-'}</TableCell>
                  <TableCell>{evento.estado_sensor ?? '-'}</TableCell>
                  <TableCell>{evento.alarma ? 'Sí' : 'No'}</TableCell>
                  <TableCell>{evento.origen ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}

export default EventosUsuario;
