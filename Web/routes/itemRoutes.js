// routes/itemRoutes.js - CÓDIGO COMPLETO E CORRIGIDO

import express from 'express';
import Item from '../models/Item.js'; 
import Troca from '../models/Troca.js'; // NOVO: Importa o Model de Troca
import Sequelize from 'sequelize';     // NOVO: Importa o Sequelize
const router = express.Router();

// ==========================================================
// MIDDLEWARE: VERIFICAÇÃO DE LOGIN
// ==========================================================
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}
// Aplica a verificação de login a todas as rotas de itens
router.use(requireLogin); 

// ==========================================================
// FUNÇÃO AUXILIAR: Conta trocas finalizadas
// ==========================================================
async function contarTrocasRealizadas(userId) {
    return Troca.count({
        where: {
            [Sequelize.Op.or]: [
                { ProponenteId: userId },
                { ReceptorId: userId }
            ],
            status: 'Finalizada' 
        }
    });
}

// ==========================================================
// ROTAS DE VIEW (GET) - Consolidação
// ==========================================================

// ROTA GET: LISTAR AS ROUPAS DO USUÁRIO LOGADO (READ ALL) - INCLUI LÓGICA DE FILTRO (MÉTRICAS)
router.get("/roupas", async (req, res) => {
    const idUsuario = req.session.userId;
    // Captura o status do query string para filtros de métricas (Ex: ?status=EmTroca)
    const statusFiltro = req.query.status; 
    
    let whereClause = { UsuarioId: idUsuario }; 
    
    // Lógica para aplicar o filtro da métrica 'Em Processo de Troca'
    if (statusFiltro && statusFiltro !== 'Cadastradas') { 
        whereClause.statusPosse = statusFiltro;
    } else {
        // Se não houver filtro, mostra as peças ativas/disponíveis (Métrica "Roupas Cadastradas")
        whereClause.statusPosse = 'Ativo'; 
    }
    
    try {
        // 1. Busca os itens filtrados para a listagem
        const itens = await Item.findAll({ 
            where: whereClause,
            order: [['createdAt', 'DESC']],
            raw: true 
        });
        
        // 2. Busca das métricas (valores para o topo da página)
        const totalCadastradas = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'Ativo' } });
        const emTroca = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'EmTroca' } });
        const trocasRealizadas = await contarTrocasRealizadas(idUsuario); // Valor CORRETO

        // NOVO: Renderiza a view 'roupas' com os itens FILTRADOS e as métricas
        res.render('roupas', { 
            itens: itens, 
            totalCadastradas: totalCadastradas,
            emTroca: emTroca,
            trocasRealizadas: trocasRealizadas, // PASSA O VALOR CORRETO
            itemParaEditar: null // Garante que o modal de edição esteja fechado/limpo por padrão
        }); 
        
    } catch (error) {
        console.error("ERRO AO LISTAR ITENS:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível carregar seus itens.</p>');
    }
});


// ROTA GET: BUSCAR ITEM E EXIBIR FORMULÁRIO DE EDIÇÃO (READ ONE)
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
            // Busca as métricas também (porque a view /roupas precisa delas)
            const totalCadastradas = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'Ativo' } });
            const emTroca = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'EmTroca' } });
            const trocasRealizadas = await contarTrocasRealizadas(idUsuario); // Valor CORRETO
            
            res.render('roupas', { 
                itens: [], // Não lista outros itens, foca na edição (opcional)
                itemParaEditar: item.get({ plain: true }), // Item para preencher o formulário
                totalCadastradas: totalCadastradas,
                emTroca: emTroca,
                trocasRealizadas: trocasRealizadas
            }); 
        } else {
            // Se não encontrar, redireciona para a listagem normal
            res.redirect('/roupas');
        }

    } catch (error) {
        console.error("ERRO AO BUSCAR ITEM PARA EDIÇÃO:", error);
        res.redirect('/roupas');
    }
});


// ==========================================================
// ROTAS DE AÇÃO (POST / DELETE) - CRUD
// ==========================================================

// ROTA POST: Salva um novo item (CREATE)
router.post('/roupas/salvar', async (req, res) => {
    const idUsuario = req.session.userId;
    const dadosItem = req.body;
    dadosItem.UsuarioId = idUsuario; 

    // Garantir que o status inicial seja "Ativo"
    dadosItem.statusPosse = 'Ativo';

    if (!dadosItem.peca || !dadosItem.tipo || !dadosItem.tamanho || !dadosItem.condicao) {
        return res.redirect('/roupas'); 
    }

    try {
        await Item.create(dadosItem);
        res.redirect('/roupas'); 
    } catch (error) {
        console.error("ERRO AO CADASTRAR ITEM:", error);
        res.redirect('/roupas');
    }
});

// ROTA POST: Salva as alterações do item (UPDATE)
router.post("/roupas/editar/:id", async (req, res) => {
    const idItem = req.params.id;
    const idUsuario = req.session.userId;
    const novosDados = req.body;

    if (!novosDados.peca || !novosDados.tipo || !novosDados.tamanho || !novosDados.condicao) {
        return res.redirect(`/roupas/editar/${idItem}`); // Volta para a edição
    }

    try {
        await Item.update(novosDados, {
            where: {
                id: idItem,
                UsuarioId: idUsuario 
            }
        });
        res.redirect('/roupas'); 
    } catch (error) {
        console.error("ERRO AO SALVAR EDIÇÃO DO ITEM:", error);
        res.redirect('/roupas');
    }
});

// ROTA GET: Exclui um item (DELETE)
router.get('/roupas/excluir/:id', async (req, res) => {
    const idItem = req.params.id;
    const idUsuario = req.session.userId;
    
    try {
        const rowsDeleted = await Item.destroy({
            where: {
                id: idItem,
                UsuarioId: idUsuario 
            }
        });

        if (rowsDeleted > 0) {
            res.redirect('/roupas'); 
        } else {
            res.redirect('/roupas');
        }
    } catch (error) {
        console.error("ERRO AO EXCLUIR ITEM:", error);
        res.redirect('/roupas');
    }
});


export default router;