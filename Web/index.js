// index.js

import express from "express";
import connection from "./config/sequelize-config.js";
import Usuario from './models/Usuario.js';

// Iniciando o Express na variável app
const app = express();

// Configurando o express para permitir o recebimento de dados vindo de formulários
app.use(express.urlencoded({extended: false}));
// Se você for usar requisições POST para rotas mais específicas, é bom ter o json também:
app.use(express.json());

// Define o EJS como Renderizador de páginas
app.set("view engine", "ejs");
// Define o uso da pasta "public" para uso de arquivos estáticos
app.use(express.static("public"));

// Realizando a conexão com o banco de dados
connection.authenticate().then(() => {
    console.log("Conexão com o banco de dados realizada com sucesso!");
}).catch(error => {
    console.log(error);
});

// Criando o banco de dados (se ele ainda não existir)
connection.query(`CREATE DATABASE IF NOT EXISTS RevesteKids;`).then(() => {
    console.log("O banco de dados está criado.");
}).catch((error) => {
    console.log(error);
});


// =========================================================================
// ROTAS DE AÇÃO (CRUD - CREATE / READ ONE / UPDATE / DELETE)
// =========================================================================


app.post('/cadastro', (req, res) => {
    const dadosUsuario = req.body;     
    Usuario.create(dadosUsuario)
        .then(() => {
            res.redirect('/login'); 
        })
        .catch((error) => {
            console.error("ERRO NO CADASTRO:", error);
            res.send('<h1>ERRO!</h1><p>Houve um erro no cadastro. Tente outro email.</p><a href="/cadastro">Voltar</a>');
        });
});

app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    Usuario.findOne({ 
        where: { email: email }
    })
    .then(usuario => {
        if (usuario && usuario.senha === senha) {
            res.redirect('/dashboard');
        } else {
            res.send('<h1>Falha no Login</h1><p>E-mail ou senha incorretos.</p><a href="/login">Tentar Novamente</a>');
        }
    })
    .catch(error => {
        console.error("ERRO NO LOGIN:", error);
        res.send('<h1>ERRO!</h1><p>Houve um erro no login.</p>');
    });
});

