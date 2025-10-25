// index.js - CORRIGIDO PARA ROTEAMENTO E SINCRONIZAÇÃO DO DB

import express from "express";
import session from "express-session";
import flash from 'connect-flash';
import connection from "./config/sequelize-config.js";
// import Sequelize from 'sequelize'; // Sequilize não é usado diretamente aqui, pode ser removido


// =========================================================================
// 1. INICIALIZAÇÃO DA APLICAÇÃO E VARIÁVEIS GLOBAIS
// =========================================================================
const app = express();
const port = 8080; 

// =========================================================================
// 2. IMPORTAÇÃO DOS MODELS E DAS ROTAS (Models Primeiro!)
// =========================================================================
import Usuario from './models/Usuario.js';
import Item from './models/Item.js';
import Troca from './models/Troca.js';

import usuarioRoutes from './routes/usuarioRoutes.js'; 
import itemRoutes from './routes/itemRoutes.js';       
import viewRoutes from './routes/viewRoutes.js';
import trocaRoutes from './routes/trocaRoutes.js';       


// =========================================================================
// 3. CONFIGURAÇÕES GERAIS (Middleware)
// =========================================================================

app.use(express.urlencoded({extended: true})); // Melhor prática: use 'true' para objetos aninhados
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));

// Configuração da Sessão
app.use(session({
    secret: "qualquercoisasecreta12345", 
    resave: false, 
    saveUninitialized: false, 
    cookie: {
        maxAge: 3600000 // 1 hora
    }
}));

// CONFIGURAÇÃO DO FLASH
app.use(flash()); 

// Middleware para injetar 'messages' e 'userId' em todas as views
// Nota: Seu itemRoutes/viewRoutes também definem userId. Manter este aqui é seguro.
app.use((req, res, next) => {
    // Limpa o flash e injeta messages, mesmo que o middleware de rotas já faça isso
    res.locals.messages = req.flash();
    // Usa req.session.userId para views que não passam por rotas específicas
    res.locals.userId = req.session.userId || null;
    next();
});


// =========================================================================
// 4. CONEXÃO E INICIALIZAÇÃO DO BANCO DE DADOS (SEQUELIZE)
// =========================================================================

connection.authenticate()
    .then(() => {
        console.log("Conexão com o banco de dados realizada com sucesso!");
        
        // Tenta criar o banco de dados (se não existir)
        return connection.query(`CREATE DATABASE IF NOT EXISTS RevesteKids;`);
    })
    .then(() => {
        console.log("O banco de dados está criado (ou já existia).");
        
        // Sincroniza tabelas (cria o que falta, sem alterar colunas existentes)
        return connection.sync(); 
    }) 
    .then(() => {
        console.log("Todas as tabelas foram sincronizadas e estão prontas para uso.");

        // === REGISTRO DAS ROTAS MODULARIZADAS (CORREÇÃO APLICADA AQUI) ===
        
        // Rotas de Visualização Padrão (Feed, Login, Cadastro, Logout)
        app.use('/', viewRoutes);
        
        // Rotas de Autenticação/CRUD de Usuário
        app.use('/', usuarioRoutes); 
        
        // Rotas de Itens/Roupas (Montadas sob o prefixo '/roupas')
        app.use('/roupas', itemRoutes); // <-- CORRIGIDO AQUI!
        
        // Rotas de Trocas (Montadas sob o prefixo '/trocas')
        app.use('/trocas', trocaRoutes); 
        // =========================================================

        // TRATAMENTO DE ERRO: Rota não encontrada (404) - Deve ser o último app.use
        app.use((req, res, next) => {
            res.status(404).render('404', { title: "Página não encontrada" });
        });

        // 5. INICIA O SERVIDOR
        app.listen(port, function (error) {
            if (error) {
                console.log(`Não foi possível iniciar o servidor. Erro: ${error}`);
            } else {
                console.log(`Servidor iniciado com sucesso em http://localhost:${port} !`);
            }
        });
    })
    .catch((error) => {
        console.error("Erro fatal na inicialização:", error);
        process.exit(1); 
    });