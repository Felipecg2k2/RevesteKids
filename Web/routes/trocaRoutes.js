// routes/trocaRoutes.js - CÓDIGO COMPLETO E CORRIGIDO

import express from 'express';
import Sequelize from 'sequelize'; 
import connection from '../config/sequelize-config.js';
import Troca from '../models/Troca.js';
import Item from '../models/Item.js'; 
import Usuario from '../models/Usuario.js';

const router = express.Router();

// Middleware para verificar se o usuário está logado
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

router.use(requireLogin); 

// ==========================================================
// ROTA 1: CATÁLOGO DE ITENS (FEED)
// ==========================================================
router.get("/catalogo", async (req, res) => {
    try {
        const userId = req.session.userId; 

        // 1. Busca IDs de itens em trocas Pendentes ou Aceitas para exclusão
        const itensEmTroca = await Troca.findAll({
            attributes: ['ItemDesejadoId', 'ItemOferecidoId'],
            where: {
                status: { [Sequelize.Op.in]: ['Pendente', 'Aceita'] }
            },
            raw: true 
        });
        const itensEmTrocaIDs = itensEmTroca.map(t => [t.ItemDesejadoId, t.ItemOferecidoId]).flat();
        
        // 2. Filtra o catálogo
        const itensCatalogo = await Item.findAll({
            where: { 
                UsuarioId: { [Sequelize.Op.ne]: userId }, 
                id: { [Sequelize.Op.notIn]: itensEmTrocaIDs },
                statusPosse: 'Ativo' 
            },
            include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade', 'estado'] }],
            order: [['createdAt', 'DESC']]
        });
        
        res.render('catalogo', { 
            title: "Catálogo de Peças",
            itens: itensCatalogo 
        });

    } catch (error) {
        console.error("ERRO AO CARREGAR CATÁLOGO:", error);
        res.render('catalogo', { title: "Catálogo de Peças", itens: [] });
    }
});


// ==========================================================
// ROTA 2: FORMULÁRIO DE PROPOSTA (CREATE VIEW)
// ==========================================================
router.get("/trocas/propor/:itemIdDesejado", async (req, res) => {
    try {
        const userId = req.session.userId;
        const itemIdDesejado = req.params.itemIdDesejado;

        // 1. Busca o Item que o usuário quer 
        const itemDesejado = await Item.findByPk(itemIdDesejado, {
            include: [{ model: Usuario, as: 'usuario', attributes: ['nome'] }] 
        });
        
        // 2. Busca os Itens que o usuário tem para oferecer (Apenas itens ativos)
        const meusItens = await Item.findAll({
            where: { 
                UsuarioId: userId,
                statusPosse: 'Ativo' 
            } 
        });

        if (!itemDesejado || itemDesejado.UsuarioId == userId) {
            return res.send("<h1>Erro!</h1><p>Item inválido ou item que pertence a você.</p>");
        }

        res.render('proporTroca', {
            title: "Propor Troca",
            itemDesejado: itemDesejado,
            meusItens: meusItens
        });

    } catch (error) {
        console.error("ERRO AO CARREGAR FORMULÁRIO DE PROPOSTA:", error);
        res.send("<h1>Erro!</h1><p>Não foi possível carregar o formulário de proposta.</p>");
    }
});

// ==========================================================
// ROTA 3: ENVIAR PROPOSTA (CREATE ACTION)
// ==========================================================
router.post("/trocas/propor", async (req, res) => {
    try {
        const proponenteId = req.session.userId;
        const { itemIdDesejado, itemOferecido } = req.body; 

        const itemDesejadoData = await Item.findByPk(itemIdDesejado);

        if (!itemDesejadoData) {
            req.flash('error', 'Item desejado não encontrado.');
            return res.redirect('/catalogo');
        }

        const receptorId = itemDesejadoData.UsuarioId;

        await Troca.create({
            ProponenteId: proponenteId,
            ReceptorId: receptorId,
            ItemOferecidoId: itemOferecido,
            ItemDesejadoId: itemIdDesejado,
            status: 'Pendente' 
        });
        
        req.flash('success', 'Proposta enviada com sucesso!');
        res.redirect('/trocas/enviadas');

    } catch (error) {
        console.error("ERRO AO ENVIAR PROPOSTA:", error);
        req.flash('error', 'Não foi possível enviar a proposta de troca.');
        res.redirect('/trocas/enviadas');
    }
});

