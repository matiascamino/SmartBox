import express from 'express';
import { pool } from '../db.js';
import { enviarEmail } from '../emailService.js';

const router = express.Router();

// POST /api/eventos
router.post('/', async (req, res) => {
  const { numero_caja, estado_cerrojo, estado_sensor, alarma, origen } = req.body;

  try {
    await pool.query(
      // Agrega fecha por defecto si tu tabla lo permite
      'INSERT INTO eventos (numero_caja, estado_cerrojo, estado_sensor, alarma, origen) VALUES ($1, $2, $3, $4, $5)',
      [numero_caja, estado_cerrojo, estado_sensor, alarma, origen]
    );

    if (alarma === true || alarma === 'true') {
      await enviarEmail(
        'matiascamino8@gmail.com',
        '⚠️ Alarma activada en la caja fuerte',
        `Estado del cerrojo: ${estado_cerrojo}\nSensor: ${estado_sensor}\n¡Puerta abierta con cerrojo cerrado!`
      );
    }

    res.status(201).json({ mensaje: 'Evento registrado correctamente' });
  } catch (err) {
    console.error('Error registrando evento:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/eventos
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
