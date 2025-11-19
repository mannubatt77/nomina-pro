const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // Necesario para buscar el archivo

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Intentar servir archivos estáticos desde 'public' si existe
app.use(express.static(path.join(__dirname, 'public')));
// Intentar servir archivos estáticos desde la raíz (por si subiste todo suelto)
app.use(express.static(__dirname));

const upload = multer({ storage: multer.memoryStorage() });

// --- CONFIGURACIÓN DE CORREO ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- RUTAS ---

// Ruta Principal: Lógica "Inteligente" para encontrar tu HTML
app.get('/', (req, res) => {
    console.log('🔍 Alguien entró a la página principal. Buscando archivo HTML...');

    // Opción 1: Buscar public/index.html (Lo ideal)
    const pathPublic = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(pathPublic)) {
        console.log('✅ Encontrado en public/index.html');
        return res.sendFile(pathPublic);
    }

    // Opción 2: Buscar index.html en la raíz (Error común al subir)
    const pathRoot = path.join(__dirname, 'index.html');
    if (fs.existsSync(pathRoot)) {
        console.log('✅ Encontrado en raíz/index.html');
        return res.sendFile(pathRoot);
    }

    // Opción 3: Buscar CUALQUIER archivo .html en la raíz (Salvavidas)
    try {
        const files = fs.readdirSync(__dirname);
        const htmlFile = files.find(file => file.endsWith('.html'));
        if (htmlFile) {
            console.log(`✅ Encontrado archivo alternativo: ${htmlFile}`);
            return res.sendFile(path.join(__dirname, htmlFile));
        }
    } catch (e) {
        console.error("Error buscando archivos:", e);
    }

    // Si no encuentra nada, mostrar mensaje de error en pantalla
    console.error('❌ ERROR CRÍTICO: No se encontró ningún archivo .html');
    res.send(`
        <h1>Error de Configuración</h1>
        <p>El servidor está funcionando, pero no encuentra tu archivo HTML.</p>
        <p>Asegúrate de que en tu GitHub hayas subido el archivo <b>index.html</b>.</p>
        <p>Archivos encontrados en la carpeta actual: ${fs.readdirSync(__dirname).join(', ')}</p>
    `);
});

app.post('/send-receipt', upload.single('pdf'), async (req, res) => {
    console.log('📨 Recibida petición para enviar correo...');
    try {
        const { to, subject, text } = req.body;
        const file = req.file;

        if (!file) return res.status(400).send('No se recibió el archivo PDF.');
        
        // Verificación de seguridad para evitar crasheos si faltan variables
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('❌ Faltan las variables de entorno EMAIL_USER o EMAIL_PASS');
            return res.status(500).json({ error: 'Error de configuración del servidor: Faltan credenciales.' });
        }

        const mailOptions = {
            from: `"NóminaPro System" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            text: text,
            attachments: [{ filename: file.originalname, content: file.buffer }]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Correo enviado con éxito: ' + info.response);
        res.status(200).json({ message: 'Correo enviado exitosamente', info: info });

    } catch (error) {
        console.error('❌ Error al enviar:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`✅ Servidor NóminaPro corriendo en puerto ${port}`);
    console.log(`📂 Directorio actual: ${__dirname}`);
});
