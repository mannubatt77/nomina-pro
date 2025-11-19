console.log("🚀 INICIANDO SERVIDOR...");

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Servir archivos estáticos (HTML/JS/CSS)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname)); // Por si acaso está en la raíz

const upload = multer({ storage: multer.memoryStorage() });

// 2. Configuración de correo (Protegida para que no rompa el servidor si falta)
let transporter = null;
try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        console.log("✅ Servicio de correo configurado correctamente.");
    } else {
        console.log("⚠️ Faltan credenciales de correo (EMAIL_USER/EMAIL_PASS). El servidor funcionará pero no enviará emails.");
    }
} catch (error) {
    console.error("❌ Error configurando correo:", error);
}

// 3. Ruta Principal (Simple y directa)
app.get('/', (req, res) => {
    // Intenta enviar el archivo, si falla, envía texto simple
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, 'index.html'), (err2) => {
                if (err2) {
                    res.send("<h1>¡El servidor funciona!</h1><p>Pero no encuentro el archivo index.html. Asegúrate de que esté en la carpeta 'public' o en la raíz.</p>");
                }
            });
        }
    });
});

// 4. Ruta para enviar correos
app.post('/send-receipt', upload.single('pdf'), async (req, res) => {
    if (!transporter) {
        return res.status(500).json({ error: 'El servidor de correo no está configurado. Revisa las variables de entorno.' });
    }
    
    try {
        const { to, subject, text } = req.body;
        const file = req.file;

        if (!file) return res.status(400).send('Falta el PDF.');

        const info = await transporter.sendMail({
            from: `"NóminaPro" <${process.env.EMAIL_USER}>`,
            to, subject, text,
            attachments: [{ filename: file.originalname, content: file.buffer }]
        });

        res.status(200).json({ message: 'Enviado', info });
    } catch (error) {
        console.error('Error enviando:', error);
        res.status(500).json({ error: error.message });
    }
});

// 5. Arrancar el servidor (Sin especificar IP para dejar que Render decida)
app.listen(port, () => {
    console.log(`✅ Servidor escuchando en el puerto ${port}`);
});
