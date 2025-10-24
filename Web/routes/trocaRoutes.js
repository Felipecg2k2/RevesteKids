// routes/trocaRoutes.js - CÓDIGO FINAL CORRIGIDO E ROBUSTO

import express from 'express';
// Importamos o Op diretamente para uso em cláusulas 'where'.
import { Op } from 'sequelize'; 
import connection from '../config/sequelize-config.js'; 
import Troca from '../models/Troca.js';
import Item from '../models/Item.js'; 
import Usuario from '../models/Usuario.js';
// Mantido o import de Sequelize
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
// FUNÇÕES AUXILIARES DE TROCA
// ==========================================================

// FUNÇÃO: Conta trocas finalizadas
async function contarTrocasRealizadas(userId) {
    try {
        const count = await Troca.count({
            where: {
                [Op.or]: [
                    { ProponenteId: userId },
                    { ReceptorId: userId }
                ],
                status: 'Finalizada' 
            }
        });
        return count;
    } catch (error) {
        console.error("ERRO CRÍTICO EM contarTrocasRealizadas:", error.message);
        return 0; 
    }
}

// FUNÇÃO: Busca histórico
async function buscarHistoricoTrocas(userId) {
    try {
        const historico = await Troca.findAll({
            where: {
                [Op.or]: [{ ProponenteId: userId }, { ReceptorId: userId }],
                status: { [Op.in]: ['Finalizada', 'Cancelada', 'Rejeitada', 'Conflito'] }
            },
            include: [
                { model: Item, as: 'itemOferecido', attributes: ['peca', 'tamanho'] },
                { model: Item, as: 'itemDesejado', attributes: ['peca', 'tamanho'] }
            ],
            order: [['dataFinalizacao', 'DESC'], ['createdAt', 'DESC']] 
        });
        return historico;
    } catch (error) {
        console.error("ERRO AO BUSCAR HISTÓRICO NA ROTA DE TROCA:", error.message);
        return []; 
    }
}


