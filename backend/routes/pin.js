import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';

const router = Router();

// Función auxiliar: obtiene el hash del PIN de un usuario
async function getPinHash(nombre_usuario) {
  const result = await pool.query(
    'SELECT pin_hash FROM usuarios WHERE nombre_usuario = $1',
    [nombre_usuario]
  );
  return result.rows[0]?.pin_hash || null;
}


// Ruta POST para cambiar PIN de un usuario
router.post('/change-pin', async (req, res) => {
  const { nombre_usuario, oldPin, newPin } = req.body;
  if (!nombre_usuario || !oldPin || !newPin) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const hash = await getPinHash(nombre_usuario);
    if (!hash) return res.status(401).json({ error: 'Usuario no encontrado o PIN no configurado' });

    const valid = await bcrypt.compare(oldPin, hash);
    if (!valid) return res.status(401).json({ error: 'PIN antiguo incorrecto' });

    const newHash = await bcrypt.hash(newPin, 10);
    await pool.query(
      'UPDATE usuarios SET pin_hash = $1 WHERE nombre_usuario = $2',
      [newHash, nombre_usuario]
    );

    return res.json({ success: true, message: 'PIN cambiado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Ruta POST para validar PIN y devolver rol y caja asignada
router.post('/login-pin', async (req, res) => {
  const { nombre_usuario, pin } = req.body;
  if (!nombre_usuario || !pin) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const result = await pool.query(
      'SELECT pin_hash, rol, caja_asignada FROM usuarios WHERE nombre_usuario = $1',
      [nombre_usuario]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Usuario no encontrado' });

    const { pin_hash, rol, caja_asignada } = result.rows[0];

    const valid = await bcrypt.compare(pin, pin_hash);
    if (!valid) return res.status(401).json({ error: 'PIN incorrecto' });

    return res.json({
      success: true,
      usuario: nombre_usuario,
      rol,            // admin o user
      caja_asignada
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});


export default router;
