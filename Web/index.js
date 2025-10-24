// index.js

import express from "express";
import session from "express-session";
import flash from 'connect-flash';
import connection from "./config/sequelize-config.js";

// Iniciando o Express
const app = express();
const port = 8080; 

// =========================================================================
// === 1. IMPORTAÇÃO DOS MODELS E DAS ROTAS ===
// =========================================================================
import Usuario from './models/Usuario.js';
import Item from './models/Item.js';
import Troca from './models/Troca.js';
import usuarioRoutes from './routes/usuarioRoutes.js'; 
import itemRoutes from './routes/itemRoutes.js';       
import viewRoutes from './routes/viewRoutes.js';
import trocaRoutes from './routes/trocaRoutes.js';       

// =========================================================================
// 2. CONFIGURAÇÕES GERAIS (Middleware)
// =========================================================================

app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));

// Configuração da Sessão
app.use(session({
    secret: "qualquercoisasecreta12345", 
    resave: false, 
    saveUninitialized: false, 
    cookie: {
        maxAge: 3600000 
    }
}));

// CONFIGURAÇÃO DO FLASH
app.use(flash()); 

// Middleware para injetar 'messages' e 'userId' em todas as views
app.use((req, res, next) => {
    res.locals.messages = req.flash();
    res.locals.userId = req.session.userId || null;
    next();
});


// =========================================================================
// 3. FUNÇÃO DE INICIALIZAÇÃO DO BANCO DE DADOS
// =========================================================================

const initializeDatabase = async () => {
    try {
        await connection.authenticate();
        console.log("Conexão com o banco de dados realizada com sucesso!");
        
        await connection.query(`CREATE DATABASE IF NOT EXISTS RevesteKids;`);
        console.log("O banco de dados está criado (ou já existia).");

        await Usuario.sync({ force: false });
        console.log("Tabela 'usuarios' sincronizada e pronta para uso.");
        await Item.sync({ force: false });
        console.log("Tabela 'itens' sincronizada e pronta para uso.");
        await Troca.sync({ force: false }); 
        console.log("Tabela 'trocas' sincronizada e pronta para uso.");
        
    } catch (error) {
        console.error("Erro fatal na inicialização do banco de dados:", error);
        process.exit(1); 
    }
}


// =========================================================================
// 4. FUNÇÃO DE REGISTRO DE ROTAS
// =========================================================================

const registerRoutes = () => {
    // CORREÇÃO CRÍTICA: MOVE O usuarioRoutes PARA O TOPO
    // Isso garante que rotas como /configuracoes sejam verificadas antes de outras rotas genéricas.
    
    app.use('/', usuarioRoutes);  // Rota de Usuário (CRUD, /configuracoes) - PRIORIDADE 1
    app.use('/', viewRoutes);     // Rotas de views (ex: /login, /cadastro)
    app.use('/', itemRoutes);     // Rotas de Itens (CRUD)
    app.use('/', trocaRoutes);    // Rotas de Trocas 
    
    // =========================================================================
    // 5. TRATAMENTO DE ERRO: Rota não encontrada (404)
    // =========================================================================

    // Handler 404 (DEVE ser o ÚLTIMO middleware)
    app.use((req, res, next) => {
        res.status(404).render('404', { title: "Página não encontrada" });
    });
}


// =========================================================================
// 6. INÍCIO DA APLICAÇÃO
// =========================================================================

// Inicia o processo: Conecta, sincroniza e inicia o servidor
initializeDatabase().then(() => {
    
    // Registra as rotas e o handler 404 após o sucesso da conexão
    registerRoutes();
    
    // INICIA O SERVIDOR
    app.listen(port, function (error) {
        if (error) {
            console.log(`Não foi possível iniciar o servidor. Erro: ${error}`);
        } else {
            console.log(`Servidor iniciado com sucesso em http://localhost:${port} !`);
        }
    });
});