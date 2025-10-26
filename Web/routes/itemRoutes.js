import express from 'express';
// IMPORTA O CONTROLLER (a lógica de negócio)
import * as itemController from '../controllers/itemController.js'; 
// 🚨 CORREÇÃO: Importa o Multer configurado especificamente para ITENS (roupas).
import { itemUpload } from '../config/multer.js'; 

const router = express.Router();

function requireLogin(req, res, next) {
    // Garante que o userId existe e é um número (conversão segura)
    if (req.session.userId) {
        if (typeof req.session.userId === 'string') {
            req.session.userId = parseInt(req.session.userId, 10);
        }
    }
    
    if (!req.session.userId || isNaN(req.session.userId)) {
        req.flash('error_msg', 'Você precisa estar logado para acessar esta página.');
        return res.redirect('/login');
    }
    next();
}

router.use(requireLogin); 

// ==========================================================
// ROTAS DE ITENS (CRUD)
// ==========================================================
// ROTA GET: LISTAR AS ROUPAS DO USUÁRIO LOGADO (READ ALL)
// URL: GET /roupas
router.get("/", itemController.getItensUsuario);

// ROTA GET: BUSCAR ITEM PARA EDIÇÃO (READ ONE - Carrega o Modal de Edição)
// URL: GET /roupas/editar/:id
router.get("/editar/:id", itemController.getFormularioEdicao);

// ROTA POST: CRIA UM NOVO ITEM (CREATE)
// CRÍTICO: Usa o nome de campo PADRÃO 'imagens_upload'.
// URL: POST /roupas/salvar
router.post(
    '/salvar', 
    itemUpload.array('imagens_upload', 5), // Nome de campo: 'imagens_upload'
    itemController.salvarItem
);

// 🚀 ROTA POST: ATUALIZA UM ITEM EXISTENTE (UPDATE)
// CORREÇÃO: Usa o nome de campo PADRÃO 'imagens_upload'. 
// A lógica do JS no frontend (/js/roupas.js) garante que este campo SÓ será
// enviado se o usuário selecionou novos arquivos, evitando o MulterError
// na edição sem novos arquivos.
// URL: POST /roupas/salvar-edicao
router.post(
    '/salvar-edicao', 
    itemUpload.array('imagens_upload', 5), // CORRIGIDO para 'imagens_upload'
    itemController.salvarEdicao
);


// ROTA GET: Exclui um item (DELETE)
// URL: GET /roupas/excluir/:id
router.get('/excluir/:id', itemController.excluirItem);

export default router;