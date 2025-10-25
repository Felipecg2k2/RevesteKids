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
import { get } from 'http';

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

// FUNÇÃO: Busca propostas ENVIADAS (Status: Pendente, Aceita, etc.)
async function buscarPropostasEnviadas(proponenteId) {
    try {
        const propostas = await Troca.findAll({
            where: { 
                ProponenteId: proponenteId,
                // Status ATIVOS (que o proponente espera uma resposta/continuação)
                status: { [Op.in]: ['Pendente', 'Aceita'] } 
            },
            include: [
                { model: Item, as: 'itemOferecido', attributes: ['peca', 'tamanho'] },
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    attributes: ['peca', 'tamanho'],
                    // Inclui o usuário que receberá a proposta para exibição
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        // NOTA: 'Rejeitada' e 'Cancelada' estarão no Histórico.
        return propostas;
    } catch (error) {
        console.error("ERRO AO BUSCAR PROPOSTAS ENVIADAS:", error.message);
        return [];
    }
}

// FUNÇÃO: Busca propostas RECEBIDAS (Status: Pendente, Aceita)
async function buscarPropostasRecebidas(receptorId) {
    try {
        const propostas = await Troca.findAll({
            where: { 
                ReceptorId: receptorId,
                // Propostas ATIVAS que precisam de ação do receptor (Aceitar/Rejeitar)
                status: { [Op.in]: ['Pendente', 'Aceita'] } 
            },
            include: [
                { model: Item, as: 'itemDesejado', attributes: ['peca', 'tamanho'] },
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    attributes: ['peca', 'tamanho'],
                    // Inclui o usuário que enviou a proposta
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade', 'estado'] }],
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        return propostas;
    } catch (error) {
        console.error("ERRO AO BUSCAR PROPOSTAS RECEBIDAS:", error.message);
        return [];
    }
}


// FUNÇÃO: Busca histórico (Finalizada, Cancelada, Rejeitada, Conflito)
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

// FUNÇÃO: Conta trocas finalizadas (mantida para uso externo)
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


// ==========================================================
// ROTA PRINCIPAL: GERENCIAMENTO DE TROCAS (NOVA ROTA)
// Corresponde ao /status-trocas do seu menu e ao trocas.ejs
// ==========================================================
router.get("/", async (req, res) => {
    try {
        const userId = req.session.userId;

        // Executa as buscas de dados em paralelo para maior eficiência
        const [propostasRecebidas, propostasEnviadas, historicoTrocas] = await Promise.all([
            buscarPropostasRecebidas(userId),
            buscarPropostasEnviadas(userId),
            buscarHistoricoTrocas(userId)
        ]);
        
        // Renderiza a nova view de gerenciamento (trocas.ejs)
        res.render('trocas', {
            title: "Gerenciamento de Trocas",
            propostasRecebidas: propostasRecebidas,
            propostasEnviadas: propostasEnviadas,
            historicoTrocas: historicoTrocas
        });

    } catch (error) {
        console.error("ERRO AO CARREGAR GERENCIAMENTO DE TROCAS:", error);
        res.status(500).send("<h1>Erro!</h1><p>Não foi possível carregar o gerenciamento de trocas.</p>");
    }
});


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
        
        res.redirect('/trocas'); // Redireciona para o novo painel de gerenciamento

    } catch (error) {
        await t.rollback(); 
        console.error("ERRO CRÍTICO AO ENVIAR PROPOSTA E ATUALIZAR STATUS:", error);
        // Tenta manter a navegação, mas o usuário deve saber que houve falha

        res.redirect('/trocas'); // Redireciona para o novo painel de gerenciamento
    }
});

// ==========================================================
// ROTA 4: MINHAS PROPOSTAS ENVIADAS (READ ALL do Proponente)
// AGORA É UM REDIRECT PARA A ROTA PRINCIPAL
// ==========================================================
router.get("/enviadas", (req, res) => {
    // Apenas redireciona para a rota principal, que cuida de carregar todos os dados
    res.redirect('/trocas'); 
});

// ==========================================================
// ROTA 5: MINHAS PROPOSTAS RECEBIDAS (READ do Receptor)
// AGORA É UM REDIRECT PARA A ROTA PRINCIPAL
// ==========================================================
router.get("/recebidas", (req, res) => {
    // Apenas redireciona para a rota principal, que cuida de carregar todos os dados
    res.redirect('/trocas'); 
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

        if (!troca || troca.itemDesejado.UsuarioId !== parseInt(receptorId) || troca.status !== 'Pendente') { 
            return res.redirect("/trocas"); // Redireciona para o painel principal
        }

        await troca.update({ 
            status: 'Aceita', 
            dataAceite: new Date()
        });

        res.redirect("/trocas"); // Redireciona para o painel principal

    } catch (error) {
        console.error("ERRO AO ACEITAR PROPOSTA:", error);
        res.redirect("/trocas");
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

        if (!troca || troca.itemDesejado.UsuarioId !== parseInt(receptorId) || troca.status !== 'Pendente') {
            await t.rollback();
            return res.redirect("/trocas"); // Redireciona para o painel principal
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
        res.redirect("/trocas"); // Redireciona para o painel principal

    } catch (error) {
        await t.rollback();
        console.error("ERRO AO REJEITAR PROPOSTA:", error);
        res.redirect("/trocas");
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

        if (!troca || troca.ProponenteId !== parseInt(proponenteId) || troca.status !== 'Pendente') {
            await t.rollback();
            return res.redirect("/trocas"); // Redireciona para o painel principal
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
        res.redirect("/trocas"); // Redireciona para o painel principal

    } catch (error) {
        await t.rollback();
        console.error("ERRO AO CANCELAR PROPOSTA:", error);
        res.redirect("/trocas");

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

        // Converte o userId da sessão (geralmente string) para number (int) 
        const userIdNumber = parseInt(userId, 10);

        // 2. Validação Crítica: Apenas o Receptor pode finalizar uma troca 'Aceita'
        if (!troca || troca.status !== 'Aceita' || troca.ReceptorId !== userIdNumber) {
            await t.rollback(); 
            console.warn(`Tentativa de finalizar troca inválida. ID: ${trocaId}, Status: ${troca ? troca.status : 'N/A'}. Usuário logado: ${userId}.`);
            return res.redirect('/trocas'); // Redireciona para o painel principal
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

        res.redirect('/trocas'); // Redireciona para o painel principal

    } catch (error) {
        // 7. Desfaz tudo em caso de erro
        await t.rollback(); 
        console.error("ERRO CRÍTICO AO FINALIZAR TROCA (Catch Block):", error);
        res.redirect('/trocas'); // Redireciona para o painel principal
    }
});

// ==========================================================
// ROTA 10: HISTÓRICO DE TROCAS (Redirecionamento)
// ==========================================================
router.get("/historico", async (req, res) => {
    // Redireciona para a rota principal de gerenciamento, que tem a aba de Histórico.
    return res.redirect('/trocas');
});


// ==========================================================
// EXPORTAÇÕES DE MÓDULO:
// ==========================================================

// 1. Exportação principal do router (para ser usado no index.js)
export default router;

// 2. Exportação das funções auxiliares (para o itemRoutes.js usar)
export { contarTrocasRealizadas, buscarHistoricoTrocas };