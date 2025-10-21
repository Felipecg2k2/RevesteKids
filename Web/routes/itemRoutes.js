// routes/itemRoutes.js

import express from 'express';
import Item from '../models/Item.js'; // Importação relativa do Model
const router = express.Router();

// ==========================================================
// ROTAS DE VIEW (GET) - Formulários e Listagem
// ==========================================================

// ROTA GET: ABRIR O FORMULÁRIO DE CADASTRO DE ROUPAS
router.get("/roupas/cadastro", function (req, res) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('cadastroRoupa'); 
});

// ROTA GET: LISTAR AS ROUPAS DO USUÁRIO LOGADO (READ ALL)
router.get("/minhas-roupas", function (req, res) {
    const idUsuario = req.session.userId;
    
    if (!idUsuario) {
        return res.redirect('/login');
    }

    Item.findAll({ 
        where: { UsuarioId: idUsuario } 
    })
    .then(itens => {
        res.render('roupas', { itens: itens }); 
    })
    .catch(error => {
        console.error("ERRO AO LISTAR ITENS:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível carregar seus itens.</p>');
    });
});

// ROTA GET: BUSCAR ITEM E EXIBIR FORMULÁRIO DE EDIÇÃO (READ ONE)
router.get("/roupas/editar/:id", function (req, res) {
    const idItem = req.params.id;
    const idUsuario = req.session.userId;

    if (!idUsuario) {
        return res.redirect('/login');
    }
    
    Item.findOne({
        where: {
            id: idItem,
            UsuarioId: idUsuario
        }
    })
    .then(item => {
        if (item) {
            res.render('editarRoupa', { item: item }); 
        } else {
            res.send('<h1>ERRO!</h1><p>Item não encontrado ou você não tem permissão para editar.</p>');
        }
    })
    .catch(error => {
        console.error("ERRO AO BUSCAR ITEM PARA EDIÇÃO:", error);
        res.send('<h1>ERRO!</h1><p>Erro ao carregar os dados para edição.</p>');
    });
});


// ==========================================================
// ROTAS DE AÇÃO (POST / DELETE) - CRUD
// ==========================================================

// ROTA POST: Salva um novo item (CREATE)
router.post('/roupas/salvar', (req, res) => {
    const idUsuario = req.session.userId;

    if (!idUsuario) {
        return res.redirect('/login');
    }

    const dadosItem = req.body;
    dadosItem.UsuarioId = idUsuario; 

    Item.create(dadosItem)
        .then(() => {
            res.redirect('/minhas-roupas'); 
        })
        .catch((error) => {
            console.error("ERRO AO CADASTRAR ITEM:", error);
            res.send('<h1>ERRO!</h1><p>Houve um erro ao cadastrar o item.</p><a href="/roupas/cadastro">Voltar</a>');
        });
});

// ROTA POST: Salva as alterações do item (UPDATE)
router.post("/roupas/editar/:id", function (req, res) {
    const idItem = req.params.id;
    const idUsuario = req.session.userId;
    const novosDados = req.body;

    if (!idUsuario) {
        return res.redirect('/login');
    }

    Item.update(novosDados, {
        where: {
            id: idItem,
            UsuarioId: idUsuario
        }
    })
    .then(() => {
        res.redirect('/minhas-roupas'); 
    })
    .catch(error => {
        console.error("ERRO AO SALVAR EDIÇÃO DO ITEM:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível salvar as alterações.</p>');
    });
});

// ROTA GET: Exclui um item (DELETE)
router.get('/roupas/excluir/:id', (req, res) => {
    const idItem = req.params.id;
    const idUsuario = req.session.userId;

    if (!idUsuario) {
        return res.redirect('/login');
    }
    
    Item.destroy({
        where: {
            id: idItem,
            UsuarioId: idUsuario 
        }
    })
    .then(rowsDeleted => {
        if (rowsDeleted > 0) {
            res.redirect('/minhas-roupas'); 
        } else {
            res.send('<h1>ERRO!</h1><p>Item não encontrado ou você não tem permissão para excluí-lo.</p><a href="/minhas-roupas">Voltar</a>');
        }
    })
    .catch(error => {
        console.error("ERRO AO EXCLUIR ITEM:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível excluir o item.</p>');
    });
});


export default router;