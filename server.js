// server.js - versión ESM compatible con "type": "module"

import express from "express";
import cors from "cors";
import path from "path";
import session from "express-session";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { iniciarConexion } from "./db.js";
import { configurarRutas } from "./routes/productos.routes.js";
import dotenv from "dotenv";

dotenv.config();

// 🔧 Compatibilidad __dirname (porque en ESM no existe por defecto)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const servidor = express();
servidor.use(express.json());
servidor.use(express.urlencoded({ extended: true }));
servidor.use(cors());

// ============================================================
// 1️⃣ CONFIGURACIÓN DE SESIONES
// ============================================================
servidor.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 },
  })
);

// ============================================================
// 2️⃣ AUTENTICACIÓN BÁSICA ADMIN
// ============================================================

// Hash SHA-256 de 'admin123'
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect("/login.html");
}

// POST /login
servidor.post("/login", (req, res) => {
  const { username, password } = req.body;
  const inputHash = crypto.createHash("sha256").update(password).digest("hex");

  console.log("==================================================");
  console.log(`Usuario: ${username}`);
  console.log(`Hash ingresado: ${inputHash}`);
  console.log(`Hash esperado: ${ADMIN_PASSWORD_HASH}`);
  console.log(
    `Comparación: ${inputHash === ADMIN_PASSWORD_HASH ? "✓ IGUALES" : "✗ DIFERENTES"}`
  );
  console.log("==================================================");

  if (username === "admin" && inputHash === ADMIN_PASSWORD_HASH) {
    req.session.isAuthenticated = true;
    return res.status(200).json({ success: true, redirect: "/admin.html" });
  } else {
    return res
      .status(401)
      .json({ success: false, message: "Usuario o contraseña incorrectos." });
  }
});

// GET /logout
servidor.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send("No se pudo cerrar la sesión.");
    res.redirect("/");
  });
});

// ============================================================
// 3️⃣ ARCHIVOS ESTÁTICOS Y CONEXIÓN A DB
// ============================================================
servidor.use(express.static(path.join(__dirname, "/")));
servidor.use("/imagenes", express.static(path.join(__dirname, "imagenes")));

// ============================================================
// 4️⃣ FUNCIÓN ASÍNCRONA PARA INICIAR TODO
// ============================================================
async function iniciarServidor() {
  try {
    // ✅ Espera a que la conexión se establezca
    const conexion = await iniciarConexion();
    
    // ✅ Configura las rutas CON la conexión establecida
    configurarRutas(servidor, conexion);

    // ✅ Inicia el servidor
    const PORT = process.env.PORT || 3000;
    servidor.listen(PORT, () => {
      console.log("-----------------------------------------");
      console.log(`🚀 Servidor Express activo en el puerto ${PORT}`);
      console.log("-----------------------------------------");
    });
  } catch (err) {
    console.error("❌ Error al iniciar el servidor:", err.message);
    process.exit(1);
  }
}

// ✅ Llama la función asíncrona
iniciarServidor();