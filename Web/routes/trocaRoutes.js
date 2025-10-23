// routes/trocaRoutes.js - CÓDIGO FINAL E CORRIGIDO

import express from 'express';
// Importamos o Op diretamente para uso em cláusulas 'where'.
import { Op } from 'sequelize'; 
import connection from '../config/sequelize-config.js'; 
import Troca from '../models/Troca.js';
import Item from '../models/Item.js'; 
import Usuario from '../models/Usuario.js';
// Mantido o import de Sequelize caso outras constantes/funções do Sequelize sejam necessárias
import Sequelize from 'sequelize'; 

const router = express.Router();

// Middleware para verificar se o usuário está logado
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        // Redireciona para /login se o usuário não estiver logado
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

        // 1. Busca IDs de itens em trocas Pendentes ou Aceitas para exclusão do Catálogo
        const itensEmTroca = await Troca.findAll({
            attributes: ['ItemDesejadoId', 'ItemOferecidoId'],
            where: {
                status: { [Op.in]: ['Pendente', 'Aceita'] } 
            },
            raw: true 
        });
        
        // Cria um array plano de todos os IDs envolvidos
        const itensEmTrocaIDs = itensEmTroca.map(t => [t.ItemDesejadoId, t.ItemOferecidoId]).flat().filter(id => id != null);
        
        // 2. Filtra o catálogo
        const itensCatalogo = await Item.findAll({
            where: { 
                UsuarioId: { [Op.ne]: userId }, 
                // Exclui itens que já estão em negociação
                id: { [Op.notIn]: itensEmTrocaIDs }, 
                statusPosse: 'Ativo' // Apenas itens ativos
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
        // Em caso de erro, renderiza com array vazio para evitar travamentos
        res.render('catalogo', { title: "Catálogo de Peças", itens: [] });
    }
});


