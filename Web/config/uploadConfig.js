import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 

// Define o caminho ABSOLUTO para onde os arquivos serão salvos: .../public/uploads/itens
// Subindo três níveis a partir de config (config -> raiz -> public -> uploads -> itens)
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'itens');

// Configuração de Armazenamento do Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Essa parte cria a pasta de upload se ela não existir!
        if (!fs.existsSync(uploadDir)) {
            // Cria a pasta de forma recursiva (cria 'uploads' e 'itens' se for necessário)
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        // Cria um nome de arquivo único
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, 'item-' + uniqueSuffix + fileExtension);
    }
});

// Exporta o Multer configurado
const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024 // Limite de 5MB por arquivo
    },
    fileFilter: (req, file, cb) => {
        // Filtro para aceitar apenas imagens
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos de imagem são permitidos.'), false);
        }
    }
});

export default upload;