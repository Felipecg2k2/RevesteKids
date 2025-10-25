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
                { model: Item, as: 'itemOferecido', attributes: ['peca', 'tamanho'] },
                // Item que você deseja (Pertence ao RECEPTOR)
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    attributes: ['peca', 'tamanho'],
                    // CORREÇÃO COMPLETA: Inclui o usuário DENTRO do Item Desejado (o Receptor)
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
                // Propostas ATIVAS que precisam de ação do receptor (Aceitar/Rejeitar/Finalizar)
                status: { [Op.in]: ['Pendente', 'Aceita'] } 
            },
            include: [
                // Item que você (Receptor) deseja
                { model: Item, as: 'itemDesejado', attributes: ['peca', 'tamanho'] },
                // Item que o outro usuário (Proponente) oferece
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    attributes: ['peca', 'tamanho'],
                    // CORREÇÃO COMPLETA: Inclui o usuário DENTRO do Item Oferecido (o Proponente)
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
            // CORREÇÃO: Incluir Usuário no histórico para o modal de detalhes
            include: [
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    attributes: ['peca', 'tamanho'],
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome'] }] // Nome do Proponente/Dono original
                },
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    attributes: ['peca', 'tamanho'],
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome'] }] // Nome do Receptor/Dono original
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

        // Executa as buscas de dados em paralelo para maior eficiência
        const [propostasRecebidas, propostasEnviadas, historicoTrocas] = await Promise.all([
            buscarPropostasRecebidas(userId),
            buscarPropostasEnviadas(userId),
            buscarHistoricoTrocas(userId)
        ]);
        
        // Renderiza a nova view de gerenciamento (trocas.ejs)
        res.render('trocas', {
            title: "Gerenciamento de Trocas",
            userId: userId, // ESSENCIAL: Passar o userId
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
            // Os novos campos (proponenteConfirmouFinalizacao e receptorConfirmouFinalizacao)
            // são definidos como FALSE por padrão no modelo, o que é o correto.
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
// ROTA 9: FINALIZAR TROCA - LÓGICA DE CONFIRMAÇÃO DUPLA E STATUS FINALIZADA
// ==========================================================
router.post("/finalizar/:trocaId", async (req, res) => {
    const { trocaId } = req.params;
    const userId = req.session.userId;
    const userIdNumber = parseInt(userId, 10);

    // 1. Inicia a transação
    const t = await connection.transaction();

    try {
        // Busca a troca (com a transação)
        const troca = await Troca.findByPk(trocaId, { transaction: t });

        // 2. Validação: A troca deve estar 'Aceita'
        if (!troca || troca.status !== 'Aceita') {
            await t.rollback(); 
            return res.redirect('/trocas');
        }
        
        // 3. Verifica se o usuário logado é Proponente ou Receptor
        const isProponente = troca.ProponenteId === userIdNumber;
        const isReceptor = troca.ReceptorId === userIdNumber;

        if (!isProponente && !isReceptor) {
            await t.rollback(); 
            return res.redirect('/trocas'); // Usuário não faz parte da troca
        }

        // 4. Marca o flag de confirmação do usuário logado
        if (isProponente) {
            // Se o proponente já confirmou, ignora. Se não, marca como true.
            if (!troca.proponenteConfirmouFinalizacao) {
                troca.proponenteConfirmouFinalizacao = true;
                req.flash('success', 'Você confirmou o recebimento! Aguardando confirmação do outro usuário.');
            }
        } else if (isReceptor) {
            // Se o receptor já confirmou, ignora. Se não, marca como true.
            if (!troca.receptorConfirmouFinalizacao) {
                troca.receptorConfirmouFinalizacao = true;
                req.flash('success', 'Você confirmou o recebimento! Aguardando confirmação do outro usuário.');
            }
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
            req.flash('success', 'Troca finalizada com sucesso! Itens registrados em seu Histórico.');
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
// Garante que os novos campos de confirmação sejam carregados.
// ==========================================================
router.get("/detalhes/:trocaId", async (req, res) => {
    try {
        const userId = req.session.userId;
        const { trocaId } = req.params;

        const troca = await Troca.findByPk(trocaId, {
            // Incluir todos os dados ricos necessários para a tela de detalhes
            include: [
                { 
                    model: Item, 
                    as: 'itemOferecido', 
                    attributes: ['id', 'peca', 'tamanho', 'descricao', 'fotoUrl', 'UsuarioId'],
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                },
                { 
                    model: Item, 
                    as: 'itemDesejado', 
                    attributes: ['id', 'peca', 'tamanho', 'descricao', 'fotoUrl', 'UsuarioId'],
                    include: [{ model: Usuario, as: 'usuario', attributes: ['nome', 'cidade'] }] 
                }
            ]
        });

        if (!troca || (troca.ProponenteId !== parseInt(userId, 10) && troca.ReceptorId !== parseInt(userId, 10))) {
             // Garante que apenas usuários envolvidos possam ver os detalhes (segurança)
            return res.status(404).send("<p>Troca não encontrada ou você não tem acesso.</p>");
        }

        // Renderiza o partial que contém a estrutura do modal
        res.render('partials/troca_modal_content', {
            troca: troca,
            userId: parseInt(userId, 10),
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