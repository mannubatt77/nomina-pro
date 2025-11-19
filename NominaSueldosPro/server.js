const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
// Render asigna un puerto dinámicamente en process.env.PORT.
// Si no existe (local), usa el 3000.
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos (como tu HTML)
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });

// --- CONFIGURACIÓN DE CORREO SEGURA ---
// Usaremos variables de entorno para no exponer tu contraseña
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Se leerá de la configuración de Render
        pass: process.env.EMAIL_PASS  // Se leerá de la configuración de Render
    }
});

// Ruta para servir la aplicación principal (Frontend)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/send-receipt', upload.single('pdf'), async (req, res) => {
    try {
        const { to, subject, text } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).send('No se recibió el archivo PDF.');
        }

        // Verificar que las credenciales existan
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
             throw new Error("Faltan las credenciales de correo en el servidor.");
        }

        const mailOptions = {
            from: `"NóminaPro System" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            text: text,
            attachments: [
                {
                    filename: file.originalname,
                    content: file.buffer
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado: ' + info.response);
        res.status(200).json({ message: 'Correo enviado exitosamente', info: info });

    } catch (error) {
        console.error('Error al enviar:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`✅ Servidor NóminaPro corriendo en puerto ${port}`);
});