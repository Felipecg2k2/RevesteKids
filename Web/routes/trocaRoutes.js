// routes/trocaRoutes.js - CÓDIGO FINAL CORRIGIDO E ROBUSTO (SEM REFERÊNCIA À FOTO NO BANCO)

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
        // Redireciona para /login se o usuário não estiver logado, com mensagem flash se disponível
        if (req.flash) req.flash('error', 'Você precisa estar logado para acessar esta página.');
        return res.redirect('/login');
    }
    next();
}

router.use(requireLogin); 


// ==========================================================
// FUNÇÕES AUXILIARES DE TROCA (EXPORTADAS PARA itemRoutes.js)
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
                // Item que você ofereceu
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    // ✅ CORREÇÃO: Removido campo de foto
                    attributes: ['peca', 'tamanho'], 
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                },
                // Item que você deseja (Pertence ao RECEPTOR)
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    // ✅ CORREÇÃO: Removido campo de foto
                    attributes: ['peca', 'tamanho'], 
                    // Inclui o usuário DENTRO do Item Desejado (o Receptor)
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
async function buscarPropostasRecebidas(receptorId) {
    try {
        const propostas = await Troca.findAll({
            where: { 
                ReceptorId: receptorId,
                // Propostas ATIVAS que precisam de ação do receptor (Aceitar/Rejeitar/Finalizar)
                status: { [Op.in]: ['Pendente', 'Aceita'] } 
            },
            include: [
                // Item que você (Receptor) deseja
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    // ✅ CORREÇÃO: Removido campo de foto
                    attributes: ['peca', 'tamanho'], 
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                },
                // Item que o outro usuário (Proponente) oferece
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    // ✅ CORREÇÃO: Removido campo de foto
                    attributes: ['peca', 'tamanho'], 
                    // Inclui o usuário DENTRO do Item Oferecido (o Proponente)
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
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    // ✅ CORREÇÃO: Removido campo de foto
                    attributes: ['peca', 'tamanho'], 
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome'] }] 
                },
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    // ✅ CORREÇÃO: Removido campo de foto
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
// ==========================================================
router.get("/", async (req, res) => {
    try {
        const userId = req.session.userId;
        const messages = req.flash ? req.flash() : {}; // Obtém as mensagens flash
        
        // Executa as buscas de dados em paralelo para maior eficiência
        const [propostasRecebidas, propostasEnviadas, historicoTrocas] = await Promise.all([
            buscarPropostasRecebidas(userId),
            buscarPropostasEnviadas(userId),
            buscarHistoricoTrocas(userId)
        ]);
        
        // Renderiza a nova view de gerenciamento (trocas.ejs)
        res.render('trocas', {
            title: "Gerenciamento de Trocas",
            userId: parseInt(userId, 10), // Passa como número para consistência no partial
            propostasRecebidas: propostasRecebidas,
            propostasEnviadas: propostasEnviadas,
            historicoTrocas: historicoTrocas,
            messages: messages // Passa as mensagens para a view
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
});


// ==========================================================
// ROTA 1: CATÁLOGO DE ITENS (FEED)
// ==========================================================
router.get("/catalogo", async (req, res) => {
    try {
        const userId = req.session.userId; 

        const itensCatalogo = await Item.findAll({
            where: { 
                // 1. Não mostra o item do próprio usuário
                UsuarioId: { [Op.ne]: userId }, 
                // 2. Só mostra itens que estão livres para troca.
                statusPosse: 'Ativo' 
            },
            // Você pode precisar adicionar os atributos aqui, como 'peca', 'tamanho' e 'fotoUrl'
            // Se 'fotoUrl' ainda não existe no banco, mantenha assim para não quebrar:
            // attributes: ['id', 'peca', 'tamanho', 'descricao'], 
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
});


// ==========================================================
// ROTA 2: FORMULÁRIO DE PROPOSTA (CREATE VIEW)
// ==========================================================
router.get("/propor/:itemIdDesejado", async (req, res) => {
    try {
        const userId = req.session.userId;
        const itemIdDesejado = req.params.itemIdDesejado;

        // Busca o item desejado com o nome do dono
        const itemDesejado = await Item.findByPk(itemIdDesejado, {
            include: [{ model: Usuario, as: 'usuario', attributes: ['nome'] }] 
        });
        
        // Busca os itens do usuário logado que estão ATIVOS
        const meusItens = await Item.findAll({
            where: { 
                UsuarioId: userId,
                statusPosse: 'Ativo' 
            } 
        });

        // Verificação de segurança
        if (!itemDesejado || itemDesejado.UsuarioId == userId) {
            if (req.flash) req.flash('error', 'Item inválido, não disponível ou é seu.');
            return res.redirect('/trocas/catalogo'); // Caminho completo
        }

        const messages = req.flash ? req.flash() : {}; 

        res.render('proporTroca', {
            title: "Propor Troca",
            itemDesejado: itemDesejado.get({ plain: true }), // Garante objeto simples
            meusItens: meusItens,
            messages: messages
        });

    } catch (error) {
        console.error("ERRO AO CARREGAR FORMULÁRIO DE PROPOSTA:", error);
        if (req.flash) req.flash('error', 'Não foi possível carregar o formulário de proposta.');
        res.redirect('/trocas/catalogo'); // Caminho completo
    }
});

// ==========================================================
// ROTA 3: ENVIAR PROPOSTA (CREATE ACTION)
// Status dos Itens: De 'Ativo' para 'EmTroca'
// ==========================================================
router.post("/propor", async (req, res) => {
    const proponenteId = req.session.userId;
    const { itemIdDesejado, itemOferecido } = req.body; 

    // Validação básica
    if (!itemIdDesejado || !itemOferecido) {
        if (req.flash) req.flash('error', 'Selecione ambos os itens para a proposta.');
        
        const redirectUrl = itemIdDesejado ? `/trocas/propor/${itemIdDesejado}` : '/trocas/catalogo';
        return res.redirect(redirectUrl);
    }

    // 1. Inicia a transação
    const t = await connection.transaction(); 
    // 💡 LOG DE DIAGNÓSTICO
    console.log(`[PROPOR] Iniciando transação para ProponenteId: ${proponenteId}, Desejado: ${itemIdDesejado}, Oferecido: ${itemOferecido}`); 

    try {
        // Busca o item que o proponente DESEJA
        const itemDesejadoData = await Item.findByPk(itemIdDesejado, { transaction: t });
        // Busca o item que o proponente OFERECE (para garantir que ele ainda é dele e está Ativo)
        const itemOferecidoData = await Item.findByPk(itemOferecido, { transaction: t });

        // Validação de segurança e status
        if (!itemDesejadoData || itemDesejadoData.statusPosse !== 'Ativo' || itemDesejadoData.UsuarioId == proponenteId) {
             await t.rollback(); 
             // 💡 LOG DE ERRO MELHORADO
             console.error(`[PROPOR ERRO] Item Desejado (${itemIdDesejado}) inválido. Status: ${itemDesejadoData ? itemDesejadoData.statusPosse : 'N/A'}`);
             if (req.flash) req.flash('error', 'O item desejado não está mais disponível ou pertence a você.');
             return res.redirect('/trocas/catalogo');
        }
        if (!itemOferecidoData || itemOferecidoData.statusPosse !== 'Ativo' || itemOferecidoData.UsuarioId != proponenteId) {
             await t.rollback(); 
             // 💡 LOG DE ERRO MELHORADO
             console.error(`[PROPOR ERRO] Item Oferecido (${itemOferecido}) inválido. Status: ${itemOferecidoData ? itemOferecidoData.statusPosse : 'N/A'}`);
             if (req.flash) req.flash('error', 'O item oferecido não está mais disponível para troca.');
             return res.redirect('/trocas/catalogo');
        }

        const receptorId = itemDesejadoData.UsuarioId;

        // Cria a Troca
        await Troca.create({
            ProponenteId: parseInt(proponenteId, 10), // Garante tipo numérico
            ReceptorId: receptorId,
            ItemOferecidoId: itemOferecido,
            ItemDesejadoId: itemIdDesejado,
            status: 'Pendente' 
        }, { transaction: t });
        // 💡 LOG DE SUCESSO
        console.log(`[PROPOR SUCESSO] Troca criada. ID Desejado/Oferecido: ${itemIdDesejado}/${itemOferecido}`);


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
        // 💡 LOG DE SUCESSO
        console.log(`[PROPOR SUCESSO] Status dos itens alterado para 'EmTroca'.`);


        await t.commit(); 
        // 💡 LOG DE SUCESSO
        console.log(`[PROPOR SUCESSO] Transação concluída (commit).`);
        
        if (req.flash) req.flash('success', 'Proposta de troca enviada com sucesso!');
        res.redirect('/trocas'); // Redireciona para o novo painel de gerenciamento

    } catch (error) {
        await t.rollback(); 
        console.error("ERRO CRÍTICO AO ENVIAR PROPOSTA E ATUALIZAR STATUS:", error);
        if (req.flash) req.flash('error', 'Erro interno ao enviar a proposta.');
        res.redirect('/trocas'); // Redireciona para o novo painel de gerenciamento
    }
});

// Rota para Propostas Enviadas (Redireciona)
router.get("/enviadas", (req, res) => {
    res.redirect('/trocas'); 
});

// Rota para Propostas Recebidas (Redireciona)
router.get("/recebidas", (req, res) => {
    res.redirect('/trocas'); 
});

// ==========================================================
// ROTA 6: ACEITAR PROPOSTA (UPDATE de Status)
// ==========================================================
router.post("/aceitar/:trocaId", async (req, res) => {
    try {
        const { trocaId } = req.params;
        const receptorId = parseInt(req.session.userId, 10); // Conversão

        const troca = await Troca.findByPk(trocaId, {
            // Buscamos o item desejado para verificar a posse
            include: [{ model: Item, as: 'itemDesejado' }] 
        });

        // Verificação de segurança e status
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
});

// ==========================================================
// ROTA 7: REJEITAR PROPOSTA (UPDATE de Status)
// Status dos Itens: De 'EmTroca' para 'Ativo'
// ==========================================================
router.post("/rejeitar/:trocaId", async (req, res) => {
    const t = await connection.transaction(); 

    try {
        const { trocaId } = req.params;
        const receptorId = parseInt(req.session.userId, 10); // Conversão

        const troca = await Troca.findByPk(trocaId, {
            include: [{ model: Item, as: 'itemDesejado' }],
            transaction: t 
        });

        // Verificação de segurança e status
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
});

// ==========================================================
// ROTA 8: CANCELAR PROPOSTA (UPDATE do Proponente)
// Status dos Itens: De 'EmTroca' para 'Ativo'
// ==========================================================
router.post("/cancelar/:trocaId", async (req, res) => {
    const t = await connection.transaction(); 

    try {
        const { trocaId } = req.params;
        const proponenteId = parseInt(req.session.userId, 10); // Conversão

        const troca = await Troca.findByPk(trocaId, { transaction: t });

        // Verificação de segurança e status
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
});


// ==========================================================
// ROTA 9: FINALIZAR TROCA - LÓGICA DE CONFIRMAÇÃO DUPLA E STATUS FINALIZADA
// ==========================================================
router.post("/finalizar/:trocaId", async (req, res) => {
    const { trocaId } = req.params;
    const userIdNumber = parseInt(req.session.userId, 10); // Conversão

    // 1. Inicia a transação
    const t = await connection.transaction();

    try {
        // Busca a troca (com a transação)
        const troca = await Troca.findByPk(trocaId, { transaction: t });

        // 2. Validação: A troca deve estar 'Aceita'
        if (!troca || troca.status !== 'Aceita') {
            await t.rollback(); 
            if (req.flash) req.flash('error', 'A troca não está mais no status Aceita.');
            return res.redirect('/trocas');
        }
        
        // 3. Verifica se o usuário logado é Proponente ou Receptor
        const isProponente = troca.ProponenteId === userIdNumber;
        const isReceptor = troca.ReceptorId === userIdNumber;

        if (!isProponente && !isReceptor) {
            await t.rollback(); 
            if (req.flash) req.flash('error', 'Você não está envolvido nesta troca.');
            return res.redirect('/trocas'); 
        }

        // 4. Marca o flag de confirmação do usuário logado
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
        
        // 5. Verifica se AMBOS confirmaram
        if (troca.proponenteConfirmouFinalizacao && troca.receptorConfirmouFinalizacao) {
            // Se ambos confirmaram, a troca é FINALIZADA
            troca.status = 'Finalizada';
            troca.dataFinalizacao = Sequelize.literal('NOW()');

            // --- INVERSÃO DE POSSE E ATUALIZAÇÃO DO STATUS DO ITEM ---
            const { ProponenteId, ReceptorId, ItemOferecidoId, ItemDesejadoId } = troca;

            // Item Oferecido (vai para o Receptor)
            await Item.update({
                UsuarioId: ReceptorId, 
                statusPosse: 'Historico' // Item sai do catálogo ativo
            }, { 
                where: { id: ItemOferecidoId },
                transaction: t 
            });
            
            // Item Desejado (vai para o Proponente)
            await Item.update({
                UsuarioId: ProponenteId, 
                statusPosse: 'Historico' // Item sai do catálogo ativo
            }, { 
                where: { id: ItemDesejadoId },
                transaction: t 
            });

            console.log(`Troca ID ${trocaId} FINALIZADA com sucesso por ambos!`);
            req.flash('success', 'Troca finalizada com sucesso! Os itens foram transferidos para o Histórico.');
        } else if (updated) {
            // Se apenas um confirmou, dispara a mensagem de aguardando
            req.flash('success', message);
        } else {
             req.flash('info', message); // Se não atualizou, informa que já estava confirmado
        }
        
        // 6. Salva as alterações (o status ou apenas o flag de confirmação)
        await troca.save({ transaction: t });
        
        // 7. Confirma a transação
        await t.commit(); 
        
        // Redireciona
        res.redirect('/trocas');

    } catch (error) {
        // 8. Desfaz tudo em caso de erro
        await t.rollback(); 
        console.error("ERRO CRÍTICO AO FINALIZAR/CONFIRMAR TROCA:", error);
        req.flash('error', 'Ocorreu um erro ao tentar finalizar a troca.');
        res.redirect('/trocas'); 
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
/// ROTA 11 (NOVA): API para Conteúdo do Modal de Detalhes
// Retorna HTML (partial) para ser inserido no modal.
// ==========================================================
router.get("/detalhes/:trocaId", async (req, res) => {
    try {
        const userId = req.session.userId;
        const userIdNumber = parseInt(userId, 10);
        const { trocaId } = req.params;

        const troca = await Troca.findByPk(trocaId, {
            // Incluir todos os dados ricos necessários para a tela de detalhes
            include: [
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    // ✅ CORREÇÃO: Removido campo de foto
                    attributes: ['id', 'peca', 'tamanho', 'descricao', 'UsuarioId'],
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                },
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    // ✅ CORREÇÃO: Removido campo de foto
                    attributes: ['id', 'peca', 'tamanho', 'descricao', 'UsuarioId'],
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                }
            ]
        });

        // Garantir que apenas usuários envolvidos possam ver os detalhes (segurança)
        if (!troca || (troca.ProponenteId !== userIdNumber && troca.ReceptorId !== userIdNumber)) {
            return res.status(404).send("<p>Troca não encontrada ou você não tem acesso.</p>");
        }

        // Renderiza o partial que contém a estrutura do modal
        res.render('partials/troca_modal_content', {
            troca: troca.get({ plain: true }), // Garante objeto simples para o EJS
            userId: userIdNumber,
            layout: false // Essencial: não usar o layout principal
        });

    } catch (error) {
        console.error("ERRO AO CARREGAR DETALHES DO MODAL:", error);
        res.status(500).send("Erro ao carregar os detalhes.");
    }
});


// ==========================================================
// EXPORTAÇÕES DE MÓDULO:
// ==========================================================

// 1. Exportação principal do router (para ser usado no index.js)
export default router;

// 2. Exportação das funções auxiliares (para o itemRoutes.js usar)
export { contarTrocasRealizadas, buscarHistoricoTrocas };