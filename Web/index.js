// index.js

// Troca de require() por import na linha do connect-flash
import express from "express";
import session from "express-session";
import flash from 'connect-flash'; // CORREÇÃO: Usando import
import connection from "./config/sequelize-config.js";
import Sequelize from 'sequelize'; // Importação que estava solta

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

// Configuração da Sessão (Você tinha duas, mantive a mais robusta)
app.use(session({
    secret: "qualquercoisasecreta12345", 
    resave: false, 
    saveUninitialized: false, 
    cookie: {
        maxAge: 3600000 
    }
}));

// CONFIGURAÇÃO DO FLASH (Agora req.flash() funcionará)
app.use(flash()); 

// Middleware para injetar 'messages' em todas as views
app.use((req, res, next) => {
    // res.locals são variáveis globais para o EJS
    res.locals.messages = req.flash();
    next();
});


// Bloco de verificação de Sequelize (Opcional, mas estava misturado no código)
if (Sequelize && Sequelize.Op) {
    console.log("SUCESSO: Sequelize e Op.ne estão importados corretamente!");
} else {
    console.error("FALHA: O objeto Sequelize não foi carregado corretamente na sua aplicação.");
}


// =========================================================================
// 3. CONEXÃO E USO DAS ROTAS
// =========================================================================

// Realizando a conexão com o banco de dados
connection.authenticate()
    .then(() => {
        console.log("Conexão com o banco de dados realizada com sucesso!");
        
        // Criando o banco de dados (se ele ainda não existir)
        return connection.query(`CREATE DATABASE IF NOT EXISTS RevesteKids;`);
    })
    .then(() => {
        console.log("O banco de dados está criado.");
        
        // Sincroniza os Models
        return Usuario.sync({ force: false });
    })
    .then(() => {
        console.log("Tabela 'usuarios' sincronizada e pronta para uso.");
        return Item.sync({ force: false });
    })
    .then(() => {
        console.log("Tabela 'itens' sincronizada e pronta para uso.");
        return Troca.sync({ force: false }); 
    }) 
    .then(() => {
        console.log("Tabela 'trocas' sincronizada e pronta para uso.");

        // === REGISTRO DAS ROTAS MODULARIZADAS ===
        app.use('/', viewRoutes);
        app.use('/', usuarioRoutes);
        app.use('/', itemRoutes);
        app.use('/', trocaRoutes);
        // ======================================

        // 4. INICIA O SERVIDOR
        app.listen(port, function (error) {
            if (error) {
                console.log(`Não foi possível iniciar o servidor. Erro: ${error}`);
            } else {
                console.log(`Servidor iniciado com sucesso em http://localhost:${port} !`);
            }
        });
    })
    .catch((error) => {
        console.log("Erro fatal na inicialização:", error);
    });