// ==========================================================
// ROTA 2: FORMULÁRIO DE PROPOSTA (CREATE VIEW)
// ==========================================================
// Rota: /trocas/propor/:itemIdDesejado
router.get("/propor/:itemIdDesejado", async (req, res) => {
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
// Rota: /trocas/propor
router.post("/propor", async (req, res) => {
    try {
        const proponenteId = req.session.userId;
        const { itemIdDesejado, itemOferecido } = req.body; 

        // 1. Busca dados do item desejado para obter o ReceptorId
        const itemDesejadoData = await Item.findByPk(itemIdDesejado);

        if (!itemDesejadoData) {
            return res.redirect('/catalogo');
        }

        const receptorId = itemDesejadoData.UsuarioId;

        // 2. Cria a proposta de troca
        await Troca.create({
            ProponenteId: proponenteId,
            ReceptorId: receptorId,
            ItemOferecidoId: itemOferecido,
            ItemDesejadoId: itemIdDesejado,
            status: 'Pendente' 
        });
        
        res.redirect('/trocas/enviadas');

    } catch (error) {
        console.error("ERRO AO ENVIAR PROPOSTA:", error);
        res.redirect('/trocas/enviadas');
    }
});

// ==========================================================
// ROTA 4: MINHAS PROPOSTAS ENVIADAS (READ ALL do Proponente)
// ==========================================================
// Rota: /trocas/enviadas
router.get("/enviadas", async (req, res) => {
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
// Rota: /trocas/recebidas
router.get("/recebidas", async (req, res) => {
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
// Rota: /trocas/aceitar/:trocaId
router.post("/aceitar/:trocaId", async (req, res) => {
    try {
        const { trocaId } = req.params;
        const receptorId = req.session.userId;

        const troca = await Troca.findByPk(trocaId, {
            include: [{ model: Item, as: 'itemDesejado' }]
        });

        // Valida se a troca existe e pertence ao usuário logado
        if (!troca || troca.itemDesejado.UsuarioId !== receptorId) { 
            return res.redirect("/trocas/recebidas");
        }

        // Valida o status
        if (troca.status !== 'Pendente') {
            return res.redirect("/trocas/recebidas");
        }

        await troca.update({ 
            status: 'Aceita', 
            dataAceite: new Date()
        });

        res.redirect("/trocas/recebidas");

    } catch (error) {
        console.error("ERRO AO ACEITAR PROPOSTA:", error);
        res.redirect("/trocas/recebidas");
    }
});

// ==========================================================
// ROTA 7: REJEITAR PROPOSTA (UPDATE de Status) 
// ==========================================================
// Rota: /trocas/rejeitar/:trocaId
router.post("/rejeitar/:trocaId", async (req, res) => {
    try {
        const { trocaId } = req.params;
        const receptorId = req.session.userId;

        const troca = await Troca.findByPk(trocaId, {
            include: [{ model: Item, as: 'itemDesejado' }]
        });

        // Valida se a troca existe e pertence ao usuário logado
        if (!troca || troca.itemDesejado.UsuarioId !== receptorId) {
            return res.redirect("/trocas/recebidas");
        }

        // Valida o status
        if (troca.status !== 'Pendente') {
            return res.redirect("/trocas/recebidas");
        }

        // Atualiza o status
        await troca.update({ status: 'Rejeitada' });

        res.redirect("/trocas/recebidas");

    } catch (error) {
        console.error("ERRO AO REJEITAR PROPOSTA:", error);
        res.redirect("/trocas/recebidas");
    }
});

// ==========================================================
// ROTA 8: CANCELAR PROPOSTA (UPDATE do Proponente) 
// ==========================================================
// Rota: /trocas/cancelar/:trocaId
router.post("/cancelar/:trocaId", async (req, res) => {
    try {
        const { trocaId } = req.params;
        const proponenteId = req.session.userId;

        const troca = await Troca.findByPk(trocaId);

        // Valida se a troca existe e se o usuário é o proponente
        if (!troca || troca.ProponenteId !== proponenteId) {
            return res.redirect("/trocas/enviadas");
        }
        
        // Valida o status
        if (troca.status !== 'Pendente') {
            return res.redirect("/trocas/enviadas");
        }

        // Atualiza o status
        await troca.update({ status: 'Cancelada' });
        
        res.redirect("/trocas/enviadas");

    } catch (error) {
        console.error("ERRO AO CANCELAR PROPOSTA:", error);
        res.redirect("/trocas/enviadas");
    }
});


// ==========================================================
// ROTA 9: FINALIZAR TROCA (Troca a posse dos itens) 
// ==========================================================
// Rota: /trocas/finalizar/:trocaId
router.post("/finalizar/:trocaId", async (req, res) => {
    const receptorId = req.session.userId; 
    const { trocaId } = req.params;
    
    // Inicia a transação CRÍTICA
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

        // 2. Validação de Segurança (Receptor e Status Aceita)
        if (!troca || troca.ReceptorId !== receptorId || troca.status !== 'Aceita') {
            await t.rollback();
            return res.redirect("/trocas/recebidas");
        }

        // 3. Transferência de Posse e marca como Histórico
        // Item Desejado (do Receptor) vai para o Proponente
        await Item.update(
            { UsuarioId: troca.ProponenteId, statusPosse: 'Historico' }, 
            { where: { id: troca.ItemDesejadoId }, transaction: t }
        );
        
        // Item Oferecido (do Proponente) vai para o Receptor
        await Item.update(
            { UsuarioId: troca.ReceptorId, statusPosse: 'Historico' }, 
            { where: { id: troca.ItemOferecidoId }, transaction: t }
        );

        // 4. Atualiza o status da Troca
        await troca.update({ status: 'Finalizada', dataFinalizacao: new Date() }, { transaction: t });

        // 5. Confirma todas as alterações
        await t.commit(); 
        
        res.redirect("/trocas/recebidas");

    } catch (error) {
        await t.rollback(); 
        console.error("ERRO CRÍTICO AO FINALIZAR TROCA (Catch Block):", error);
        res.redirect("/trocas/recebidas");
    }
});

// ==========================================================
// ROTA 10: HISTÓRICO DE TROCAS (FINALIZADAS, CANCELADAS, REJEITADAS)
// ==========================================================
// Rota: /trocas/historico
router.get("/historico", async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const historicoTrocas = await Troca.findAll({
            where: { 
                [Op.or]: [ 
                    { ProponenteId: userId },
                    { ReceptorId: userId }
                ],
                // Apenas status de trocas concluídas (positiva ou negativa)
                status: { [Op.in]: ['Finalizada', 'Cancelada', 'Rejeitada'] } 
            },
            include: [
                { model: Item, as: 'itemOferecido', attributes: ['peca', 'tamanho'] },
                { model: Item, as: 'itemDesejado', attributes: ['peca', 'tamanho'] }
            ],
            // Ordena pelo status final
            order: [['dataFinalizacao', 'DESC'], ['createdAt', 'DESC']] 
        });
        
        res.render('roupas', { // <-- ALTERADO DE 'historicoTrocas' PARA 'roupas'
            title: "Histórico de Trocas",
            historicoTrocas: historicoTrocas, // Renomeei 'historico' para 'historicoTrocas' para manter a consistência com o EJS que enviei
            userId: userId,
            mostrarHistorico: true // <-- ADICIONADO: Flag para o EJS exibir a seção correta
        });

    } catch (error) {
        console.error("ERRO AO CARREGAR HISTÓRICO DE TROCAS:", error);
        res.send("<h1>ERRO!</h1><p>Não foi possível carregar o histórico de trocas.</p>");
    }
});


export default router;