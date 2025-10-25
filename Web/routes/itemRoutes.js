// routes/itemRoutes.js - FINAL CORRIGIDO E OTIMIZADO

import express from 'express';
import Item from '../models/Item.js'; 
import Usuario from '../models/Usuario.js'; 
import { Op } from 'sequelize';
const router = express.Router();

// AVISO: Mantida a importação com dependência circular para TrocaRoutes
// (Você precisa garantir que 'trocaRoutes.js' exporte estas duas funções)
import { contarTrocasRealizadas, buscarHistoricoTrocas } from './trocaRoutes.js'; 

// ==========================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// Aplica a lógica de login e define res.locals.userId
// ==========================================================
function requireLogin(req, res, next) {
    // Tratamento de parse (Se não for string, não faz)
    if (req.session.userId && typeof req.session.userId === 'string') {
        req.session.userId = parseInt(req.session.userId, 10);
    }
    
    // Verifica autenticação
    if (!req.session.userId) {
        if (req.flash) {
            req.flash('error', 'Você precisa estar logado para acessar esta página.');
        }
        return res.redirect('/login');
    }
    
    // Define res.locals para fácil acesso em todas as rotas
    res.locals.userId = req.session.userId;
    next();
}
// Aplica o middleware a TODAS as rotas neste roteador
router.use(requireLogin); 

// ==========================================================
// ROTA GET: LISTAR AS ROUPAS DO USUÁRIO LOGADO (READ ALL)
// URL Externa: GET /roupas
// ==========================================================
router.get("/", async (req, res) => { 
    const idUsuario = res.locals.userId;
    
    // Filtros
    const statusFiltro = req.query.status || 'Ativo'; 
    const mostrarHistorico = statusFiltro === 'Historico'; 
    
    let whereClause = { UsuarioId: idUsuario }; 
    
    if (statusFiltro === 'EmTroca') {
        whereClause.statusPosse = 'EmTroca'; 
    } else if (statusFiltro === 'Ativo') {
        whereClause.statusPosse = 'Ativo'; 
    } 
    
    try {
        let itens = [];
        let historicoTrocas = [];
        
        if (mostrarHistorico) {
            historicoTrocas = await buscarHistoricoTrocas(idUsuario);
        } else {
            itens = await Item.findAll({ 
                where: whereClause,
                order: [['createdAt', 'DESC']],
                raw: true 
            });
        }

        // Contadores
        const totalAtivas = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'Ativo' } });
        const emTroca = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'EmTroca' } });
        const trocasRealizadas = await contarTrocasRealizadas(idUsuario); 

        const messages = req.flash ? req.flash() : {};

        res.render('roupas', { 
            title: 'Minhas Roupas', 
            userId: idUsuario, 
            itens: itens, 
            totalCadastradas: totalAtivas + emTroca, 
            totalAtivas: totalAtivas, 
            emTroca: emTroca,
            trocasRealizadas: trocasRealizadas, 
            itemParaEditar: null,
            filtroStatus: statusFiltro,
            mostrarHistorico: mostrarHistorico,
            historicoTrocas: historicoTrocas,
            messages: messages
        }); 
        
    } catch (error) {
        console.error("ERRO AO CARREGAR VIEW DE GERENCIAMENTO/HISTÓRICO:", error);
        if (req.flash) req.flash('error', 'Ocorreu um erro ao carregar seus itens.');
        res.redirect('/feed'); 
    }
});


// ==========================================================
// ROTA GET: BUSCAR ITEM PARA EDIÇÃO (READ ONE)
// URL Externa: GET /roupas/editar/:id
// ==========================================================
router.get("/editar/:id", async (req, res) => { 
    const idItem = req.params.id;
    const idUsuario = res.locals.userId; 
    
    try {
        const item = await Item.findOne({
            where: {
                id: idItem,
                UsuarioId: idUsuario 
            }
        });

        if (item) {
            // Recarrega todos os itens para a lista lateral/card
            const itensLista = await Item.findAll({ 
                where: { UsuarioId: idUsuario, statusPosse: { [Op.ne]: 'Historico' } }, 
                order: [['createdAt', 'DESC']], 
                raw: true 
            }); 
            
            const totalAtivas = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'Ativo' } });
            const emTroca = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'EmTroca' } });
            const trocasRealizadas = await contarTrocasRealizadas(idUsuario); 
            
            const messages = req.flash ? req.flash() : {};

            res.render('roupas', { 
                title: 'Editar Peça', 
                userId: idUsuario, 
                itens: itensLista, // Lista de itens para manter a navegação
                itemParaEditar: item.get({ plain: true }), 
                totalCadastradas: totalAtivas + emTroca, 
                totalAtivas: totalAtivas, 
                emTroca: emTroca,
                trocasRealizadas: trocasRealizadas,
                filtroStatus: item.statusPosse || 'Ativo',
                mostrarHistorico: false, 
                historicoTrocas: [],
                messages: messages
            }); 
        } else {
            if (req.flash) req.flash('error', 'Item não encontrado ou você não tem permissão para editá-lo.');
            res.redirect('/roupas');
        }

    } catch (error) {
        console.error("ERRO AO BUSCAR ITEM PARA EDIÇÃO:", error);
        if (req.flash) req.flash('error', 'Erro ao carregar item para edição.');
        res.redirect('/roupas');
    }
});


