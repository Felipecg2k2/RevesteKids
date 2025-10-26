import express from 'express';
// IMPORTA O CONTROLLER (a lógica de negócio)
import * as itemController from '../controllers/itemController.js'; 
const router = express.Router();
function requireLogin(req, res, next) {
    if (req.session.userId && typeof req.session.userId === 'string') {
        req.session.userId = parseInt(req.session.userId, 10);
    }
    if (!req.session.userId) {
        req.flash('error_msg', 'Você precisa estar logado para acessar esta página.');
        return res.redirect('/login');
    }
    next();
}
router.use(requireLogin); 
// ==========================================================
// ROTAS DE ITENS (APENAS MAPEAMENTO)
// ==========================================================
// ROTA GET: LISTAR AS ROUPAS DO USUÁRIO LOGADO (READ ALL)
// URL: GET /roupas
router.get("/", itemController.getItensUsuario);
// ROTA GET: BUSCAR ITEM PARA EDIÇÃO (READ ONE)
// URL: GET /roupas/editar/:id
router.get("/editar/:id", itemController.getFormularioEdicao);
// ROTA POST: CRIA OU ATUALIZA UM ITEM (CREATE & UPDATE)
// URL: POST /roupas/salvar
router.post('/salvar', itemController.salvarItem);
// ROTA GET: Exclui um item (DELETE)
// URL: GET /roupas/excluir/:id
router.get('/excluir/:id', itemController.excluirItem);
export default router;

// ⚠️ AVISO DE ARQUITETURA: 
// Se as funções 'contarTrocasRealizadas' e 'buscarHistoricoTrocas' eram exportadas
// DO seu antigo itemRoutes.js e eram chamadas PELO trocaRoutes, a arquitetura 
// está invertida. Você precisa garantir que elas são exportadas do 
// TROCAController ou TROCAModel para que o ItemController as chame.
// A linha abaixo é apenas um placeholder de correção se elas existiam no antigo
// itemRoutes e eram importadas de volta:
// export { contarTrocasRealizadas, buscarHistoricoTrocas }; // Se necessário para trocaRoutes