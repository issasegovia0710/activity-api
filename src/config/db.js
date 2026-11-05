const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  throw new Error(`Variables de entorno faltantes: ${missing.join(', ')}`);
}

const ssl = {
  minVersion: 'TLSv1.2',
  rejectUnauthorized: true,
};
if (process.env.DB_CA_PATH) {
  ssl.ca = fs.readFileSync(process.env.DB_CA_PATH);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  ssl,
});

// Mostrar errores sin imprimir contraseña ni cadena de conexión.
(async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    console.log('✅ Conexión a TiDB Cloud establecida');
  } catch (error) {
    console.error('❌ No se pudo conectar a TiDB Cloud:', error.code || error.message);
  }
})();

module.exports = pool;
