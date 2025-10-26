// Web/index.js

import express from "express";
import session from "express-session";
import flash from 'connect-flash';
import path from 'path'; // <--- NOVO: Importe path
import { fileURLToPath } from 'url'; // <--- NOVO: Importe utilitários para ES Modules
import { dirname } from 'path'; // <--- NOVO: Importe utilitários para ES Modules
// REMOVIDO: import connection from "./config/sequelize-config.js";


// =========================================================================
// FIX CRUCIAL: DEFINIÇÃO DO DIRETÓRIO RAIZ DA APLICAÇÃO (Web/)
// =========================================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // __dirname agora é o caminho absoluto para 'Web/'
global.APP_ROOT = __dirname; // Define o caminho absoluto para a pasta 'Web' globalmente

// =========================================================================
// 1. IMPORTAÇÃO DO DB CENTRALIZADO E DESESTRUTURAÇÃO
// =========================================================================
import db from './models/index.js'; // IMPORTAÇÃO CRÍTICA DO DB CENTRALIZADO
const { Item, Usuario, Troca, Imagem, sequelize } = db; // Desestrutura Models e a instância do Sequelize

// =========================================================================
// 2. INICIALIZAÇÃO DA APLICAÇÃO E VARIÁVEIS GLOBAIS
// =========================================================================
const app = express();
const port = 8080;

// Configuração dos Models no app.set para fácil acesso em Controllers/Rotas
app.set('Usuario', Usuario);
app.set('Item', Item);
app.set('Troca', Troca);
app.set('db', db); // Adiciona o objeto DB completo
app.set('sequelize', sequelize); // Adiciona a instância da conexão

// =========================================================================
// 3. IMPORTAÇÃO DAS ROTAS
// =========================================================================
import usuarioRoutes from './routes/usuarioRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import viewRoutes from './routes/viewRoutes.js';
import trocaRoutes from './routes/trocaRoutes.js';

// =========================================================================
// 4. CONFIGURAÇÕES GERAIS (Middleware)
// =========================================================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
// app.use(express.static("public")); // ESTE AINDA ESTÁ TECNICAMENTE CORRETO, MAS VAMOS DEIXAR MAIS EXPLÍCITO
app.use(express.static(path.join(global.APP_ROOT, 'public'))); // Uso explícito do caminho resolvido
// Configuração da Sessão
app.use(session({
        secret: "qualquercoisasecreta12345",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 3600000 } // 1 hora
}));
// CONFIGURAÇÃO DO FLASH
app.use(flash());
app.use((req, res, next) => {
        // Limpa o flash e injeta messages
        res.locals.messages = req.flash();
        // Usa req.session.userId para views que não passam por rotas específicas
        res.locals.userId = req.session.userId || null;
        next();
});

// =========================================================================
// 5. CONEXÃO E INICIALIZAÇÃO DO BANCO DE DADOS (SEQUELIZE)
// =========================================================================
sequelize.authenticate().then(() => {
        console.log("Conexão com o banco de dados realizada com sucesso!");
        // Tenta criar o banco de dados (se não existir)
        return sequelize.query(`CREATE DATABASE IF NOT EXISTS RevesteKids;`);
}).then(() => {
        console.log("O banco de dados está criado (ou já existia).");
        // Sincroniza as tabelas. Usamos 'sequelize' do objeto 'db'.
        // REMOVIDO: { alter: true } conforme solicitado, já que as tabelas foram criadas.
        return sequelize.sync({})
}).then(() => {
        console.log("Todas as tabelas foram sincronizadas e estão prontas para uso.");
        // === REGISTRO DAS ROTAS MODULARIZADAS ===
        app.use('/', viewRoutes);
        app.use('/', usuarioRoutes);
        app.use('/roupas', itemRoutes);
        app.use('/trocas', trocaRoutes);
        // TRATAMENTO DE ERRO: Rota não encontrada (404)
        app.use((req, res, next) => {
                res.status(404).render('404', { title: "Página não encontrada" });
        });

        // =========================================================================
        // 6. INICIA O SERVIDOR
        // =========================================================================
        app.listen(port, function (error) {
                if (error) {
                        console.log(`Não foi possível iniciar o servidor. Erro: ${error}`);
                } else {
                        console.log(`Servidor iniciado com sucesso em http://localhost:${port} !`);
                }
        });
}).catch((error) => {
        console.error("Erro fatal na inicialização:", error);
        process.exit(1);
});