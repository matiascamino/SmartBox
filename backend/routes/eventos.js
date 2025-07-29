import express from 'express';
import { pool } from '../db.js'; // <-- corregido aquí
import { enviarEmail } from '../emailService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { estadoCerrojo, estadoSensor, alarma } = req.body;

  try {
    await pool.query(
      'INSERT INTO eventos (estado_cerrojo, estado_sensor, alarma) VALUES ($1, $2, $3)',
      [estadoCerrojo, estadoSensor, alarma]
    );

    if (alarma === true || alarma === 'true') {
      await enviarEmail(
        'matiascamino8@gmail.com', // Tu mail real para recibir alertas
        '⚠️ Alarma activada en la caja fuerte',
        `Estado del cerrojo: ${estadoCerrojo}\nSensor: ${estadoSensor}\n¡Puerta abierta con cerrojo cerrado!`
      );
    }

    res.status(201).json({ mensaje: 'Evento registrado correctamente' });
  } catch (err) {
    console.error('Error registrando evento:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM eventos ORDER BY fecha DESC');
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
