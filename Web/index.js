// index.js

import express from "express";
import session from "express-session";
import flash from 'connect-flash';
import connection from "./config/sequelize-config.js";
// import Sequelize from 'sequelize'; // REMOVIDO: A importação completa do Sequelize não é necessária aqui, apenas o objeto 'connection' e os Models.

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
    // res.locals são variáveis globais para o EJS
    res.locals.messages = req.flash();
    // Injete a userId na sessão para uso fácil no template
    res.locals.userId = req.session.userId || null;
    next();
});


// Bloco de verificação de Sequelize (Mantido, mas menos crítico agora que a importação foi removida)
/* if (Sequelize && Sequelize.Op) {
    console.log("SUCESSO: Sequelize e Op.ne estão importados corretamente!");
} else {
    console.error("FALHA: O objeto Sequelize não foi carregado corretamente na sua aplicação.");
}
*/


// =========================================================================
// 3. CONEXÃO E USO DAS ROTAS
// =========================================================================

// Realizando a conexão com o banco de dados
connection.authenticate()
    .then(() => {
        console.log("Conexão com o banco de dados realizada com sucesso!");
        
        // Criando o banco de dados (se ele ainda não existir)
        // NOTA: A criação do DB deve ser feita fora da Promise se a string de conexão já estiver apontando para o DB.
        // Se a string de conexão apontar para o MySQL sem DB, esta linha está correta.
        return connection.query(`CREATE DATABASE IF NOT EXISTS RevesteKids;`);
    })
    .then(() => {
        console.log("O banco de dados está criado (ou já existia).");
        
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
        // NOTA: Se todas as rotas usam prefixo '/' (raiz), está OK. 
        // Se, por exemplo, 'trocaRoutes' só tem rotas tipo '/recebidas', o '/trocas' na linha abaixo não é necessário, mas é uma boa prática.
        app.use('/', viewRoutes);
        app.use('/', usuarioRoutes);
        app.use('/', itemRoutes);
        app.use('/trocas', trocaRoutes); 
        // ======================================

        // TRATAMENTO DE ERRO: Rota não encontrada (404)
        app.use((req, res, next) => {
            res.status(404).render('404', { title: "Página não encontrada" }); // Melhor renderizar uma view 404.ejs
        });

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