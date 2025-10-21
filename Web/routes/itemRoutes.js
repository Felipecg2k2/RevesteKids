// routes/itemRoutes.js

import express from 'express';
import Item from '../models/Item.js'; // Importação relativa do Model
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
// ROTAS DE VIEW (GET) - Formulários e Listagem
// ==========================================================

// ROTA GET: ABRIR O FORMULÁRIO DE CADASTRO DE ROUPAS
router.get("/roupas/cadastro", function (req, res) {
    // A verificação de login já é feita pelo middleware router.use(requireLogin)
    res.render('cadastroRoupa'); 
});

// ROTA GET: LISTAR AS ROUPAS DO USUÁRIO LOGADO (READ ALL)
// CORREÇÃO: URL alterada de /minhas-roupas para /roupas (Padrão e consistência)
router.get("/roupas", async (req, res) => {
    // A URL /roupas agora faz a mesma coisa que /minhas-roupas
    const idUsuario = req.session.userId;
    
    // O filtro where: { UsuarioId: idUsuario } garante que só apareçam 
    // itens que PERTENCEM ao usuário logado, resolvendo o problema dos itens trocados.
    try {
        const itens = await Item.findAll({ 
            where: { UsuarioId: idUsuario },
            order: [['createdAt', 'DESC']],
            // NOVO: Adicione 'raw: true' para garantir que o Sequelize 
            // busque do banco e não do cache de instâncias
            raw: true 
        });
        
        res.render('roupas', { itens: itens }); 
        
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
                UsuarioId: idUsuario // Garante que o usuário só edite o que lhe pertence
            }
        });

        if (item) {
            res.render('editarRoupa', { item: item }); 
        } else {
            res.send('<h1>ERRO!</h1><p>Item não encontrado ou você não tem permissão para editar.</p>');
        }

    } catch (error) {
        console.error("ERRO AO BUSCAR ITEM PARA EDIÇÃO:", error);
        res.send('<h1>ERRO!</h1><p>Erro ao carregar os dados para edição.</p>');
    }
});


// ==========================================================
// ROTAS DE AÇÃO (POST / DELETE) - CRUD
// ==========================================================

// ROTA POST: Salva um novo item (CREATE)
router.post('/roupas/salvar', async (req, res) => {
    const idUsuario = req.session.userId;
    const dadosItem = req.body;
    dadosItem.UsuarioId = idUsuario; // Associa o item ao usuário logado

    try {
        await Item.create(dadosItem);
        // CORREÇÃO: Redireciona para a URL consistente
        res.redirect('/roupas'); 
    } catch (error) {
        console.error("ERRO AO CADASTRAR ITEM:", error);
        res.send('<h1>ERRO!</h1><p>Houve um erro ao cadastrar o item.</p><a href="/roupas/cadastro">Voltar</a>');
    }
});

// ROTA POST: Salva as alterações do item (UPDATE)
router.post("/roupas/editar/:id", async (req, res) => {
    const idItem = req.params.id;
    const idUsuario = req.session.userId;
    const novosDados = req.body;

    try {
        await Item.update(novosDados, {
            where: {
                id: idItem,
                UsuarioId: idUsuario // Garante que o usuário só atualize o que lhe pertence
            }
        });
        // CORREÇÃO: Redireciona para a URL consistente
        res.redirect('/roupas'); 
    } catch (error) {
        console.error("ERRO AO SALVAR EDIÇÃO DO ITEM:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível salvar as alterações.</p>');
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
                UsuarioId: idUsuario // Garante que o usuário só exclua o que lhe pertence
            }
        });

        if (rowsDeleted > 0) {
            // CORREÇÃO: Redireciona para a URL consistente
            res.redirect('/roupas'); 
        } else {
            res.send('<h1>ERRO!</h1><p>Item não encontrado ou você não tem permissão para excluí-lo.</p><a href="/roupas">Voltar</a>');
        }
    } catch (error) {
        console.error("ERRO AO EXCLUIR ITEM:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível excluir o item.</p>');
    }
});


export default router;