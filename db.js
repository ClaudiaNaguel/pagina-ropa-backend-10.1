// db.js

const mysql = require("mysql2");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

function iniciarConexion() {
  const sslOptions = {
    rejectUnauthorized: true,
    ca: fs.readFileSync(process.env.DB_SSL_CA)
  };

  const conexion = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: sslOptions
  });

  conexion.connect((err) => {
    if (err) {
      console.error("❌ FATAL ERROR: No se pudo conectar con la base de datos.\nDetalles:", err.message);
      process.exit(1);
    } else {
      console.log("✅ Conectado correctamente a la base de datos Aiven MySQL");
    }
  });

  return conexion;
}

module.exports = { iniciarConexion };
