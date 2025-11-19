console.log("🚀 INICIANDO SERVIDOR CON FIX DE CORREO...");

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname)); 

const upload = multer({ storage: multer.memoryStorage() });

// --- CONFIGURACIÓN DE CORREO CORREGIDA ---
let transporter = null;

// Función para inicializar el transportador con configuración explícita
const initMailer = () => {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log("⚙️ Configurando transporte de correo (Puerto 465)...");
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com', // Host explícito
            port: 465,              // Puerto SSL (Más fiable en la nube)
            secure: true,           // Usar SSL
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // Opciones adicionales para evitar timeouts
            tls: {
                rejectUnauthorized: false // Ayuda si hay problemas de certificados
            },
            connectionTimeout: 10000, // 10 segundos máximo para conectar
            greetingTimeout: 5000,    // 5 segundos para el saludo
            socketTimeout: 10000      // 10 segundos para el socket
        });
        console.log("✅ Servicio de correo listo.");
    } else {
        console.log("⚠️ Faltan credenciales de correo.");
    }
};

// Inicializamos
initMailer();

app.get('/', (req, res) => {
    const publicIndex = path.join(__dirname, 'public', 'index.html');
    const rootIndex = path.join(__dirname, 'index.html');
    res.sendFile(publicIndex, (err) => {
        if (err) res.sendFile(rootIndex, (err2) => {
            if (err2) res.send("<h1>Servidor Activo</h1><p>No se encontró index.html</p>");
        });
    });
});

app.post('/send-receipt', upload.single('pdf'), async (req, res) => {
    console.log("📩 Intento de envío recibido...");
    
    if (!transporter) {
        console.error("❌ El transportador no está configurado.");
        return res.status(500).json({ error: 'Configuración de correo no disponible.' });
    }
    
    try {
        const { to, subject, text } = req.body;
        const file = req.file;

        if (!file) return res.status(400).send('Falta el PDF.');

        console.log(`📤 Conectando con Gmail para enviar a: ${to}`);
        
        const info = await transporter.sendMail({
            from: `"NóminaPro" <${process.env.EMAIL_USER}>`,
            to, subject, text,
            attachments: [{ filename: file.originalname, content: file.buffer }]
        });

        console.log("✅ ¡ENVIADO! ID:", info.messageId);
        res.status(200).json({ message: 'Enviado', info });
    } catch (error) {
        console.error('❌ Error fatal al enviar:', error);
        // Devolver el mensaje exacto del error para verlo en la web
        res.status(500).json({ error: error.message, details: error.code });
    }
});

app.listen(port, () => {
    console.log(`✅ Servidor escuchando en puerto ${port}`);
});
