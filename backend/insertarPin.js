import bcrypt from 'bcrypt';
import { pool } from './db.js'; // asumimos que ya tenés un archivo db.js como te mostré antes

const insertarPin = async () => {
  const pin = '123'; // PIN inicial
  const hash = await bcrypt.hash(pin, 10);

  try {
    await pool.query('INSERT INTO pin_auth (pin_hash) VALUES ($1)', [hash]);
    console.log('✅ PIN insertado correctamente');
  } catch (error) {
    console.error('❌ Error insertando PIN:', error);
  } finally {
    pool.end();
  }
};

insertarPin();
