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
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    
    // ATUALIZADO: Inclui links para o fluxo de trocas
    res.send("<h1>BEM-VINDO! Você está logado!</h1>" + 
             "<hr>" + 
             
             "<h2>Área de Trocas</h2>" +
             "<p><a href='/catalogo'>🔍 Explorar o Catálogo de Trocas</a></p>" +
             "<p><a href='/roupas'>📦 Minhas Roupas (Gerenciar Meus Itens)</a></p>" + 
             "<p><a href='/trocas/recebidas'>📥 Propostas de Troca Recebidas</a></p>" +
             "<p><a href='/trocas/enviadas'>📤 Propostas de Troca Enviadas</a></p>" +

             "<hr>" + 

             "<h2>Minha Conta</h2>" +
             "<p><a href='/perfil'>👤 Meu Perfil</a></p>" + 
             "<p><a href='/logout'>🚪 Fazer Logout</a></p>");
});

export default router;