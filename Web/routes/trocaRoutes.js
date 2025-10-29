import express from 'express';
import * as trocaController from '../controllers/trocaController.js';
const router = express.Router();
// Middleware para verificar se o usuário está logado
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        if (req.flash) req.flash('error', 'Você precisa estar logado para acessar esta página.');
        return res.redirect('/login');
    }
    next();
};
router.use(requireLogin);
// ==========================================================
// ROTAS DO CONTROLLER
// ==========================================================
// GET /trocas - ROTA PRINCIPAL: GERENCIAMENTO DE TROCAS
router.get("/", trocaController.gerenciarTrocas);
// GET /trocas/catalogo - CATÁLOGO DE ITENS (FEED)
router.get("/catalogo", trocaController.exibirFeed);
// GET /trocas/propor/:itemIdDesejado - FORMULÁRIO DE PROPOSTA
router.get("/propor/:itemIdDesejado", trocaController.exibirFormularioProposta);
// POST /trocas/propor - ENVIAR PROPOSTA
router.post("/propor", trocaController.enviarProposta);
// POST /trocas/aceitar/:trocaId - ACEITAR PROPOSTA
router.post("/aceitar/:trocaId", trocaController.aceitarProposta);
// POST /trocas/rejeitar/:trocaId - REJEITAR PROPOSTA
router.post("/rejeitar/:trocaId", trocaController.rejeitarProposta);
// POST /trocas/cancelar/:trocaId - CANCELAR PROPOSTA
router.post("/cancelar/:trocaId", trocaController.cancelarProposta);
// POST /trocas/finalizar/:trocaId - FINALIZAR TROCA
router.post("/finalizar/:trocaId", trocaController.finalizarTroca);
// GET /trocas/detalhes/:trocaId - API para Modal de Detalhes
router.get("/detalhes/:trocaId", trocaController.detalhesTroca);
// ROTAS DE REDIRECIONAMENTO 
router.get("/enviadas", trocaController.gerenciarTrocas);
router.get("/recebidas", trocaController.gerenciarTrocas);
router.get("/historico", trocaController.gerenciarTrocas);

export default router;