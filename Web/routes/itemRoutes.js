// routes/itemRoutes.js - CORRIGIDO E ROBUSTO

import express from 'express';
import Item from '../models/Item.js'; 
// import Troca from '../models/Troca.js'; // REMOVIDO: A responsabilidade de usar Troca.js é de trocaRoutes.js
import Usuario from '../models/Usuario.js'; // Mantido se necessário para associações EAGER loading (embora não esteja sendo usado nas buscas atuais)
import { Op } from 'sequelize';
const router = express.Router();

// ==========================================================
// IMPORTAÇÃO CRÍTICA (RESOLVE O ERRO Troca.count is not a function)
// ==========================================================
// Importa as funções auxiliares que utilizam o modelo Troca, 
// garantindo que o modelo Troca já esteja totalmente inicializado em trocaRoutes.js
import { contarTrocasRealizadas, buscarHistoricoTrocas } from './trocaRoutes.js'; 

// ... MIDDLEWARE requireLogin (Mantido) ...
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}
router.use(requireLogin); 

// ==========================================================
// ROTA GET: LISTAR AS ROUPAS DO USUÁRIO LOGADO (READ ALL)
// ==========================================================
// Rota GET /roupas 
router.get("/roupas", async (req, res) => {
    const idUsuario = req.session.userId;
    
    // Lógica de filtro: 'Ativo' é o padrão se não for 'EmTroca' ou 'Historico'
    const statusFiltro = req.query.status || 'Ativo'; 
    const mostrarHistorico = statusFiltro === 'Historico'; 
    
    let whereClause = { UsuarioId: idUsuario }; 
    
    if (statusFiltro === 'EmTroca') {
        whereClause.statusPosse = 'EmTroca'; 
    } else if (statusFiltro === 'Ativo') {
        whereClause.statusPosse = 'Ativo'; 
    } // Se for 'Historico', o whereClause não é usado para buscar itens (a busca é feita em historicoTrocas)
    
    try {
        let itens = [];
        let historicoTrocas = [];
        
        if (mostrarHistorico) {
            // Usa a função IMPORTADA de TrocaRoutes para buscar histórico
            historicoTrocas = await buscarHistoricoTrocas(idUsuario);
        } else {
            // Busca apenas se não for histórico (Ativo ou EmTroca)
            itens = await Item.findAll({ 
                where: whereClause,
                order: [['createdAt', 'DESC']],
                raw: true // Para retornar objetos JSON simples e evitar problemas de serialização
            });
        }

        // Busca de contadores de status (independentes do filtro de exibição)
        const totalAtivas = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'Ativo' } });
        const emTroca = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'EmTroca' } });
        
        // A chamada que estava falhando: agora usa a função IMPORTADA
        const trocasRealizadas = await contarTrocasRealizadas(idUsuario); 

        res.render('roupas', { 
            userId: idUsuario, 
            itens: itens, 
            totalCadastradas: totalAtivas + emTroca, 
            totalAtivas: totalAtivas, 
            emTroca: emTroca,
            trocasRealizadas: trocasRealizadas, 
            itemParaEditar: null,
            filtroStatus: statusFiltro,
            mostrarHistorico: mostrarHistorico,
            historicoTrocas: historicoTrocas
        }); 
        
    } catch (error) {
        console.error("ERRO AO CARREGAR VIEW DE GERENCIAMENTO/HISTÓRICO:", error);
        // Resposta de erro para o frontend
        res.send('<h1>ERRO!</h1><p>Não foi possível carregar o painel de gerenciamento.</p>');
    }
});


// ==========================================================
// ROTA GET: BUSCAR ITEM PARA EDIÇÃO (READ ONE)
// ==========================================================
router.get("/roupas/editar/:id", async (req, res) => {
    const idItem = req.params.id;
    const idUsuario = req.session.userId;
    
    try {
        const item = await Item.findOne({
            where: {
                id: idItem,
                UsuarioId: idUsuario 
            }
        });

        if (item) {
            const totalAtivas = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'Ativo' } });
            const emTroca = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'EmTroca' } });
            // Usa a função IMPORTADA de TrocaRoutes
            const trocasRealizadas = await contarTrocasRealizadas(idUsuario); 
            
            res.render('roupas', { 
                userId: idUsuario, 
                itens: [], 
                itemParaEditar: item.get({ plain: true }), 
                totalCadastradas: totalAtivas + emTroca, 
                totalAtivas: totalAtivas, 
                emTroca: emTroca,
                trocasRealizadas: trocasRealizadas,
                filtroStatus: item.statusPosse || 'Ativo',
                mostrarHistorico: false, 
                historicoTrocas: []
            }); 
        } else {
            res.redirect('/roupas');
        }

    } catch (error) {
        console.error("ERRO AO BUSCAR ITEM PARA EDIÇÃO:", error);
        res.redirect('/roupas');
    }
});


// ==========================================================
// ROTA POST: CRIA OU ATUALIZA UM ITEM (UNIFICADO: CREATE & UPDATE)
// ==========================================================
router.post('/roupas/salvar', async (req, res) => {
    const idUsuario = req.session.userId;
    const dadosItem = req.body;
    
    const itemId = dadosItem.id || null; 
    
    // Validação básica
    if (!dadosItem.peca || !dadosItem.tipo || !dadosItem.tamanho || !dadosItem.condicao || !dadosItem.categoriaPeca) {
        // Redireciona com erro se a rota for de edição, senão para a lista
        return res.redirect(itemId ? `/roupas/editar/${itemId}?error=CamposObrigatorios` : '/roupas'); 
    }

    // Campos permitidos
    const itemDados = {
        peca: dadosItem.peca,
        categoriaPeca: dadosItem.categoriaPeca,
        tipo: dadosItem.tipo,
        tamanho: dadosItem.tamanho,
        cor: dadosItem.cor,
        tecido: dadosItem.tecido,
        estacao: dadosItem.estacao,
        condicao: dadosItem.condicao,
        descricao: dadosItem.descricao,
        UsuarioId: idUsuario 
    };
    
    try {
        if (itemId) {
            // --- LÓGICA DE UPDATE (EDIÇÃO) ---
            const [rowsAffected] = await Item.update(itemDados, {
                where: {
                    id: itemId,
                    UsuarioId: idUsuario 
                }
            });
            res.redirect('/roupas'); 
            
        } else {
            // --- LÓGICA DE CREATE (CRIAÇÃO) ---
            const itemParaCriar = { ...itemDados, statusPosse: 'Ativo' }; 
            await Item.create(itemParaCriar);
            res.redirect('/roupas'); 
        }
        
    } catch (error) {
        console.error(`ERRO AO SALVAR ITEM (ID: ${itemId || 'novo'}):`, error);
        res.redirect('/roupas');
    }
});


// ==========================================================
// ROTA GET: Exclui um item (DELETE)
// ==========================================================
router.get('/roupas/excluir/:id', async (req, res) => {
    const idItem = req.params.id;
    const idUsuario = req.session.userId;
    
    try {
        const item = await Item.findOne({
            where: { id: idItem, UsuarioId: idUsuario }
        });

        if (!item) {
            return res.redirect('/roupas');
        }

        // Previne exclusão de itens em processo de troca
        if (item.statusPosse !== 'Ativo') {
            return res.redirect('/roupas?status=EmTroca'); 
        }

        const rowsDeleted = await Item.destroy({
            where: {
                id: idItem,
                UsuarioId: idUsuario 
            }
        });

        res.redirect('/roupas'); 
        
    } catch (error) {
        console.error("ERRO AO EXCLUIR ITEM:", error);
        res.redirect('/roupas');
    }
});


export default router;