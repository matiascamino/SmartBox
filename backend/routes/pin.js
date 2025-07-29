import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js'; 

const router = Router();

// Obtener el hash actual del PIN
async function getPinHash() {
  const res = await pool.query('SELECT pin_hash FROM pin_auth ORDER BY id DESC LIMIT 1');
  if (res.rows.length === 0) return null;
  return res.rows[0].pin_hash;
}

// Ruta POST para validar PIN
router.post('/login-pin', async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'Falta PIN' });

  try {
    const hash = await getPinHash();
    if (!hash) return res.status(500).json({ error: 'PIN no configurado' });

    const valid = await bcrypt.compare(pin, hash);
    if (valid) {
      return res.json({ success: true });
    } else {
      return res.status(401).json({ error: 'PIN incorrecto' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Ruta POST para cambiar PIN (requiere oldPin y newPin)
router.post('/change-pin', async (req, res) => {
  const { oldPin, newPin } = req.body;
  if (!oldPin || !newPin) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const hash = await getPinHash();
    if (!hash) return res.status(500).json({ error: 'PIN no configurado' });

    const valid = await bcrypt.compare(oldPin, hash);
    if (!valid) return res.status(401).json({ error: 'PIN antiguo incorrecto' });

    const newHash = await bcrypt.hash(newPin, 10);
    await pool.query('INSERT INTO pin_auth (pin_hash) VALUES ($1)', [newHash]);

    return res.json({ success: true, message: 'PIN cambiado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
