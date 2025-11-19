console.log("🚀 INICIANDO SERVIDOR (INTENTO PUERTO 587)...");

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname)); 

const upload = multer({ storage: multer.memoryStorage() });

let transporter = null;

const initMailer = () => {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log("⚙️ Configurando transporte (Puerto 587 STARTTLS)...");
        transporter = nodemailer.createTransport({
            service: 'gmail', // Volvemos a usar el preset de Gmail que a veces ayuda
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // Opciones de red cruciales para evitar bloqueos
            tls: {
                rejectUnauthorized: false, // Ignorar errores de certificado
                ciphers: 'SSLv3'
            }
        });
        console.log("✅ Configuración lista.");
    } else {
        console.log("⚠️ Faltan credenciales.");
    }
};

initMailer();

app.get('/', (req, res) => {
    const publicIndex = path.join(__dirname, 'public', 'index.html');
    const rootIndex = path.join(__dirname, 'index.html');
    res.sendFile(publicIndex, (err) => {
        if (err) res.sendFile(rootIndex, (err2) => {
            if (err2) res.send("<h1>Servidor Activo</h1>");
        });
    });
});

app.post('/send-receipt', upload.single('pdf'), async (req, res) => {
    console.log("📩 Recibida petición de envío...");
    
    if (!transporter) return res.status(500).json({ error: 'Correo no configurado.' });
    
    try {
        const { to, subject, text } = req.body;
        const file = req.file;
        if (!file) return res.status(400).send('Falta PDF.');

        console.log(`📤 Conectando (Puerto 587) para: ${to}`);
        
        const info = await transporter.sendMail({
            from: `"NóminaPro" <${process.env.EMAIL_USER}>`,
            to, subject, text,
            attachments: [{ filename: file.originalname, content: file.buffer }]
        });

        console.log("✅ ¡ENVIADO! ID:", info.messageId);
        res.status(200).json({ message: 'Enviado', info });
    } catch (error) {
        console.error('❌ Error al enviar:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`✅ Servidor escuchando en puerto ${port}`);
});