// ==========================================================
// ROTA POST: CRIA OU ATUALIZA UM ITEM (UNIFICADO: CREATE & UPDATE)
// URL Externa: POST /roupas/salvar
// ** ISTO RESOLVE O ERRO 404 DO 'SALVAR' **
// ==========================================================
router.post('/salvar', async (req, res) => { 
    const idUsuario = res.locals.userId; 
    const dadosItem = req.body;
    
    const itemId = dadosItem.id || null; 
    
    // Validação básica
    if (!dadosItem.peca || !dadosItem.tipo || !dadosItem.tamanho || !dadosItem.condicao || !dadosItem.categoriaPeca) {
        if (req.flash) req.flash('error', 'Todos os campos obrigatórios devem ser preenchidos.');
        
        // Redireciona de volta para a edição ou para a lista
        return res.redirect(itemId ? `/roupas/editar/${itemId}` : '/roupas'); 
    }

    // Campos permitidos e sanitização
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
        UsuarioId: idUsuario,
        // Mantém a fotoUrl se estiver sendo passada, ou ignora se for um processo de upload separado
        // fotoUrl: dadosItem.fotoUrl, 
    };
    
    try {
        if (itemId) {
            // --- UPDATE (EDIÇÃO) ---
            await Item.update(itemDados, {
                where: {
                    id: itemId,
                    UsuarioId: idUsuario 
                }
            });
            if (req.flash) req.flash('success', 'Item atualizado com sucesso!');
            res.redirect('/roupas'); 
            
        } else {
            // --- CREATE (CRIAÇÃO) ---
            const itemParaCriar = { ...itemDados, statusPosse: 'Ativo' }; 
            await Item.create(itemParaCriar);
            if (req.flash) req.flash('success', 'Nova peça cadastrada com sucesso!');
            res.redirect('/roupas'); 
        }
        
    } catch (error) {
        console.error(`ERRO AO SALVAR ITEM (ID: ${itemId || 'novo'}):`, error);
        if (req.flash) req.flash('error', 'Erro interno ao salvar o item.');
        res.redirect('/roupas');
    }
});


// ==========================================================
// ROTA GET: Exclui um item (DELETE)
// URL Externa: GET /roupas/excluir/:id
// ==========================================================
router.get('/excluir/:id', async (req, res) => {
    const idItem = req.params.id;
    const idUsuario = res.locals.userId;
    
    try {
        const item = await Item.findOne({
            where: { id: idItem, UsuarioId: idUsuario }
        });

        if (!item) {
            if (req.flash) req.flash('error', 'Item não encontrado ou você não tem permissão.');
            return res.redirect('/roupas');
        }

        // Previne exclusão de itens em processo de troca
        if (item.statusPosse !== 'Ativo') {
            if (req.flash) req.flash('warning', 'Esta peça não pode ser excluída pois está envolvida em uma troca pendente.');
            return res.redirect('/roupas?status=EmTroca'); 
        }

        const rowsDeleted = await Item.destroy({
            where: {
                id: idItem,
                UsuarioId: idUsuario 
            }
        });

        if (rowsDeleted > 0) {
            if (req.flash) req.flash('success', `Peça "${item.peca}" excluída com sucesso!`);
        } else {
            if (req.flash) req.flash('error', 'O item não pôde ser excluído.');
        }

        res.redirect('/roupas'); 
        
    } catch (error) {
        console.error("ERRO AO EXCLUIR ITEM:", error);
        if (req.flash) req.flash('error', 'Erro interno ao tentar excluir o item.');
        res.redirect('/roupas');
    }
});


export default router;