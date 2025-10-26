import { Op } from 'sequelize';
import { contarTrocasRealizadas, buscarHistoricoTrocas } from './trocaController.js';
// Função para buscar o Model Item
function getItemModel(req) {
    return req.app.get('Item');
};
// ----------------------------------------------------------
// LÓGICA REUTILIZÁVEL (Contadores e Buscas)
// ----------------------------------------------------------
// Função auxiliar para buscar contadores (Reutilizada em várias rotas)
async function buscarContadores(Item, idUsuario) {
    const totalAtivas = await Item.count({ 
        where: { UsuarioId: idUsuario, statusPosse: 'Ativo' } 
    });
    const emTroca = await Item.count({ 
        where: { UsuarioId: idUsuario, statusPosse: 'EmTroca' } 
    });
    const trocasRealizadas = await contarTrocasRealizadas(idUsuario); // Chamada à função externa
    return { totalAtivas, emTroca, trocasRealizadas };
};
// ----------------------------------------------------------
// 1. FUNÇÕES DE LEITURA E VISUALIZAÇÃO
// ----------------------------------------------------------
// Lógica GET: LISTAR AS ROUPAS DO USUÁRIO LOGADO (READ ALL)
export const getItensUsuario = async (req, res) => { 
    const Item = getItemModel(req);
    const idUsuario = req.session.userId; // Usamos req.session, pois o middleware já rodou
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
        const { totalAtivas, emTroca, trocasRealizadas } = await buscarContadores(Item, idUsuario);
        // VIEW (O Controller renderiza)
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
            messages: req.flash()
        }); 
    } catch (error) {
        console.error("ERRO AO CARREGAR VIEW DE GERENCIAMENTO/HISTÓRICO:", error);
        req.flash('error_msg', 'Ocorreu um erro ao carregar seus itens.');
        res.redirect('/feed'); 
    }
};
// Lógica GET: BUSCAR ITEM PARA EDIÇÃO (READ ONE)
export const getFormularioEdicao = async (req, res) => { 
    const Item = getItemModel(req);
    const idItem = req.params.id;
    const idUsuario = req.session.userId;   
    try {
        const item = await Item.findOne({
            where: {
                id: idItem,
                UsuarioId: idUsuario 
            }
        });
        if (!item) {
            req.flash('error_msg', 'Item não encontrado ou você não tem permissão para editá-lo.');
            return res.redirect('/roupas');
        } 
        // Recarrega todos os itens para a lista lateral/card (Lógica de VIEW)
        const itensLista = await Item.findAll({ 
            where: { UsuarioId: idUsuario, statusPosse: { [Op.ne]: 'Historico' } }, 
            order: [['createdAt', 'DESC']], 
            raw: true 
        }); 
        const { totalAtivas, emTroca, trocasRealizadas } = await buscarContadores(Item, idUsuario);
        // VIEW
        res.render('roupas', { 
            title: 'Editar Peça', 
            userId: idUsuario, 
            itens: itensLista, 
            itemParaEditar: item.get({ plain: true }), 
            totalCadastradas: totalAtivas + emTroca, 
            totalAtivas: totalAtivas, 
            emTroca: emTroca,
            trocasRealizadas: trocasRealizadas,
            filtroStatus: item.statusPosse || 'Ativo',
            mostrarHistorico: false, 
            historicoTrocas: [],
            messages: req.flash()
        }); 
    } catch (error) {
        console.error("ERRO AO BUSCAR ITEM PARA EDIÇÃO:", error);
        req.flash('error_msg', 'Erro ao carregar item para edição.');
        res.redirect('/roupas');
    }
};
// ----------------------------------------------------------
// 2. FUNÇÕES DE CRIAÇÃO E ATUALIZAÇÃO
// ----------------------------------------------------------
// Lógica POST: CRIA OU ATUALIZA UM ITEM (CREATE & UPDATE)
export const salvarItem = async (req, res) => { 
    const Item = getItemModel(req);
    const idUsuario = req.session.userId; 
    const dadosItem = req.body;
    const itemId = dadosItem.id || null; 
    // Validação básica
    if (!dadosItem.peca || !dadosItem.tipo || !dadosItem.tamanho || !dadosItem.condicao || !dadosItem.categoriaPeca) {
        req.flash('error_msg', 'Todos os campos obrigatórios devem ser preenchidos.');
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
    };
    try {
        if (itemId) {
            // --- UPDATE (EDIÇÃO) ---
            await Item.update(itemDados, {
                where: { id: itemId, UsuarioId: idUsuario }
            });
            req.flash('success_msg', 'Item atualizado com sucesso!');
        } else {
            // --- CREATE (CRIAÇÃO) ---
            const itemParaCriar = { ...itemDados, statusPosse: 'Ativo' }; 
            await Item.create(itemParaCriar);
            req.flash('success_msg', 'Nova peça cadastrada com sucesso!');
        }  
        res.redirect('/roupas'); 
    } catch (error) {
        console.error(`ERRO AO SALVAR ITEM (ID: ${itemId || 'novo'}):`, error);
        req.flash('error_msg', 'Erro interno ao salvar o item.');
        res.redirect('/roupas');
    }
};
// ----------------------------------------------------------
// 3. FUNÇÕES DE EXCLUSÃO
// ----------------------------------------------------------
// Lógica GET: Exclui um item (DELETE)
export const excluirItem = async (req, res) => {
    const Item = getItemModel(req);
    const idItem = req.params.id;
    const idUsuario = req.session.userId;
    try {
        const item = await Item.findOne({
            where: { id: idItem, UsuarioId: idUsuario }
        });
        if (!item) {
            req.flash('error_msg', 'Item não encontrado ou você não tem permissão.');
            return res.redirect('/roupas');
        }
        // Previne exclusão de itens em processo de troca
        if (item.statusPosse !== 'Ativo') {
            req.flash('error_msg', 'Esta peça não pode ser excluída pois está envolvida em uma troca pendente.');
            return res.redirect('/roupas?status=EmTroca'); 
        }
        const rowsDeleted = await Item.destroy({
            where: { id: idItem, UsuarioId: idUsuario }
        });
        if (rowsDeleted > 0) {
            req.flash('success_msg', `Peça "${item.peca}" excluída com sucesso!`);
        } else {
            req.flash('error_msg', 'O item não pôde ser excluído.');
        }
        res.redirect('/roupas'); 
    } catch (error) {
        console.error("ERRO AO EXCLUIR ITEM:", error);
        req.flash('error_msg', 'Erro interno ao tentar excluir o item.');
        res.redirect('/roupas');
    }
};