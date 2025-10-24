import express from 'express';
import Item from '../models/Item.js'; 
import Troca from '../models/Troca.js'; 
import { Op } from 'sequelize';
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
router.use(requireLogin); 

// ==========================================================
// FUNÇÕES AUXILIARES
// ==========================================================
async function contarTrocasRealizadas(userId) {
    return Troca.count({
        where: {
            [Op.or]: [
                { ProponenteId: userId },
                { ReceptorId: userId }
            ],
            status: 'Finalizada' 
        }
    });
}

// Função auxiliar para buscar o histórico completo (Trocas Finalizadas, Rejeitadas, Canceladas)
async function buscarHistoricoTrocas(userId) {
    try {
        const historico = await Troca.findAll({
            where: {
                [Op.or]: [{ ProponenteId: userId }, { ReceptorId: userId }],
                status: { [Op.in]: ['Finalizada', 'Cancelada', 'Rejeitada'] }
            },
            include: [
                { model: Item, as: 'itemOferecido', attributes: ['peca', 'tamanho'] },
                { model: Item, as: 'itemDesejado', attributes: ['peca', 'tamanho'] }
            ],
            // Ordena pelo campo corrigido (dataFinalizacao), com fallback para createdAt
            order: [['dataFinalizacao', 'DESC'], ['createdAt', 'DESC']] 
        });
        return historico;
    } catch (error) {
        console.error("ERRO AO BUSCAR HISTÓRICO NO INVENTÁRIO:", error.message);
        return []; 
    }
}


// ==========================================================
// ROTA GET: LISTAR AS ROUPAS DO USUÁRIO LOGADO (READ ALL) - AJUSTE NA LÓGICA DE FILTRO/CONTADORES
// ==========================================================
router.get("/roupas", async (req, res) => {
    const idUsuario = req.session.userId;
    
    // 1. FILTRO DE STATUS POSSE
    // Garante que, se não houver filtro na URL, o padrão é 'Ativo' para mostrar a lista de itens.
    const statusFiltro = req.query.status || 'Ativo'; 
    
    // 2. FLAG PARA HISTÓRICO 
    const mostrarHistorico = req.query.historico === 'true'; 
    
    let whereClause = { UsuarioId: idUsuario }; 
    
    // Define a cláusula WHERE para filtrar os itens de posse (Ativo ou EmTroca)
    if (statusFiltro === 'EmTroca') {
        whereClause.statusPosse = 'EmTroca'; 
    } else {
        // Se não for 'EmTroca', o padrão é 'Ativo'
        whereClause.statusPosse = 'Ativo'; 
    }
    
    try {
        // 1. Busca os itens filtrados (só executa se NÃO for para mostrar histórico)
        let itens = [];
        if (!mostrarHistorico) {
            // CRÍTICO: whereClause já contém o filtro statusPosse: 'Ativo' OU 'EmTroca'
            itens = await Item.findAll({ 
                where: whereClause,
                order: [['createdAt', 'DESC']],
                raw: true // Garante que o objeto retornado é plano e não contém métodos Sequelize
            });
        }
        
        // 2. Busca do Histórico (mantido)
        let historicoTrocas = [];
        if (mostrarHistorico) {
             historicoTrocas = await buscarHistoricoTrocas(idUsuario);
        }

        // 3. Busca das métricas (Contadores)
        const totalAtivas = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'Ativo' } });
        const emTroca = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'EmTroca' } });
        const trocasRealizadas = await contarTrocasRealizadas(idUsuario); 

        // Renderiza a view 'roupas' com todos os dados
        res.render('roupas', { 
            userId: idUsuario, 
            itens: itens, 
            
            // CORREÇÃO/CLAREZA: totalCadastradas deve ser a soma total de itens no inventário que não foram para Histórico.
            totalCadastradas: totalAtivas + emTroca, 
            
            // ADIÇÃO CRÍTICA: Passando totalAtivas separadamente para o frontend
            totalAtivas: totalAtivas, // <--- ADIÇÃO CRÍTICA
            
            emTroca: emTroca,
            trocasRealizadas: trocasRealizadas, 
            itemParaEditar: null,
            filtroStatus: statusFiltro, // Passa o status para a view saber qual aba está ativa
            
            mostrarHistorico: mostrarHistorico,
            historicoTrocas: historicoTrocas
        }); 
        
    } catch (error) {
        console.error("ERRO AO CARREGAR VIEW DE GERENCIAMENTO/HISTÓRICO:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível carregar o painel de gerenciamento.</p>');
    }
});


