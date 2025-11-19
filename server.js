// 1. Mensaje de inicio inmediato para verificar que Node.js se ejecuta
console.log("🚀 [Paso 1] Iniciando script del servidor...");

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

console.log("✅ [Paso 2] Módulos cargados correctamente.");

const app = express();
// Render asigna un puerto dinámico. Si falla, usa 3000, pero Render NECESITA el suyo.
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

console.log("📂 [Diagnóstico] Directorio actual (__dirname):", __dirname);

// --- CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS ---
// Intentamos servir desde 'public' y desde la raíz para asegurar que encuentre el HTML
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

const upload = multer({ storage: multer.memoryStorage() });

// --- CONFIGURACIÓN DE CORREO ---
// Verificamos si las variables de entorno existen (sin mostrar la contraseña por seguridad)
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log(`📧 [Diagnóstico] Configuración de correo detectada para: ${process.env.EMAIL_USER}`);
} else {
    console.warn("⚠️ [ADVERTENCIA] No se detectaron las variables de entorno de correo (EMAIL_USER / EMAIL_PASS).");
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- RUTAS ---

// Ruta Principal: Busca el HTML desesperadamente
app.get('/', (req, res) => {
    console.log('🔍 [Acceso Web] Solicitud recibida en la raíz "/". Buscando index.html...');

    const possiblePaths = [
        path.join(__dirname, 'public', 'index.html'),
        path.join(__dirname, 'index.html'),
        path.join(__dirname, 'NominaPro.html') // Por si acaso quedó con el nombre viejo
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            console.log(`✅ [Éxito] Archivo encontrado en: ${p}`);
            return res.sendFile(p);
        }
    }

    // Búsqueda de último recurso: cualquier .html
    try {
        const files = fs.readdirSync(__dirname);
        const htmlFile = files.find(file => file.endsWith('.html'));
        if (htmlFile) {
            console.log(`✅ [Salvavidas] Usando archivo encontrado: ${htmlFile}`);
            return res.sendFile(path.join(__dirname, htmlFile));
        }
    } catch (e) {
        console.error("Error leyendo directorio:", e);
    }

    console.error('❌ [ERROR CRÍTICO] No se encuentra index.html en el servidor.');
    res.status(500).send(`
        <h1>Error de Despliegue</h1>
        <p>El servidor Node.js arrancó, pero no encuentra tu archivo HTML.</p>
        <p>Archivos en carpeta actual: ${fs.readdirSync(__dirname).join(', ')}</p>
        <p>Archivos en carpeta public: ${fs.existsSync(path.join(__dirname, 'public')) ? fs.readdirSync(path.join(__dirname, 'public')).join(', ') : 'Carpeta public no existe'}</p>
    `);
});

// Ruta para enviar correos
app.post('/send-receipt', upload.single('pdf'), async (req, res) => {
    console.log('📨 [Email] Intentando enviar correo...');
    try {
        const { to, subject, text } = req.body;
        const file = req.file;

        if (!file) return res.status(400).send('Falta el PDF.');
        if (!process.env.EMAIL_USER) return res.status(500).json({ error: 'Falta configuración de email en el servidor.' });

        const info = await transporter.sendMail({
            from: `"NóminaPro" <${process.env.EMAIL_USER}>`,
            to, subject, text,
            attachments: [{ filename: file.originalname, content: file.buffer }]
        });

        console.log('✅ [Email] Enviado:', info.response);
        res.status(200).json({ message: 'Enviado', info });
    } catch (error) {
        console.error('❌ [Email Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// --- ARRANQUE DEL SERVIDOR ---
// Escuchar explícitamente en 0.0.0.0 es crucial para algunos entornos de Docker/Render
app.listen(port, '0.0.0.0', () => {
    console.log("====================================================");
    console.log(`✅ [LISTO] Servidor NóminaPro corriendo correctamente`);
    console.log(`🔌 Escuchando en el puerto: ${port}`);
    console.log(`🌍 Dirección: http://0.0.0.0:${port}`);
    console.log("====================================================");
});
