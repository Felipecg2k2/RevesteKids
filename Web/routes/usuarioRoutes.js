// routes/usuarioRoutes.js

import express from 'express';
import Usuario from '../models/Usuario.js'; // Importação relativa do Model
const router = express.Router();

// Middleware para proteger as rotas que exigem autenticação
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

// ==========================================================
// ROTAS DE AUTENTICAÇÃO (MANTIDAS SEM ALTERAÇÕES NA SENHA)
// ==========================================================

// ROTA POST: Cadastro de novo usuário
router.post('/cadastro', (req, res) => {
    const dadosUsuario = req.body; 
    Usuario.create(dadosUsuario)
        .then(() => {
            res.redirect('/login'); 
        })
        .catch((error) => {
            console.error("ERRO NO CADASTRO:", error);
            res.send('<h1>ERRO!</h1><p>Houve um erro no cadastro. Tente outro email.</p><a href="/cadastro">Voltar</a>');
        });
});

// ROTA POST: Login
router.post('/login', (req, res) => {
    const { email, senha } = req.body;
    Usuario.findOne({ 
        where: { email: email }
    })
    .then(usuario => {
        // Lógica de senha MANTIDA em texto puro, conforme solicitação
        if (usuario && usuario.senha === senha) {
            req.session.userId = usuario.id; 
            req.session.email = usuario.email; 
            
            res.redirect('/feed'); 
            
        } else {
            res.send('<h1>Falha no Login</h1><p>E-mail ou senha incorretos.</p><a href="/login">Tentar Novamente</a>');
        }
    })
    .catch(error => {
        console.error("ERRO NO LOGIN:", error);
        res.send('<h1>ERRO!</h1><p>Houve um erro no login.</p>');
    });
});

// ROTA GET: Logout (DESTRUIR SESSÃO)
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Erro ao fazer logout:", err);
            return res.send('<h1>Erro ao sair.</h1>');
        }
        res.redirect('/login');
    });
});

// ==========================================================
// CRUD DO PRÓPRIO PERFIL (CLIENTE)
// ==========================================================

// ROTA GET: PÁGINA DE PERFIL (READ ONE)
router.get("/perfil", requireLogin, function (req, res) { // Protegido
    const idUsuario = req.session.userId; 
    
    Usuario.findByPk(idUsuario) 
        .then(usuario => {
            if (usuario) {
                res.render('perfil', { usuario: usuario });
            } else {
                res.redirect('/login');
            }
        })
        .catch(error => {
            console.error("ERRO AO CARREGAR PERFIL:", error);
            res.send('<h1>ERRO!</h1><p>Não foi possível carregar o perfil.</p>');
        });
});

// ROTA GET: ABRIR FORMULÁRIO DE EDIÇÃO DO PERFIL
router.get("/perfil/editar", requireLogin, function (req, res) { 
    const idUsuario = req.session.userId; 
    
    // Assegure-se de que o Usuario está sendo importado corretamente
    Usuario.findByPk(idUsuario) 
        .then(usuario => {
            if (usuario) {
                // 'editarPerfil' deve ser o nome do seu arquivo EJS do formulário
                res.render('editarPerfil', { usuario: usuario }); 
            } else {
                res.redirect('/login');
            }
        })
        .catch(error => {
            console.error("ERRO AO CARREGAR FORMULÁRIO DE EDIÇÃO DO PERFIL:", error);
            res.send('<h1>ERRO!</h1><p>Não foi possível carregar os dados para edição.</p>');
        });
});

// ROTA POST: Salvar alterações no Perfil (UPDATE)
router.post('/perfil/salvar', requireLogin, (req, res) => { // Protegido
    const idUsuario = req.session.userId; 
    const novosDados = req.body; 
    
    // ATENÇÃO: Se a senha for alterada aqui, ainda será salva em texto puro.
    
    Usuario.update(novosDados, {
        where: { id: idUsuario }
    })
    .then(() => {
        res.redirect('/perfil'); 
    })
    .catch(error => {
        console.error("ERRO AO SALVAR PERFIL:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível salvar as alterações do perfil.</p>');
    });
});

// CORREÇÃO: ROTA POST: Apagar o próprio perfil (DELETE)
// Ação crítica deve usar POST e ser enviada por um formulário no front-end.
router.post('/perfil/apagar', requireLogin, (req, res) => { 
    const idUsuario = req.session.userId; 
    
    Usuario.destroy({
        where: { id: idUsuario }
    })
    .then(() => {
        req.session.destroy(); 
        res.redirect('/login'); 
    })
    .catch(error => {
        console.error("ERRO AO DELETAR PERFIL:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível apagar o perfil.</p>');
    });
});


// ==========================================================
// ROTAS DE CONFIGURAÇÕES E VISUALIZAÇÃO
// ==========================================================

// ROTA GET: PÁGINA DE CONFIGURAÇÕES
router.get("/configuracoes", requireLogin, (req, res) => {
    try {
        // Tente renderizar a view
        res.render('configuracoes', { title: "Configurações do Usuário" });
    } catch (error) {
        // Se a renderização falhar (ex: arquivo não encontrado), este bloco captura.
        console.error("ERRO CRÍTICO AO RENDERIZAR configuracoes.ejs:", error);
        
        // Exibe um erro de servidor 500 para que você veja a falha real no navegador
        return res.status(500).send(`
            <h1>ERRO 500 INTERNO</h1>
            <p>Falha ao renderizar a view 'configuracoes'.</p>
            <p>Verifique o terminal para o erro de caminho do arquivo .ejs.</p>
        `);
    }
});

export default router;