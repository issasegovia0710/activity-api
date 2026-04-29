const mysql = require('mysql2/promise');
// Esto permite que el código lea tu archivo .env localmente
require('dotenv').config(); 

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 12980,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Aiven requiere SSL por seguridad, esto es vital
  ssl: {
    rejectUnauthorized: false 
  }
});

// Prueba de conexión rápida
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión exitosa a la base de datos en Aiven');
    connection.release();
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
})();

module.exports = pool;