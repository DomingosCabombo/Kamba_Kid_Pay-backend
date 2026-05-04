const multer = require("multer");
const path = require("path");
const fs = require("fs");

const pastas = ["uploads", "uploads2", "uploadCampanhas"];
pastas.forEach(pasta => {
    if (!fs.existsSync(pasta)) {
        fs.mkdirSync(pasta, { recursive: true });
    }
});

// Configuração base do multer
const storage = (pastaDestino) => multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, pastaDestino);
    },
    filename: function (req, file, cb) {
        // Nome único: timestamp + nome original sem espaços
        const nomeLimpo = file.originalname.replace(/\s/g, '_');
        cb(null, Date.now() + '-' + nomeLimpo);
    }
});

// Filtro para aceitar imagens e vídeos
const fileFilter = (req, file, cb) => {
    console.log("FILE FILTER - MIMETYPE:", file.mimetype, "FIELD:", file.fieldname);
    const tiposImagem = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const tiposVideo = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mpeg', 'application/octet-stream'];
    
    if (tiposImagem.includes(file.mimetype) || tiposVideo.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Tipo de ficheiro não suportado: ${file.mimetype}`), false);
    }
};

// Criar middlewares para cada pasta
const upload = multer({
    storage: storage("uploads"),
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB para vídeos
});

const upload2 = multer({
    storage: storage("uploads2"),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadCampanhas = multer({
    storage: storage("uploadCampanhas"),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = {
    upload,          // para tarefas (comprovacao)
    upload2,         // para missões (foto tarefa)
    uploadCampanhas  // para campanhas
};

