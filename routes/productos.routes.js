// routes/productos.routes.js - Versión ESM compatible con "type": "module"

import path from "path";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from "url";

// Simular __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURACIÓN DE MULTER ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../imagenes"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// =============================================
// FUNCIÓN PRINCIPAL: configurarRutas
// =============================================
export function configurarRutas(servidor, conexion) {
  // ===========================================
  // RUTA POST: /guardar_producto
  // ===========================================
  servidor.post("/guardar_producto", upload.single("imagen"), (req, res) => {
    const nombreImagen = req.file ? req.file.filename : "default.jpg";
    const { descripcionCorta, descripcionLarga, precio, stock, descuento, idrubro, destacado } = req.body;

    const sql = `INSERT INTO productos 
                 (descripcionCorta, descripcionLarga, precio, stock, descuento, idrubro, destacado, imagen) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const valores = [descripcionCorta, descripcionLarga, precio, stock, descuento, idrubro, destacado, nombreImagen];

    conexion.query(sql, valores, (error, resultado) => {
      if (error) {
        console.error("Error al insertar producto:", error.message);
        if (req.file && nombreImagen !== "default.jpg") {
          fs.unlink(path.join(__dirname, "../imagenes", nombreImagen), (err) => {
            if (err) console.error("Error al eliminar imagen fallida:", err);
          });
        }
        return res.status(500).send("Error interno al guardar el producto.");
      }

      res.status(200).send(`Producto guardado con ID ${resultado.insertId}`);
    });
  });

  // =============================================
  // RUTA PUT: /productos/:id (Actualizar campos)
  // =============================================
  servidor.put("/productos/:id", (req, res) => {
    const idProducto = req.params.id;
    const { precio, stock, descuento, destacado } = req.body;

    let sql = "UPDATE productos SET ";
    const valores = [];
    const campos = [];

    if (precio !== undefined) {
      campos.push("precio = ?");
      valores.push(precio);
    }
    if (stock !== undefined) {
      campos.push("stock = ?");
      valores.push(stock);
    }
    if (descuento !== undefined) {
      campos.push("descuento = ?");
      valores.push(descuento);
    }
    if (destacado !== undefined) {
      campos.push("destacado = ?");
      valores.push(destacado ? 1 : 0);
    }

    if (campos.length === 0) {
      return res.status(400).send("No se proporcionaron campos válidos para actualizar.");
    }

    sql += campos.join(", ") + " WHERE id = ?";
    valores.push(idProducto);

    conexion.query(sql, valores, (error, resultado) => {
      if (error) {
        console.error("Error al actualizar producto:", error.message);
        return res.status(500).send("Error interno del servidor al actualizar.");
      }
      if (resultado.affectedRows === 0) {
        return res.status(404).send("Producto no encontrado.");
      }
      res.status(200).send(`Producto con ID ${idProducto} actualizado correctamente.`);
    });
  });

  // =============================================
  // RUTA GET: /productos/buscar (Búsqueda)
  // =============================================
  servidor.get("/productos/buscar", (req, res) => {
    const termino = req.query.q;

    if (!termino) {
      return res.status(400).json({ error: "Falta el término de búsqueda (parámetro q)." });
    }

    const sql = `
      SELECT * FROM productos 
      WHERE descripcionCorta LIKE ? OR descripcionLarga LIKE ?
      ORDER BY id DESC
    `;
    const searchTerm = `%${termino}%`;

    conexion.query(sql, [searchTerm, searchTerm], (error, resultados) => {
      if (error) {
        console.error("Error en la consulta de búsqueda:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
      }

      res.json(resultados);
    });
  });

  // =============================================
  // RUTA GET: /productos (Trae todos o filtrados)
  // =============================================
  servidor.get("/productos", (req, res) => {
    const rubro = req.query.rubro;
    const destacado = req.query.destacado;

    let sql = "SELECT * FROM productos";
    const valores = [];
    const condiciones = [];

    if (rubro) {
      condiciones.push("idrubro = ?");
      const RUBRO_IDS = { hombre: 1, mujer: 2, teens: 3, kids: 4 };
      const idRubro = RUBRO_IDS[rubro.toLowerCase()];
      if (idRubro) {
        valores.push(idRubro);
      } else {
        condiciones.pop();
      }
    }

    if (destacado && (destacado === "true" || destacado === "1")) {
      condiciones.push("destacado = 1");
    }

    if (condiciones.length > 0) {
      sql += " WHERE " + condiciones.join(" AND ");
    }

    conexion.query(sql, valores, (error, productos) => {
      if (error) {
        console.error("Error al obtener productos:", error.message);
        return res.status(500).send("Error interno del servidor.");
      }

      res.status(200).json(productos);
    });
  });

  // =============================================
  // RUTA GET: /productos/:id
  // =============================================
  servidor.get("/productos/:id", (req, res) => {
    const idProducto = req.params.id;
    const sql = "SELECT * FROM productos WHERE id = ?";

    conexion.query(sql, [idProducto], (error, productos) => {
      if (error) {
        console.error("Error al obtener el producto:", error.message);
        return res.status(500).send("Error interno al buscar el producto.");
      }

      if (productos.length === 0) {
        return res.status(404).send("Producto no encontrado.");
      }

      res.status(200).json(productos[0]);
    });
  });
}
