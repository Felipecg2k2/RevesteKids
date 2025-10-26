import { Op } from 'sequelize'; 
import connection from '../config/sequelize-config.js'; 
import Troca from '../models/Troca.js';
import Item from '../models/Item.js'; 
import Usuario from '../models/Usuario.js';
import Sequelize from 'sequelize'; 
import { validationResult } from 'express-validator'; 
// ==========================================================
// FUNÇÕES AUXILIARES DE BUSCA (Lógica de Negócio)
// ==========================================================
// FUNÇÃO: Busca propostas ENVIADAS (Status: Pendente, Aceita, etc.)
export async function buscarPropostasEnviadas(proponenteId) {
    try {
        const propostas = await Troca.findAll({
            where: { 
                ProponenteId: proponenteId,
                status: { [Op.in]: ['Pendente', 'Aceita'] } 
            },
            include: [
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    attributes: ['peca', 'tamanho'], 
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                },
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    attributes: ['peca', 'tamanho'], 
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        return propostas;
    } catch (error) {
        console.error("ERRO AO BUSCAR PROPOSTAS ENVIADAS:", error.message);
        return [];
    }
}
// FUNÇÃO: Busca propostas RECEBIDAS (Status: Pendente, Aceita)
export async function buscarPropostasRecebidas(receptorId) {
    try {
        const propostas = await Troca.findAll({
            where: { 
                ReceptorId: receptorId,
                status: { [Op.in]: ['Pendente', 'Aceita'] } 
            },
            include: [
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    attributes: ['peca', 'tamanho'], 
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                },
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    attributes: ['peca', 'tamanho'], 
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
export async function buscarHistoricoTrocas(userId) {
    try {
        const historico = await Troca.findAll({
            where: {
                [Op.or]: [{ ProponenteId: userId }, { ReceptorId: userId }],
                status: { [Op.in]: ['Finalizada', 'Cancelada', 'Rejeitada', 'Conflito'] }
            },
            include: [
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    attributes: ['peca', 'tamanho'], 
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome'] }] 
                },
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    attributes: ['peca', 'tamanho'], 
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome'] }] 
                }
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
export async function contarTrocasRealizadas(userId) {
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
// FUNÇÕES DO CONTROLLER (Mapeamento das Rotas)
// ==========================================================
// GET /trocas - ROTA PRINCIPAL: GERENCIAMENTO DE TROCAS
export const gerenciarTrocas = async (req, res) => {
    try {
        const userId = req.session.userId;
        const messages = req.flash ? req.flash() : {}; 
        // Executa as buscas de dados em paralelo para maior eficiência
        const [propostasRecebidas, propostasEnviadas, historicoTrocas] = await Promise.all([
            buscarPropostasRecebidas(userId),
            buscarPropostasEnviadas(userId),
            buscarHistoricoTrocas(userId)
        ]);
        res.render('trocas', {
            title: "Gerenciamento de Trocas",
            userId: parseInt(userId, 10), 
            propostasRecebidas: propostasRecebidas,
            propostasEnviadas: propostasEnviadas,
            historicoTrocas: historicoTrocas,
            messages: messages 
        });
    } catch (error) {
        console.error("ERRO AO CARREGAR GERENCIAMENTO DE TROCAS:", error);
        res.status(500).render('trocas', {
            title: "Gerenciamento de Trocas (Erro)",
            userId: parseInt(req.session.userId, 10),
            propostasRecebidas: [],
            propostasEnviadas: [],
            historicoTrocas: [],
            messages: { error: ['Não foi possível carregar o gerenciamento de trocas devido a um erro interno.'] }
        });
    }
};
// GET /trocas/catalogo - CATÁLOGO DE ITENS (FEED)
export const exibirFeed = async (req, res) => {
    try {
        const userId = req.session.userId; 
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
        const messages = req.flash ? req.flash() : {}; 
        res.render('feed', { 
            title: "Catálogo de Peças",
            itens: itensCatalogo,
            messages: messages 
        });
    } catch (error) {
        console.error("ERRO AO CARREGAR CATÁLOGO:", error);
        res.render('feed', { title: "Catálogo de Peças", itens: [], messages: { error: ['Erro ao carregar o feed.'] } });
    }
};
// GET /trocas/propor/:itemIdDesejado - FORMULÁRIO DE PROPOSTA (CREATE VIEW)
export const exibirFormularioProposta = async (req, res) => {
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
            if (req.flash) req.flash('error', 'Item inválido, não disponível ou é seu.');
            return res.redirect('/trocas/catalogo'); 
        }
        const messages = req.flash ? req.flash() : {}; 
        res.render('proporTroca', {
            title: "Propor Troca",
            itemDesejado: itemDesejado.get({ plain: true }), 
            meusItens: meusItens,
            messages: messages
        });
    } catch (error) {
        console.error("ERRO AO CARREGAR FORMULÁRIO DE PROPOSTA:", error);
        if (req.flash) req.flash('error', 'Não foi possível carregar o formulário de proposta.');
        res.redirect('/trocas/catalogo'); 
    }
};
// POST /trocas/propor - ENVIAR PROPOSTA (CREATE ACTION)
export const enviarProposta = async (req, res) => {
    const proponenteId = req.session.userId;
    const { itemIdDesejado, itemOferecido } = req.body; 
    if (!itemIdDesejado || !itemOferecido) {
        if (req.flash) req.flash('error', 'Selecione ambos os itens para a proposta.');
        const redirectUrl = itemIdDesejado ? `/trocas/propor/${itemIdDesejado}` : '/trocas/catalogo';
        return res.redirect(redirectUrl);
    }
    const t = await connection.transaction(); 
    console.log(`[PROPOR] Iniciando transação para ProponenteId: ${proponenteId}, Desejado: ${itemIdDesejado}, Oferecido: ${itemOferecido}`); 
    try {
        const itemDesejadoData = await Item.findByPk(itemIdDesejado, { transaction: t });
        const itemOferecidoData = await Item.findByPk(itemOferecido, { transaction: t });
        // Validação de segurança e status
        if (!itemDesejadoData || itemDesejadoData.statusPosse !== 'Ativo' || itemDesejadoData.UsuarioId == proponenteId) {
             await t.rollback(); 
             console.error(`[PROPOR ERRO] Item Desejado (${itemIdDesejado}) inválido.`);
             if (req.flash) req.flash('error', 'O item desejado não está mais disponível ou pertence a você.');
             return res.redirect('/trocas/catalogo');
        }
        if (!itemOferecidoData || itemOferecidoData.statusPosse !== 'Ativo' || itemOferecidoData.UsuarioId != proponenteId) {
             await t.rollback(); 
             console.error(`[PROPOR ERRO] Item Oferecido (${itemOferecido}) inválido.`);
             if (req.flash) req.flash('error', 'O item oferecido não está mais disponível para troca.');
             return res.redirect('/trocas/catalogo');
        }
        const receptorId = itemDesejadoData.UsuarioId;
        // Cria a Troca
        await Troca.create({
            ProponenteId: parseInt(proponenteId, 10), 
            ReceptorId: receptorId,
            ItemOferecidoId: itemOferecido,
            ItemDesejadoId: itemIdDesejado,
            status: 'Pendente' 
        }, { transaction: t });
        console.log(`[PROPOR SUCESSO] Troca criada.`);
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
        console.log(`[PROPOR SUCESSO] Status dos itens alterado para 'EmTroca'.`);
        await t.commit(); 
        console.log(`[PROPOR SUCESSO] Transação concluída (commit).`);
        if (req.flash) req.flash('success', 'Proposta de troca enviada com sucesso!');
        res.redirect('/trocas'); 
    } catch (error) {
        await t.rollback(); 
        console.error("ERRO CRÍTICO AO ENVIAR PROPOSTA E ATUALIZAR STATUS:", error);
        if (req.flash) req.flash('error', 'Erro interno ao enviar a proposta.');
        res.redirect('/trocas'); 
    }
};
// POST /trocas/aceitar/:trocaId - ACEITAR PROPOSTA
export const aceitarProposta = async (req, res) => {
    try {
        const { trocaId } = req.params;
        const receptorId = parseInt(req.session.userId, 10); 
        const troca = await Troca.findByPk(trocaId, {
            include: [{ model: Item, as: 'itemDesejado' }] 
        });
        if (!troca || troca.itemDesejado.UsuarioId !== receptorId || troca.status !== 'Pendente') { 
            if (req.flash) req.flash('error', 'Proposta inválida, você não é o receptor ou o status não é Pendente.');
            return res.redirect("/trocas"); 
        }
        await troca.update({ 
            status: 'Aceita', 
            dataAceite: new Date()
        });
        if (req.flash) req.flash('success', 'Proposta aceita com sucesso! Aguarde o contato para a finalização.');
        res.redirect("/trocas"); 
    } catch (error) {
        console.error("ERRO AO ACEITAR PROPOSTA:", error);
        if (req.flash) req.flash('error', 'Erro interno ao aceitar a proposta.');
        res.redirect("/trocas");
    }
};
// POST /trocas/rejeitar/:trocaId - REJEITAR PROPOSTA
export const rejeitarProposta = async (req, res) => {
    const t = await connection.transaction(); 
    try {
        const { trocaId } = req.params;
        const receptorId = parseInt(req.session.userId, 10); 
        const troca = await Troca.findByPk(trocaId, {
            include: [{ model: Item, as: 'itemDesejado' }],
            transaction: t 
        });
        if (!troca || troca.itemDesejado.UsuarioId !== receptorId || troca.status !== 'Pendente') {
            await t.rollback();
            if (req.flash) req.flash('error', 'Proposta inválida, você não é o receptor ou o status não é Pendente.');
            return res.redirect("/trocas"); 
        }
        await troca.update({ status: 'Rejeitada' }, { transaction: t });
        // Volta o status dos DOIS itens para 'Ativo'
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
        if (req.flash) req.flash('warning', 'Proposta rejeitada. Os itens envolvidos voltaram a ser ativos no catálogo.');
        res.redirect("/trocas"); 
    } catch (error) {
        await t.rollback();
        console.error("ERRO AO REJEITAR PROPOSTA:", error);
        if (req.flash) req.flash('error', 'Erro interno ao rejeitar a proposta.');
        res.redirect("/trocas");
    }
};
// POST /trocas/cancelar/:trocaId - CANCELAR PROPOSTA
export const cancelarProposta = async (req, res) => {
    const t = await connection.transaction(); 
    try {
        const { trocaId } = req.params;
        const proponenteId = parseInt(req.session.userId, 10); 
        const troca = await Troca.findByPk(trocaId, { transaction: t });
        if (!troca || troca.ProponenteId !== proponenteId || troca.status !== 'Pendente') {
            await t.rollback();
            if (req.flash) req.flash('error', 'Não é possível cancelar. A proposta não é sua ou o status não é Pendente.');
            return res.redirect("/trocas"); 
        }
        await troca.update({ status: 'Cancelada' }, { transaction: t });
        // Volta o status dos DOIS itens para 'Ativo'
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
        if (req.flash) req.flash('warning', 'Proposta cancelada com sucesso. Os itens voltaram a ser ativos no catálogo.');
        res.redirect("/trocas"); 
    } catch (error) {
        await t.rollback();
        console.error("ERRO AO CANCELAR PROPOSTA:", error);
        if (req.flash) req.flash('error', 'Erro interno ao cancelar a proposta.');
        res.redirect("/trocas");
    }
};
// POST /trocas/finalizar/:trocaId - FINALIZAR TROCA
export const finalizarTroca = async (req, res) => {
    const { trocaId } = req.params;
    const userIdNumber = parseInt(req.session.userId, 10); 
    const t = await connection.transaction();
    try {
        const troca = await Troca.findByPk(trocaId, { transaction: t });
        if (!troca || troca.status !== 'Aceita') {
            await t.rollback(); 
            if (req.flash) req.flash('error', 'A troca não está mais no status Aceita.');
            return res.redirect('/trocas');
        }
        const isProponente = troca.ProponenteId === userIdNumber;
        const isReceptor = troca.ReceptorId === userIdNumber;
        if (!isProponente && !isReceptor) {
            await t.rollback(); 
            if (req.flash) req.flash('error', 'Você não está envolvido nesta troca.');
            return res.redirect('/trocas'); 
        }
        let message = 'Você confirmou o recebimento! Aguardando confirmação do outro usuário.';
        let updated = false;
        if (isProponente && !troca.proponenteConfirmouFinalizacao) {
            troca.proponenteConfirmouFinalizacao = true;
            updated = true;
        } else if (isReceptor && !troca.receptorConfirmouFinalizacao) {
            troca.receptorConfirmouFinalizacao = true;
            updated = true;
        } else if (updated === false) {
             message = 'Sua confirmação já foi registrada.';
        }
        if (troca.proponenteConfirmouFinalizacao && troca.receptorConfirmouFinalizacao) {
            troca.status = 'Finalizada';
            troca.dataFinalizacao = Sequelize.literal('NOW()');
            const { ProponenteId, ReceptorId, ItemOferecidoId, ItemDesejadoId } = troca;
            // Item Oferecido (vai para o Receptor)
            await Item.update({
                UsuarioId: ReceptorId, 
                statusPosse: 'Historico' 
            }, { 
                where: { id: ItemOferecidoId },
                transaction: t 
            });
            // Item Desejado (vai para o Proponente)
            await Item.update({
                UsuarioId: ProponenteId, 
                statusPosse: 'Historico' 
            }, { 
                where: { id: ItemDesejadoId },
                transaction: t 
            });
            console.log(`Troca ID ${trocaId} FINALIZADA com sucesso por ambos!`);
            req.flash('success', 'Troca finalizada com sucesso! Os itens foram transferidos para o Histórico.');
        } else if (updated) {
            req.flash('success', message);
        } else {
             req.flash('info', message); 
        }
        await troca.save({ transaction: t });
        await t.commit(); 
        res.redirect('/trocas');
    } catch (error) {
        await t.rollback(); 
        console.error("ERRO CRÍTICO AO FINALIZAR/CONFIRMAR TROCA:", error);
        req.flash('error', 'Ocorreu um erro ao tentar finalizar a troca.');
        res.redirect('/trocas'); 
    }
};
// GET /trocas/detalhes/:trocaId - API para Conteúdo do Modal de Detalhes
export const detalhesTroca = async (req, res) => {
    try {
        const userId = req.session.userId;
        const userIdNumber = parseInt(userId, 10);
        const { trocaId } = req.params;
        const troca = await Troca.findByPk(trocaId, {
            include: [
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    attributes: ['id', 'peca', 'tamanho', 'descricao', 'UsuarioId'],
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                },
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    attributes: ['id', 'peca', 'tamanho', 'descricao', 'UsuarioId'],
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                }
            ]
        });
        if (!troca || (troca.ProponenteId !== userIdNumber && troca.ReceptorId !== userIdNumber)) {
            return res.status(404).send("<p>Troca não encontrada ou você não tem acesso.</p>");
        }
        res.render('partials/troca_modal_content', {
            troca: troca.get({ plain: true }), 
            userId: userIdNumber,
            layout: false 
        });
    } catch (error) {
        console.error("ERRO AO CARREGAR DETALHES DO MODAL:", error);
        res.status(500).send("Erro ao carregar os detalhes.");
    }
};