// ROTA GET: BUSCAR ITEM E EXIBIR FORMULÁRIO DE EDIÇÃO (READ ONE) - Mantido, exceto o valor de totalCadastradas
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
            // Busca as métricas também
            const totalAtivas = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'Ativo' } });
            const emTroca = await Item.count({ where: { UsuarioId: idUsuario, statusPosse: 'EmTroca' } });
            const trocasRealizadas = await contarTrocasRealizadas(idUsuario); 
            
            res.render('roupas', { 
                userId: idUsuario, 
                itens: [], 
                itemParaEditar: item.get({ plain: true }), 
                totalCadastradas: totalAtivas + emTroca, // Mantém a soma total
                // ADIÇÃO CRÍTICA: Passando totalAtivas separadamente
                totalAtivas: totalAtivas, // <--- ADIÇÃO CRÍTICA
                emTroca: emTroca,
                trocasRealizadas: trocasRealizadas,
                filtroStatus: item.statusPosse || 'Ativo',
                // Necessário para o EJS não quebrar ao renderizar o bloco de histórico vazio
                mostrarHistorico: false, 
                historicoTrocas: []
            }); 
        } else {
            res.redirect('/roupas');
        }

    } catch (error) {
        console.error("ERRO AO BUSCAR ITEM PARA EDIÇÃO:", error);
        res.redirect('/roupas');
    }
});

// ==========================================================
// ROTAS DE AÇÃO (POST / DELETE) - CRUD (Mantidas inalteradas)
// ==========================================================

// ROTA POST: Salva um novo item (CREATE)
router.post('/roupas/salvar', async (req, res) => {
    const idUsuario = req.session.userId;
    const dadosItem = req.body;
    
    if(dadosItem.id) delete dadosItem.id; 
    
    const itemParaCriar = {
        UsuarioId: idUsuario,
        peca: dadosItem.peca,
        categoriaPeca: dadosItem.categoriaPeca,
        tipo: dadosItem.tipo,
        tamanho: dadosItem.tamanho,
        cor: dadosItem.cor,
        tecido: dadosItem.tecido,
        estacao: dadosItem.estacao,
        condicao: dadosItem.condicao,
        descricao: dadosItem.descricao,
        statusPosse: 'Ativo' 
    };

    if (!itemParaCriar.peca || !itemParaCriar.tipo || !itemParaCriar.tamanho || !itemParaCriar.condicao || !itemParaCriar.categoriaPeca) {
        return res.redirect('/roupas'); 
    }

    try {
        await Item.create(itemParaCriar);
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

    delete novosDados.statusPosse; 

    if (!novosDados.peca || !novosDados.tipo || !novosDados.tamanho || !novosDados.condicao || !novosDados.categoriaPeca) {
        return res.redirect(`/roupas/editar/${idItem}`); 
    }

    try {
        const [rowsAffected] = await Item.update(novosDados, {
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

// ROTA POST/GET: Exclui um item (DELETE)
router.get('/roupas/excluir/:id', async (req, res) => {
    const idItem = req.params.id;
    const idUsuario = req.session.userId;
    
    try {
        const item = await Item.findOne({
            where: { id: idItem, UsuarioId: idUsuario }
        });

        if (!item) {
            return res.redirect('/roupas');
        }

        // Previne exclusão de itens em processo de troca
        if (item.statusPosse !== 'Ativo') {
            return res.redirect('/roupas?status=EmTroca'); 
        }

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