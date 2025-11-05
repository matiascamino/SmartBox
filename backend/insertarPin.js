import bcrypt from 'bcrypt';
import { pool } from './db.js';

const usuarios = [
  { nombre_usuario: 'usuario1', pin: '123', caja_asignada: 1, rol: 'usuario' },
  { nombre_usuario: 'admin', pin: '123', caja_asignada: null, rol: 'admin' },
];

const insertarUsuarios = async () => {
  try {
    for (const u of usuarios) {
      const hash = await bcrypt.hash(u.pin, 10);
      const res = await pool.query(
        `INSERT INTO usuarios (nombre_usuario, pin_hash, caja_asignada, rol, creado_en)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (nombre_usuario)
         DO UPDATE SET pin_hash = EXCLUDED.pin_hash, caja_asignada = EXCLUDED.caja_asignada, rol = EXCLUDED.rol
         RETURNING *`,
        [u.nombre_usuario, hash, u.caja_asignada, u.rol]
      );
      console.log('Usuario insertado/actualizado:', res.rows[0]);
    }
  } catch (error) {
    console.error('Error insertando usuarios:', error);
  } finally {
    pool.end();
  }
};

insertarUsuarios();