// ==========================================================
// ROTA 1: CATÁLOGO DE ITENS (FEED)
// ==========================================================
router.get("/catalogo", async (req, res) => {
    try {
        const userId = req.session.userId; 

        // ESTA É A LÓGICA MAIS LIMPA E CORRETA
        const itensCatalogo = await Item.findAll({
            where: { 
                // 1. Não mostra o item do próprio usuário
                UsuarioId: { [Op.ne]: userId }, 
                // 2. Só mostra itens que estão livres para troca.
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
router.get("/propor/:itemIdDesejado", async (req, res) => {
    try {
        const userId = req.session.userId;
        const itemIdDesejado = req.params.itemIdDesejado;


        const itemDesejado = await Item.findByPk(itemIdDesejado, {
            include: [{ model: Usuario, as: 'usuario', attributes: ['nome'] }] 
        });
        

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
// Status dos Itens: De 'Ativo' para 'EmTroca'
// ==========================================================
router.post("/propor", async (req, res) => {
    const proponenteId = req.session.userId;
    const { itemIdDesejado, itemOferecido } = req.body; 


    // 1. Inicia a transação
    const t = await connection.transaction(); 

    try {
        const itemDesejadoData = await Item.findByPk(itemIdDesejado, { transaction: t });

        if (!itemDesejadoData || itemDesejadoData.statusPosse !== 'Ativo') {
            await t.rollback(); 

            return res.redirect('/catalogo');
        }

        const receptorId = itemDesejadoData.UsuarioId;

        await Troca.create({
            ProponenteId: proponenteId,
            ReceptorId: receptorId,
            ItemOferecidoId: itemOferecido,
            ItemDesejadoId: itemIdDesejado,
            status: 'Pendente' 

        }, { transaction: t });

        // ATUALIZA O STATUS DOS ITENS PARA 'EmTroca'
        await Item.update({ 
            statusPosse: 'EmTroca' 
        }, { 
            where: { 
                [Op.or]: [
                    { id: itemOferecido }, 
                    { id: itemIdDesejado } 
                ] 
            },
            transaction: t 
        });

        await t.commit(); 
        
        res.redirect('/trocas/enviadas');

    } catch (error) {
        await t.rollback(); 
        console.error("ERRO CRÍTICO AO ENVIAR PROPOSTA E ATUALIZAR STATUS:", error);
        // Tenta manter a navegação, mas o usuário deve saber que houve falha

        res.redirect('/trocas/enviadas'); 
    }
});

// ==========================================================
// ROTA 4: MINHAS PROPOSTAS ENVIADAS (READ ALL do Proponente)
// ==========================================================
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
router.get("/recebidas", async (req, res) => {
    try {
        const receptorId = req.session.userId;

        const propostas = await Troca.findAll({
            where: { 
                ReceptorId: receptorId,
                status: 'Pendente' 
            },

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
// Status dos Itens: Permanece 'EmTroca'
// ==========================================================
router.post("/aceitar/:trocaId", async (req, res) => {
    try {
        const { trocaId } = req.params;
        const receptorId = req.session.userId;

        const troca = await Troca.findByPk(trocaId, {
            // Buscamos o item desejado para verificar a posse
            include: [{ model: Item, as: 'itemDesejado' }] 
        });

        if (!troca || troca.itemDesejado.UsuarioId !== receptorId) { 
            return res.redirect("/trocas/recebidas");
        }

        if (troca.status !== 'Pendente') {
            return res.redirect("/trocas/recebidas");
        }

        await troca.update({ 
            status: 'Aceita', 
            dataAceite: new Date()
        });

        // NOTA: O status do item já foi alterado para 'EmTroca' na Rota 3.
        // Mantemos 'EmTroca' até a finalização/rejeição/cancelamento.

        res.redirect("/trocas/recebidas");

    } catch (error) {
        console.error("ERRO AO ACEITAR PROPOSTA:", error);
        res.redirect("/trocas/recebidas");
    }
});

// ==========================================================
// ROTA 7: REJEITAR PROPOSTA (UPDATE de Status)
// Status dos Itens: De 'EmTroca' para 'Ativo'
// ==========================================================
router.post("/rejeitar/:trocaId", async (req, res) => {
    const t = await connection.transaction(); 

    try {
        const { trocaId } = req.params;
        const receptorId = req.session.userId;

        const troca = await Troca.findByPk(trocaId, {
            include: [{ model: Item, as: 'itemDesejado' }],
            transaction: t 
        });

        if (!troca || troca.itemDesejado.UsuarioId !== receptorId || troca.status !== 'Pendente') {
            await t.rollback();
            return res.redirect("/trocas/recebidas");
        }

        await troca.update({ status: 'Rejeitada' }, { transaction: t });

        // CORREÇÃO: Volta o status dos DOIS itens para 'Ativo'
        await Item.update(
            { statusPosse: 'Ativo' },
            { 
                where: { 
                    [Op.or]: [
                        { id: troca.ItemDesejadoId }, 
                        { id: troca.ItemOferecidoId } 
                    ] 
                }, 
                transaction: t 
            }
        );

        await t.commit();
        res.redirect("/trocas/recebidas");

    } catch (error) {
        await t.rollback();
        console.error("ERRO AO REJEITAR PROPOSTA:", error);
        res.redirect("/trocas/recebidas");
    }
});

// ==========================================================
// ROTA 8: CANCELAR PROPOSTA (UPDATE do Proponente)
// Status dos Itens: De 'EmTroca' para 'Ativo'
// ==========================================================
router.post("/cancelar/:trocaId", async (req, res) => {
    const t = await connection.transaction(); 

    try {
        const { trocaId } = req.params;
        const proponenteId = req.session.userId;

        const troca = await Troca.findByPk(trocaId, { transaction: t });

        if (!troca || troca.ProponenteId !== proponenteId || troca.status !== 'Pendente') {
            await t.rollback();
            return res.redirect("/trocas/enviadas");
        }
        
        await troca.update({ status: 'Cancelada' }, { transaction: t });
        
        // CORREÇÃO: Volta o status dos DOIS itens para 'Ativo'
        await Item.update(
            { statusPosse: 'Ativo' },
            { 
                where: { 
                    [Op.or]: [
                        { id: troca.ItemDesejadoId }, 
                        { id: troca.ItemOferecidoId } 
                    ] 
                }, 
                transaction: t 
            }
        );
        
        await t.commit();
        res.redirect("/trocas/enviadas");

    } catch (error) {
        await t.rollback();
        console.error("ERRO AO CANCELAR PROPOSTA:", error);
        res.redirect("/trocas/enviadas");

    }
});


// ==========================================================
// ROTA 9: FINALIZAR TROCA - LÓGICA DE POSSE E STATUS FINALIZADA
// Status dos Itens: De 'EmTroca' para 'Historico' (com inversão de posse)
// ==========================================================
router.post("/finalizar/:trocaId", async (req, res) => {
    const { trocaId } = req.params;
    const userId = req.session.userId;

    // 1. Inicia a transação
    const t = await connection.transaction();

    try {
        // Busca a troca (com a transação)
        const troca = await Troca.findByPk(trocaId, { transaction: t });

        // CORREÇÃO: Converte o userId da sessão (geralmente string) para number (int) 
        // para garantir a comparação estrita com o ID do banco de dados.
        const userIdNumber = parseInt(userId, 10);

        // 2. Validação Crítica: Apenas o Receptor pode finalizar uma troca 'Aceita'
        // Usa o operador de comparação estrita (!==) e o ID convertido.
        if (!troca || troca.status !== 'Aceita' || troca.ReceptorId !== userIdNumber) {
            await t.rollback(); 
            // Mensagem de warning mais detalhada para debug
            console.warn(`Tentativa de finalizar troca inválida. ID: ${trocaId}, Status: ${troca ? troca.status : 'N/A'}. Usuário logado: ${userId}.`);
            return res.redirect('/trocas/recebidas');
        }

        const { ProponenteId, ReceptorId, ItemOferecidoId, ItemDesejadoId } = troca;

        // --- ATUALIZAÇÃO DO ITEM 1 (Item Oferecido pelo Proponente) ---
        // Este item vai para o Receptor
        await Item.update({
            UsuarioId: ReceptorId, 
            statusPosse: 'Historico' 
        }, { 
            where: { id: ItemOferecidoId },
            transaction: t 
        });
        

        // --- ATUALIZAÇÃO DO ITEM 2 (Item Desejado pelo Proponente) ---
        // Este item vai para o Proponente
        await Item.update({
            UsuarioId: ProponenteId, 
            statusPosse: 'Historico' 
        }, { 
            where: { id: ItemDesejadoId },
            transaction: t 
        });

        // 5. Atualiza o status da troca para Finalizada e registra a data
        await troca.update({
            status: 'Finalizada',
            dataFinalizacao: Sequelize.literal('NOW()') 
        }, { transaction: t });
        
        // 6. Confirma todas as alterações no banco de dados
        await t.commit(); 
        console.log(`Troca ID ${trocaId} finalizada com sucesso!`);

        res.redirect('/roupas?status=Historico'); // Redireciona para o histórico de trocas

    } catch (error) {
        // 7. Desfaz tudo em caso de erro
        await t.rollback(); 
        console.error("ERRO CRÍTICO AO FINALIZAR TROCA (Catch Block):", error);
        res.redirect('/trocas/recebidas'); 
    }
});

// ==========================================================
// ROTA 10: HISTÓRICO DE TROCAS (Removida a rota, pois agora é integrada no itemRoutes.js)
// NOTA: Esta rota está duplicada em itemRoutes.js. 
// Deixaremos a responsabilidade de visualização do Histórico/Gerenciamento para itemRoutes.js.
// ==========================================================
router.get("/historico", async (req, res) => {
    // Redireciona para o itemRoutes.js para evitar duplicação de lógica de view.
    return res.redirect('/roupas?status=Historico');
});


// ==========================================================
// EXPORTAÇÕES DE MÓDULO:
// ==========================================================

// 1. Exportação principal do router (para ser usado no index.js)
export default router;

// 2. Exportação das funções auxiliares (para o itemRoutes.js usar)
export { contarTrocasRealizadas, buscarHistoricoTrocas };