// routes/usuarioRoutes.js

import express from 'express';
import Usuario from '../models/Usuario.js'; // Importação relativa do Model
const router = express.Router();

// ==========================================================
// ROTAS DE AUTENTICAÇÃO
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
        if (usuario && usuario.senha === senha) {
            req.session.userId = usuario.id; 
            req.session.email = usuario.email; 
            
            // CORRIGIDO: Redireciona para /feed (nova rota principal)
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
// OBS: Rota de Logout também existe em viewRoutes.js. Mantenha a versão mais completa.
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
router.get("/perfil", function (req, res) {
    const idUsuario = req.session.userId; 
    if (!idUsuario) {
        return res.redirect('/login');
    }
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
router.get("/perfil/editar", function (req, res) {
    const idUsuario = req.session.userId; 
    if (!idUsuario) {
        return res.redirect('/login');
    }
    Usuario.findByPk(idUsuario) 
        .then(usuario => {
            if (usuario) {
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
router.post('/perfil/salvar', (req, res) => {
    const idUsuario = req.session.userId; 
    if (!idUsuario) {
        return res.redirect('/login');
    }
    const novosDados = req.body; 
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

// ROTA GET: Apagar o próprio perfil (DELETE)
router.get('/perfil/apagar', (req, res) => {
    const idUsuario = req.session.userId; 
    if (!idUsuario) {
        return res.redirect('/login');
    }
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


export default router;