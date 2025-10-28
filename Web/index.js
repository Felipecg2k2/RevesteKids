

import express from "express";
import session from "express-session";
import flash from 'connect-flash';
import path from 'path'; 
import { fileURLToPath } from 'url'; 
import { dirname } from 'path'; 







const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 
global.APP_ROOT = __dirname; 


import db from './models/index.js'; 
const { Item, Usuario, Troca, Imagem, sequelize } = db; 


const app = express();
const port = 8080;


app.set('Usuario', Usuario);
app.set('Item', Item);
app.set('Troca', Troca);
app.set('db', db); 
app.set('sequelize', sequelize); 



import usuarioRoutes from './routes/usuarioRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import viewRoutes from './routes/viewRoutes.js';
import trocaRoutes from './routes/trocaRoutes.js';


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");

app.use(express.static(path.join(global.APP_ROOT, 'public'))); 

app.use(session({
        secret: "qualquercoisasecreta12345",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 3600000 } 
}));

app.use(flash());
app.use((req, res, next) => {
        
        res.locals.messages = req.flash();
        
        res.locals.userId = req.session.userId || null;
        next();
});


sequelize.authenticate().then(() => {
        console.log("Conexão com o banco de dados realizada com sucesso!");
        
        return sequelize.query(`CREATE DATABASE IF NOT EXISTS RevesteKids;`);
}).then(() => {
        console.log("O banco de dados está criado (ou já existia).");
        
        return sequelize.sync({})
}).then(() => {
        console.log("Todas as tabelas foram sincronizadas e estão prontas para uso.");
        
        app.use('/', viewRoutes);
        app.use('/', usuarioRoutes);
        app.use('/roupas', itemRoutes);
        app.use('/trocas', trocaRoutes);
        
        app.use((req, res, next) => {
                res.status(404).render('404', { title: "Página não encontrada" });
        });

        
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