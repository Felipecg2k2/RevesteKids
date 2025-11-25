// --- Imports e Configurações de Caminho (MANTENHA) ---
import express from "express";
import session from "express-session";
import flash from "connect-flash";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
global.APP_ROOT = __dirname;

import db from "./models/index.js";
const { Usuario, Item, Troca, sequelize } = db;
// --------------------------------------------------------


// --- Instância do App Express (MANTENHA) ---
const app = express();
// REMOVA: const port = 8080; (A Vercel define a porta)
// ------------------------------------------


// --- Configurações do App (MANTENHA) ---
app.set("Usuario", Usuario);
app.set("Item", Item);
app.set("Troca", Troca);
app.set("db", db);
app.set("sequelize", sequelize);

import usuarioRoutes from "./routes/usuarioRoutes.js";
import itemRoutes from "./routes/itemRoutes.js";
import viewRoutes from "./routes/viewRoutes.js";
import trocaRoutes from "./routes/trocaRoutes.js";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static(path.join(global.APP_ROOT, "public")));

app.use(
  session({
    secret: "qualquercoisasecreta12345",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 },
  })
);

app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  res.locals.userId = req.session.userId || null;
  next();
});
// -------------------------------------------


// --- Configuração das Rotas (MOVIDA PARA FORA DA PROMISE) ---
// É CRUCIAL que as rotas sejam definidas no app ANTES da exportação
app.use("/", viewRoutes);
app.use("/", usuarioRoutes);
app.use("/roupas", itemRoutes);
app.use("/trocas", trocaRoutes);

app.use((req, res, next) => {
  res.status(404).render("404", { title: "Página não encontrada" });
});
// -------------------------------------------------------------


// --- Lógica de Sincronização do DB (OPCIONAL/MELHOR PRÁTICA) ---
// Em Serverless, é melhor garantir que o DB esteja pronto ANTES do deploy.
// Colocar a sincronização aqui pode ser lento, mas faremos o mínimo para tentar funcionar:
sequelize
  .authenticate()
  .then(() => {
    // console.log("Conexão com o banco de dados realizada com sucesso!");
    return sequelize.query(`CREATE DATABASE IF NOT EXISTS RevesteKids;`);
  })
  .then(() => {
    // console.log("O banco de dados está criado (ou já existia).");
    return sequelize.sync({});
  })
  .then(() => {
    // console.log("Tabelas sincronizadas.");
  })
  .catch((error) => {
    console.error("Erro na sincronização do DB. Isso pode quebrar a função:", error);
    // Em produção Serverless, não devemos usar process.exit(1),
    // mas o erro deve ser capturado e tratado pelas rotas.
    // Manteremos assim por enquanto, mas se a conexão falhar, as rotas falharão.
  });
// -------------------------------------------------------------------


// --- EXPORTAÇÃO NECESSÁRIA PARA A VERCEL ---
// SUBSTITUI O app.listen().
export default app;