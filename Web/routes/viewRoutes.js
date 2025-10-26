import express from 'express';
import Sequelize from 'sequelize'; 
import Item from '../models/Item.js'; 
import Usuario from '../models/Usuario.js'; 
const router = express.Router();
const { Op } = Sequelize; 
// =========================================================================
// Middleware de Autenticação
// =========================================================================
const authMiddleware = (req, res, next) => {
    // Garante que o userId é um número para consistência, se precisar usá-lo
    if (req.session.userId) {
        req.session.userId = parseInt(req.session.userId, 10);
    }
    if (!req.session.userId) {
        // Usa req.flash para enviar a mensagem de erro
        if (req.flash) { 
            req.flash('error', 'Você precisa estar logado para acessar esta página.');
        }
        return res.redirect('/login');
    }
    next();
};
// =========================================================================
// ROTAS DE VISUALIZAÇÃO PÚBLICAS (Login, Cadastro, Home)
// =========================================================================
// ROTA RAIZ (/)
router.get("/", function (req, res) {
    if (req.session.userId) {
        // Usuário logado é levado diretamente para o Feed (/feed)
        return res.redirect('/feed'); 
    }
    // Passar req.flash para as views
    res.render("login", { 
        title: "Login",
        messages: req.flash ? req.flash() : {} 
    }); 
});
// Rota de Login separada
router.get("/login", function (req, res) {
    res.render("login", { 
        title: "Login",
        messages: req.flash ? req.flash() : {} 
    });
});
// ROTA DE CADASTRO
router.get("/cadastro", function (req, res) {
    res.render("cadastro", { 
        title: "Cadastro",
        messages: req.flash ? req.flash() : {} 
    });
});
// =========================================================================
// ROTA DO FEED (SWIPE CARD COM BUSCA NO BD)
// View: views/feed.ejs
// =========================================================================
router.get("/feed", authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId; 
        // 1. Busca todas as peças ATIVAS que NÃO pertencem ao usuário logado
        const pecasDisponiveis = await Item.findAll({
            where: {
                statusPosse: 'Ativo',
                UsuarioId: { [Op.not]: userId } 
            },
            // Inclui o modelo Usuario para obter o nome do dono, cidade, etc.
            include: [{
                model: Usuario,
                as: 'usuario', 
                attributes: ['nome', 'cidade', 'estado'] 
            }],
            order: [['createdAt', 'DESC']]
        });
        // 2. Renderiza a view 'feed.ejs'
        res.render('feed', {
            title: "Feed de Trocas",
            itens: pecasDisponiveis, 
            messages: req.flash ? req.flash() : {}
        });
    } catch (error) {
        console.error("ERRO FATAL AO CARREGAR O FEED:", error.message || error); 
        if (req.flash) {
            req.flash('error', 'Ocorreu um erro ao carregar o Feed. Tente novamente mais tarde.');
        }
        // Renderiza o feed com array vazio e mensagem de erro,
        // garantindo que 'itens' esteja sempre presente.
        res.status(500).render('feed', { 
            title: "Feed de Trocas",
            itens: [],
            messages: req.flash ? req.flash() : {} // Passa a mensagem de erro
        });
    }
});
// =========================================================================
// ROTA DE API: DETALHES DO ITEM (Para o Modal JS - item_modal.js)
// =========================================================================
router.get('/api/item/:itemId', authMiddleware, async (req, res) => {
    try {
        const itemId = req.params.itemId;     
        // Busca o item no banco de dados, incluindo o usuário dono
        const itemDetalhado = await Item.findByPk(itemId, {
            include: [{
                model: Usuario,
                as: 'usuario', 
                attributes: ['nome'] 
            }],
        });
        if (!itemDetalhado) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }
        // Formata os dados para o frontend (JSON)
        const itemData = itemDetalhado.get({ plain: true });
        // Adapta os nomes das colunas (DB) para o formato esperado pelo JS (Modal)
        const responseData = {
            id: itemData.id,
            // Mapeamento baseado no DB do Item e no JS do Modal
            nome_da_peca: itemData.peca, 
            tipo: itemData.tipo, 
            categoriaPeca: itemData.categoriaPeca, 
            // Outros campos do DB
            dono_nome: itemData.usuario.nome, // Nome do dono
            tamanho: itemData.tamanho,
            cor: itemData.cor,
            tecido: itemData.tecido,
            estacao: itemData.estacao,
            condicao: itemData.condicao,
            // Data e Imagem
            data_cadastro: itemData.createdAt,
            // A coluna 'descricao' do DB é mapeada para 'descricao_completa' no JSON de resposta, como esperado
            descricao_completa: itemData.descricao || 'Nenhuma descrição detalhada.', 
            imagem_url: itemData.fotoUrl || itemData.imagem_url, 
        };
        // Envia o objeto JSON
        res.status(200).json(responseData);
    } catch (error) {
        console.error("ERRO na API de detalhes do item:", error);
        res.status(500).json({ message: 'Erro interno ao buscar detalhes do item.' });
    }
});
// =========================================================================
// ROTA DE LOGOUT (mantida)
// =========================================================================
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Erro ao destruir sessão:", err);
            return res.redirect('/feed'); 
        }
        res.redirect('/');
    });
});
export default router;