import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ==========================================================
// FIX: Definir __dirname e __filename para ES Modules
// O __dirname aqui é o caminho absoluto para /Web/config
// ==========================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Função auxiliar para criar o diretório se ele não existir
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Diretório de upload criado: ${dir}`);
    }
};

// ------------------------------------------------------------------
// CONFIGURAÇÕES REUTILIZÁVEIS
// ------------------------------------------------------------------

// 1. Filtro de arquivo (apenas imagens)
const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        // Em caso de erro de filtro, o Multer não processa.
        cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
};

// 2. Limite de tamanho (2MB) - Comum para todos os uploads de imagens
const imageLimits = {
    fileSize: 2 * 1024 * 1024 // 2MB
};

// Limites específicos para Itens/Roupas
const itemImageLimits = {
    fileSize: 2 * 1024 * 1024, // 2MB por arquivo
    maxCount: 5 // Limite de 5 arquivos por requisição
};


// ==================================================================
// 1. UPLOAD DE PERFIL (Edição)
// ==================================================================

// 🚨 CAMINHO CORRIGIDO: De /Web/config/ para /Web/public/uploads/perfis
const profileUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'perfis');
ensureDirectoryExists(profileUploadDir);

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profileUploadDir);
    },
    filename: (req, file, cb) => {
        // Usa o ID do usuário logado para nomear o arquivo
        const userId = req.session && req.session.userId ? req.session.userId : `temp-${Date.now()}`;
        const ext = path.extname(file.originalname);
        cb(null, `profile-${userId}${ext}`);
    }
});

export const profileUpload = multer({
    storage: profileStorage,
    fileFilter: imageFileFilter,
    limits: imageLimits
});

// ==================================================================
// 2. UPLOAD DE CADASTRO DE USUÁRIO
// ==================================================================

const userCadastroStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profileUploadDir); // Salva na pasta de perfis
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `cadastro-temp-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        cb(null, uniqueName);
    }
});

export const userCadastroUpload = multer({
    storage: userCadastroStorage,
    fileFilter: imageFileFilter,
    limits: imageLimits
});

// ==================================================================
// 3. UPLOAD DE ITENS/ROUPAS
// ==================================================================

// 🚨 CAMINHO CORRIGIDO: De /Web/config/ para /Web/public/uploads/itens
const itemUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'itens');
ensureDirectoryExists(itemUploadDir);

const itemStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, itemUploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `item-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        cb(null, uniqueName);
    }
});

export const itemUpload = multer({
    storage: itemStorage,
    fileFilter: imageFileFilter,
    limits: itemImageLimits
});
