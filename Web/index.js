import express from "express";
import session from "express-session";
import connection from "./config/sequelize-config.js";

// === 1. IMPORTAÇÃO DOS MODELS E DAS ROTAS ===
import Usuario from './models/Usuario.js';
import Item from './models/Item.js';
import usuarioRoutes from './routes/usuarioRoutes.js'; // NOVO: Rotas de Usuário/Perfil
import itemRoutes from './routes/itemRoutes.js';       // NOVO: Rotas de Roupas/Itens
import viewRoutes from './routes/viewRoutes.js';       // NOVO: Rotas Simples de View/Dashboard

// Iniciando o Express
const app = express();
const port = 8080; 

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
        // Sincroniza o Model de Usuário
        return Usuario.sync({ force: false });
    })
    .then(() => {
        console.log("Tabela 'usuarios' sincronizada e pronta para uso.");
        // Sincroniza o Model Item
        return Item.sync({ force: false });
    })
    .then(() => {
        console.log("Tabela 'itens' sincronizada e pronta para uso.");

        // === REGISTRO DAS ROTAS MODULARIZADAS ===
        // O app.use() registra o router importado
        app.use('/', viewRoutes);
        app.use('/', usuarioRoutes);
        app.use('/', itemRoutes);
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