// ==========================================================
// ROTA 4: MINHAS PROPOSTAS ENVIADAS (READ ALL do Proponente)
// ==========================================================
router.get("/trocas/enviadas", async (req, res) => {
    try {
        const proponenteId = req.session.userId;

        const propostas = await Troca.findAll({
            where: { ProponenteId: proponenteId },
            
            include: [
                { model: Item, as: 'itemOferecido', attributes: ['peca', 'tamanho'] },
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    attributes: ['peca', 'tamanho'],
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.render('trocasEnviadas', { 
            title: "Propostas Enviadas",
            propostas: propostas
        });

    } catch (error) {
        console.error("ERRO AO CARREGAR PROPOSTAS ENVIADAS:", error);
        res.send("<h1>Erro!</h1><p>Não foi possível carregar a lista de propostas enviadas.</p>");
    }
});

// ==========================================================
// ROTA 5: MINHAS PROPOSTAS RECEBIDAS (READ do Receptor)
// ==========================================================
router.get("/trocas/recebidas", async (req, res) => {
    try {
        const receptorId = req.session.userId;

        const propostas = await Troca.findAll({
            where: { ReceptorId: receptorId },

            include: [
                { model: Item, as: 'itemDesejado', attributes: ['peca', 'tamanho'] },
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade', 'estado'] }],
                    attributes: ['peca', 'tamanho']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.render('trocasRecebidas', { 
            title: "Propostas Recebidas",
            propostas: propostas
        });

    } catch (error) {
        console.error("ERRO AO CARREGAR PROPOSTAS RECEBIDAS:", error);
        res.render('trocasRecebidas', { 
            title: "Propostas Recebidas",
            propostas: []
        });
    }
});

// ==========================================================
// ROTA 6: ACEITAR PROPOSTA (UPDATE de Status) 
// ==========================================================
router.post("/trocas/aceitar/:trocaId", async (req, res) => {
    try {
        const { trocaId } = req.params;
        const receptorId = req.session.userId;

        const troca = await Troca.findByPk(trocaId, {
            include: [{ model: Item, as: 'itemDesejado' }]
        });

        if (!troca || troca.itemDesejado.UsuarioId !== receptorId) { 
            req.flash('error', 'Proposta não encontrada ou você não é o receptor.');
            return res.redirect("/trocas/recebidas");
        }

        if (troca.status !== 'Pendente') {
            req.flash('error', 'A proposta já foi respondida.');
            return res.redirect("/trocas/recebidas");
        }

        await troca.update({ 
            status: 'Aceita', 
            dataAceite: new Date()
        });

        req.flash('success', 'Proposta aceita! Prossiga para a finalização da troca.');
        res.redirect("/trocas/recebidas");

    } catch (error) {
        console.error("ERRO AO ACEITAR PROPOSTA:", error);
        req.flash('error', 'Erro ao aceitar a proposta.');
        res.redirect("/trocas/recebidas");
    }
});

// ==========================================================
// ROTA 7: REJEITAR PROPOSTA (UPDATE de Status) 
// ==========================================================
router.post("/trocas/rejeitar/:trocaId", async (req, res) => {
    try {
        const { trocaId } = req.params;
        const receptorId = req.session.userId;

        const troca = await Troca.findByPk(trocaId, {
            include: [{ model: Item, as: 'itemDesejado' }]
        });

        if (!troca || troca.itemDesejado.UsuarioId !== receptorId) {
            req.flash('error', 'Proposta não encontrada ou você não é o receptor.');
            return res.redirect("/trocas/recebidas");
        }

        if (troca.status !== 'Pendente') {
            req.flash('error', 'A proposta já foi respondida.');
            return res.redirect("/trocas/recebidas");
        }

        await troca.update({ status: 'Rejeitada' });

        req.flash('info', 'Proposta rejeitada.');
        res.redirect("/trocas/recebidas");

    } catch (error) {
        console.error("ERRO AO REJEITAR PROPOSTA:", error);
        req.flash('error', 'Erro ao rejeitar a proposta.');
        res.redirect("/trocas/recebidas");
    }
});

// ==========================================================
// ROTA 8: CANCELAR PROPOSTA (UPDATE do Proponente) 
// ==========================================================
router.post("/trocas/cancelar/:trocaId", async (req, res) => {
    try {
        const { trocaId } = req.params;
        const proponenteId = req.session.userId;

        const troca = await Troca.findByPk(trocaId);

        if (!troca || troca.ProponenteId !== proponenteId) {
            req.flash('error', 'Proposta não encontrada ou você não é o proponente.');
            return res.redirect("/trocas/enviadas");
        }
        
        if (troca.status !== 'Pendente') {
            req.flash('error', 'A proposta não pode mais ser cancelada.');
            return res.redirect("/trocas/enviadas");
        }

        await troca.update({ status: 'Cancelada' });
        
        req.flash('info', 'Proposta cancelada.');
        res.redirect("/trocas/enviadas");

    } catch (error) {
        console.error("ERRO AO CANCELAR PROPOSTA:", error);
        req.flash('error', 'Erro ao cancelar a proposta.');
        res.redirect("/trocas/enviadas");
    }
});


// ==========================================================
// ROTA 9: FINALIZAR TROCA (Troca a posse dos itens) 
// ==========================================================
router.post("/trocas/finalizar/:trocaId", async (req, res) => {
    const receptorId = req.session.userId; 
    const { trocaId } = req.params;
    
    // Inicia a transação
    const t = await connection.transaction(); 

    try {
        // 1. Busca a troca (com os itens associados)
        const troca = await Troca.findByPk(trocaId, {
            include: [
                { model: Item, as: 'itemDesejado' },
                { model: Item, as: 'itemOferecido' }
            ],
            transaction: t
        });

        // 2. Validação de Segurança
        if (!troca || troca.ReceptorId !== receptorId || troca.status !== 'Aceita') {
            await t.rollback();
            req.flash('error', 'Troca inválida para finalização.');
            return res.redirect("/trocas/recebidas");
        }

        // 3. Transferência de Posse dos Itens
        await Item.update(
            { UsuarioId: troca.ProponenteId }, 
            { where: { id: troca.ItemDesejadoId }, transaction: t }
        );
        
        await Item.update(
            { UsuarioId: troca.ReceptorId }, 
            { where: { id: troca.ItemOferecidoId }, transaction: t }
        );

        // UPDATE CRÍTICO: Marcar ambos os itens como HISTÓRICO/INATIVOS (statusPosse)
        await Item.update(
            { statusPosse: 'Historico' },
            { 
                where: { 
                    [Sequelize.Op.or]: [
                        { id: troca.ItemDesejadoId }, 
                        { id: troca.ItemOferecidoId }
                    ]
                }, 
                transaction: t 
            }
        );

        // 4. Atualiza o status da Troca
        await troca.update({ status: 'Finalizada', dataFinalizacao: new Date() }, { transaction: t });

        // 5. Confirma todas as alterações
        await t.commit(); 
        
        req.flash('success', 'Troca finalizada com sucesso! A posse dos itens foi transferida.');
        res.redirect("/trocas/recebidas");

    } catch (error) {
        await t.rollback(); 
        console.error("ERRO CRÍTICO AO FINALIZAR TROCA (Catch Block):", error);
        req.flash('error', 'Ocorreu um erro crítico ao tentar finalizar a troca.');
        res.redirect("/trocas/recebidas");
    }
});

// ==========================================================
// ROTA NOVA: 10. HISTÓRICO DE TROCAS (FINALIZADAS, CANCELADAS, REJEITADAS)
// ==========================================================
router.get("/trocas/historico", async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Busca trocas Finalizadas, Canceladas ou Rejeitadas onde o usuário foi Proponente OU Receptor
        const historicoTrocas = await Troca.findAll({
            where: { 
                [Sequelize.Op.or]: [
                    { ProponenteId: userId },
                    { ReceptorId: userId }
                ],
                status: { [Sequelize.Op.in]: ['Finalizada', 'Cancelada', 'Rejeitada'] }
            },
            include: [
                { model: Item, as: 'itemOferecido', attributes: ['peca', 'tamanho'] },
                { model: Item, as: 'itemDesejado', attributes: ['peca', 'tamanho'] }
            ],
            order: [['dataFinalizacao', 'DESC'], ['createdAt', 'DESC']] // Ordena pelo mais recente
        });
        
        // **ATENÇÃO: VOCÊ PRECISA CRIAR ESTA VIEW!**
        res.render('historicoTrocas', { 
            title: "Histórico de Trocas",
            historico: historicoTrocas,
            userId: userId 
        });

    } catch (error) {
        console.error("ERRO AO CARREGAR HISTÓRICO DE TROCAS:", error);
        res.send("<h1>ERRO!</h1><p>Não foi possível carregar o histórico de trocas.</p>");
    }
});


export default router;