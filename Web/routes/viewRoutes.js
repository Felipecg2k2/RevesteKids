// routes/viewRoutes.js

import express from 'express';
const router = express.Router();

// ROTA PRINCIPAL E ROTA DE LOGIN
router.get("/", function (req, res) {
    res.render("login"); 
});

// Rota de Login separada (caso o usuário digite /login)
router.get("/login", function (req, res) {
    res.render("login");
});

// ROTA DE CADASTRO
router.get("/cadastro", function (req, res) {
    res.render("cadastro");
});

// ROTA DE SUCESSO APÓS LOGIN (DASHBOARD)
router.get("/dashboard", function (req, res) {
    res.send("<h1>BEM-VINDO! Você está logado!</h1><p><a href='/minhas-roupas'>Minhas Roupas (Trocas)</a></p><p><a href='/perfil'>Meu Perfil</a></p><p><a href='/logout'>Fazer Logout</a></p>");
});

export default router;