// routes/viewRoutes.js

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
    if (!req.session.userId) {
        req.flash('error', 'Você precisa estar logado para acessar esta página.');
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
    res.render("login", { title: "Login" }); 
});

// Rota de Login separada
router.get("/login", function (req, res) {
    res.render("login", { title: "Login" });
});

// ROTA DE CADASTRO
router.get("/cadastro", function (req, res) {
    res.render("cadastro", { title: "Cadastro" });
});

// =========================================================================
// ROTA DO FEED (SWIPE CARD COM BUSCA NO BD)
// View: views/feed.ejs
// =========================================================================

router.get("/feed", authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
             throw new Error("Usuário ID não encontrado na sessão.");
        }

        // 1. Busca todas as peças ATIVAS que NÃO pertencem ao usuário logado
        const pecasDisponiveis = await Item.findAll({
            where: {
                statusPosse: 'Ativo',
                UsuarioId: { [Op.not]: userId } 
            },
            // Inclui o modelo Usuario (ALIAS CORRETO: 'usuario')
            include: [{
                model: Usuario,
                as: 'usuario', 
                attributes: ['nome', 'cidade', 'estado'] 
            }],
            order: [['createdAt', 'DESC']]
        });
        
        // 2. Renderiza a view 'feed.ejs' (com o swipe card)
        res.render('feed', {
            title: "Feed de Trocas",
            pecasDisponiveis: pecasDisponiveis
        });

    } catch (error) {
        console.error("ERRO FATAL AO CARREGAR O FEED:", error.message || error); 
        req.flash('error', 'Ocorreu um erro ao carregar o Feed. Tente novamente mais tarde.');
        // Em caso de erro, redireciona para a raiz (que levará ao login ou exibirá a página de erro)
        res.status(500).redirect('/'); 
    }
});


// ROTA DE LOGOUT (mantida)
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Erro ao destruir sessão:", err);
            // Redireciona para a nova rota principal após logout
            return res.redirect('/feed'); 
        }
        res.redirect('/');
    });
});


export default router;