// ROTA POST: Salva as alterações feitas pelo próprio usuário no Perfil (UPDATE Cliente)
app.post('/perfil/salvar', (req, res) => {
    
    // ATENÇÃO: Substitua '1' pela ID do usuário REALMENTE logado (req.session.usuarioId)
    const idUsuario = 3; 
    const novosDados = req.body; 

    Usuario.update(novosDados, {
        where: { id: idUsuario }
    })
    .then(() => {
        res.redirect('/perfil'); 
    })
    .catch(error => {
        console.error("ERRO AO SALVAR PERFIL:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível salvar as alterações do perfil.</p>');
    });
});


// READ ALL (Listar todos os usuários - Chamado por GET /usuarios)
app.get('/usuarios', (req, res) => {
    Usuario.findAll() 
        .then(usuarios => {
            res.render('listaUsuarios', {
                usuarios: usuarios
            });
        })
        .catch(error => {
            console.error("ERRO AO LISTAR USUÁRIOS:", error);
            res.send('<h1>ERRO!</h1><p>Não foi possível carregar a lista de usuários.</p>');
        });
});

// ROTA DE EXCLUSÃO (DELETE) - Adicionada do passo anterior
app.get('/usuarios/excluir/:id', (req, res) => {
    const idUsuario = req.params.id;
    Usuario.destroy({
        where: {
            id: idUsuario
        }
    })
    .then(() => {
        res.redirect('/usuarios'); 
    })
    .catch(error => {
        console.error("ERRO AO EXCLUIR USUÁRIO:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível excluir o usuário.</p><a href="/usuarios">Voltar para a Lista</a>');
    });
});

// ROTA GET: Apagar o próprio perfil (DELETE Cliente)
app.get('/perfil/apagar', (req, res) => {
    
    // ATENÇÃO: Substitua '1' pela ID do usuário REALMENTE logado (req.session.usuarioId)
    const idUsuario = 3; 

    Usuario.destroy({
        where: { id: idUsuario }
    })
    .then(() => {
        // Redireciona para a página de login/principal
        res.redirect('/login'); 
    })
    .catch(error => {
        console.error("ERRO AO DELETAR PERFIL:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível apagar o perfil.</p>');
    });
});

// ROTA DE ATUALIZAÇÃO (UPDATE) - Admin
app.get('/usuarios/editar/:id', (req, res) => {
    const idUsuario = req.params.id;
    Usuario.findByPk(idUsuario)
        .then(usuario => {
            if (usuario) {
                res.render('editarUsuario', {
                    usuario: usuario 
                });
            } else {
                res.redirect('/usuarios');
            }
        })
        .catch(error => {
            console.error("ERRO AO BUSCAR USUÁRIO PARA EDIÇÃO:", error);
            res.send('<h1>ERRO!</h1><p>Não foi possível carregar os dados para edição.</p>');
        });
}); 

app.post('/usuarios/editar/:id', (req, res) => {
    const idUsuario = req.params.id;
    const novosDados = req.body; 
    Usuario.update(novosDados, {
        where: {
            id: idUsuario
        }
    })
    .then(() => {
        res.redirect('/usuarios'); 
    })
    .catch(error => {
        console.error("ERRO AO ATUALIZAR USUÁRIO:", error);
        res.send('<h1>ERRO!</h1><p>Não foi possível salvar as alterações.</p><a href="/usuarios">Voltar para a Lista</a>');
    });
});


// =========================================================================
// ROTAS DE VIEW (GET) - Para mostrar as páginas
// =========================================================================

// ROTA GET para PÁGINA DE PERFIL (SOMENTE LEITURA)
app.get("/perfil", function (req, res) {
    
    // ATENÇÃO: Substitua '1' pela ID do usuário REALMENTE logado (req.session.usuarioId)
    const idUsuario = 3; 

    Usuario.findByPk(idUsuario) 
        .then(usuario => {
            if (usuario) {
                // Renderiza a view de leitura do perfil
                res.render('perfil', {
                    usuario: usuario
                });
            } else {
                res.redirect('/login');
            }
        })
        .catch(error => {
            console.error("ERRO AO CARREGAR PERFIL:", error);
            res.send('<h1>ERRO!</h1><p>Não foi possível carregar o perfil.</p>');
        });
});

// ROTA GET para ABRIR O FORMULÁRIO DE EDIÇÃO DO PERFIL (Cliente)
app.get("/perfil/editar", function (req, res) {
    
    // ATENÇÃO: Substitua '1' pela ID do usuário REALMENTE logado
    const idUsuario = 1; 

    Usuario.findByPk(idUsuario) 
        .then(usuario => {
            if (usuario) {
                // Renderiza a view 'editarPerfil.ejs' (o formulário)
                res.render('editarPerfil', {
                    usuario: usuario
                });
            } else {
                res.redirect('/login');
            }
        })
        .catch(error => {
            console.error("ERRO AO CARREGAR FORMULÁRIO DE EDIÇÃO DO PERFIL:", error);
            res.send('<h1>ERRO!</h1><p>Não foi possível carregar os dados para edição.</p>');
        });
});


// ROTA PRINCIPAL E ROTA DE LOGIN
app.get("/", function (req, res) {
    res.render("login"); // A página principal agora é o login
});
// Rota de Login separada (caso o usuário digite /login)
app.get("/login", function (req, res) {
    res.render("login");
});
// ROTA DE CADASTRO
app.get("/cadastro", function (req, res) {
    res.render("cadastro");
});
// ROTA DE SUCESSO APÓS LOGIN
app.get("/dashboard", function (req, res) {
    res.send("<h1>BEM-VINDO! Você está logado!</h1><p><a href='/usuarios'>Ir para Lista de Usuários</a></p>");
});

// =========================================================================
// INICIA O SERVIDOR (APÓS GARANTIR QUE O BANCO ESTÁ PRONTO)
// =========================================================================

const port = 8080;

// O Servidor SÓ deve iniciar depois que o banco de dados for criado 
// E a tabela for sincronizada.

// 1. Sincroniza o Model de Usuário com o Banco de Dados.
// O .sync() cria a tabela 'usuarios' se ela não existir.
Usuario.sync({ force: false }) 
.then(() => {
    // 2. Se a tabela foi criada com sucesso, inicia o servidor.
    app.listen(port, function (error) {
        if (error) {
            console.log(`Não foi possível iniciar o servidor. Erro: ${error}`);
        } else {
            console.log(`Servidor iniciado com sucesso em http://localhost:${port} !`);
            console.log("Tabela 'usuarios' sincronizada e pronta para uso.");
        }
    });
})
.catch((error) => {
    console.log("Erro ao sincronizar a tabela 'usuarios':", error);
});