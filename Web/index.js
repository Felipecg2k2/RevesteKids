// index.js - CORRIGIDO PARA PARAR O ALTER TABLE EXCESSIVO

import express from "express";
import session from "express-session";
import flash from 'connect-flash';
import connection from "./config/sequelize-config.js";
import Sequelize from 'sequelize'; 


// =========================================================================
// 1. INICIALIZAÇÃO DA APLICAÇÃO E VARIÁVEIS GLOBAIS
// =========================================================================
const app = express();
const port = 8080; 

// =========================================================================
// 2. IMPORTAÇÃO DOS MODELS E DAS ROTAS (Models Primeiro!)
// (Garante que os modelos sejam carregados na instância de conexão antes de sync)
// =========================================================================
import Usuario from './models/Usuario.js';
import Item from './models/Item.js';
import Troca from './models/Troca.js';

import usuarioRoutes from './routes/usuarioRoutes.js'; 
import itemRoutes from './routes/itemRoutes.js';       
import viewRoutes from './routes/viewRoutes.js';
// NOTA: TrocaRoutes agora exporta as funções que itemRoutes precisa!
import trocaRoutes from './routes/trocaRoutes.js';       


// =========================================================================
// 3. CONFIGURAÇÕES GERAIS (Middleware)
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
        maxAge: 3600000 // 1 hora
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
        
        // CORREÇÃO APLICADA AQUI: Removido { alter: true } para parar os logs excessivos.
        // O padrão (sem parâmetros) é { force: false, alter: false }, que apenas cria o que falta.
        return connection.sync(); 
    }) 
    .then(() => {
        console.log("Todas as tabelas foram sincronizadas e estão prontas para uso.");

        // === REGISTRO DAS ROTAS MODULARIZADAS (DEPOIS DO DB SYNC) ===
        app.use('/', viewRoutes);
        app.use('/', usuarioRoutes);
        app.use('/', itemRoutes);
        app.use('/trocas', trocaRoutes); 
        // =========================================================

        // TRATAMENTO DE ERRO: Rota não encontrada (404)
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
        console.error("Erro fatal na inicialização (Verifique suas credenciais do DB e/ou o arquivo sequelize-config.js):", error);
        process.exit(1); 
    });

