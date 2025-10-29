import express from 'express';
import Sequelize from 'sequelize'; 
import Item from '../models/Item.js'; 
import Usuario from '../models/Usuario.js'; 
import Imagem from '../models/Imagem.js';

const router = express.Router();
const { Op } = Sequelize; 

// =========================================================================
// Middleware de Autenticação
// =========================================================================
const authMiddleware = (req, res, next) => {
    if (req.session.userId) {
        req.session.userId = parseInt(req.session.userId, 10);
    }
    if (!req.session.userId) {
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
        return res.redirect('/feed'); 
    }
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
        
        console.log("🔄 Carregando feed para usuário:", userId);
        
        // 1. Busca todas as peças ATIVAS que NÃO pertencem ao usuário logado
        const itensFeed = await Item.findAll({
            where: {
                statusPosse: 'Ativo',
                UsuarioId: { [Op.not]: userId } 
            },
            include: [
                {
                    model: Usuario,
                    as: 'usuario', 
                    attributes: ['id', 'nome', 'cidade', 'estado', 'foto_perfil'] 
                },
                {
                    model: Imagem,
                    as: 'imagens',
                    attributes: ['id', 'caminho_arquivo', 'is_principal', 'ordem'],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        console.log(`📦 Encontrados ${itensFeed.length} itens para o feed`);

        // PROCESSAR AS IMAGENS PARA O FEED
        const itensProcessados = itensFeed.map(item => {
            const itemPlain = item.get({ plain: true });
            
            console.log(`🔍 Item ${itemPlain.id}: ${itemPlain.peca}, ${itemPlain.imagens ? itemPlain.imagens.length : 0} imagens`);
            
            // Ordenar imagens pela ordem
            if (itemPlain.imagens && itemPlain.imagens.length > 0) {
                itemPlain.imagens.sort((a, b) => a.ordem - b.ordem);
                
                // Encontrar imagem principal (ou usar a primeira)
                itemPlain.imagemPrincipal = itemPlain.imagens.find(img => img.is_principal) 
                    || itemPlain.imagens[0];
                    
                console.log(` Imagem principal: ${itemPlain.imagemPrincipal.caminho_arquivo}`);
            } else {
                itemPlain.imagemPrincipal = null;
                console.log(` Sem imagens`);
            }
            
            return itemPlain;
        });

        // 2. Renderiza a view 'feed.ejs'
        res.render('feed', {
            title: "Feed de Trocas",
            itens: itensProcessados,
            messages: req.flash ? req.flash() : {}
        });
        
    } catch (error) {
        console.error("ERRO FATAL AO CARREGAR O FEED:", error.message || error); 
        if (req.flash) {
            req.flash('error', 'Ocorreu um erro ao carregar o Feed. Tente novamente mais tarde.');
        }
        res.status(500).render('feed', { 
            title: "Feed de Trocas",
            itens: [],
            messages: req.flash ? req.flash() : {}
        });
    }
});

// =========================================================================
// ROTA DE API: DETALHES DO ITEM (Para o Modal JS - item_modal.js)
// =========================================================================
router.get('/api/item/:itemId', authMiddleware, async (req, res) => {
    try {
        const itemId = req.params.itemId;     
        // Busca o item no banco de dados, incluindo o usuário dono e TODAS as imagens
        const itemDetalhado = await Item.findByPk(itemId, {
            include: [
                {
                    model: Usuario,
                    as: 'usuario', 
                    attributes: ['nome'] 
                },
                {
                    model: Imagem,
                    as: 'imagens',
                    attributes: ['id', 'caminho_arquivo', 'is_principal', 'ordem']
                }
            ],
        });
        
        if (!itemDetalhado) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }
        
        // Formata os dados para o frontend (JSON)
        const itemData = itemDetalhado.get({ plain: true });
        
        // Ordenar imagens pela ordem
        if (itemData.imagens && itemData.imagens.length > 0) {
            itemData.imagens.sort((a, b) => a.ordem - b.ordem);
        }
        
        // Adapta os nomes das colunas (DB) para o formato esperado pelo JS (Modal)
        const responseData = {
            id: itemData.id,
            nome_da_peca: itemData.peca, 
            tipo: itemData.tipo, 
            categoriaPeca: itemData.categoriaPeca, 
            dono_nome: itemData.usuario.nome,
            tamanho: itemData.tamanho,
            cor: itemData.cor,
            tecido: itemData.tecido,
            estacao: itemData.estacao,
            condicao: itemData.condicao,
            data_cadastro: itemData.createdAt,
            descricao_completa: itemData.descricao || 'Nenhuma descrição detalhada.',
            imagens: itemData.imagens || []
        };
        
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