function getUsuarioModel(req) {
    return req.app.get('Usuario');
}
// ----------------------------------------------------------
// 1. FUNÇÕES DE AUTENTICAÇÃO
// ----------------------------------------------------------
// Lógica POST: Cadastro de novo usuário
export const cadastrarUsuario = async (req, res) => {
    const Usuario = getUsuarioModel(req);
    const dadosUsuario = req.body; 
    try {
        // Criar usuário no banco
        await Usuario.create(dadosUsuario);
        // Uso de flash para feedback
        req.flash('success_msg', 'Cadastro realizado com sucesso! Faça login.');
        res.redirect('/login'); 
    } catch (error) {
        console.error("ERRO NO CADASTRO:", error);
        req.flash('error_msg', 'Erro no cadastro. Tente outro e-mail.');
        res.redirect('/cadastro');
    }
};
// Lógica POST: Login
export const realizarLogin = async (req, res) => {
    const Usuario = getUsuarioModel(req);
    const { email, senha } = req.body;  
    try {
        const usuario = await Usuario.findOne({ 
            where: { email: email }
        });
        // Lógica de senha
        if (usuario && usuario.senha === senha) {
            req.session.userId = usuario.id; 
            req.session.email = usuario.email; 
            req.flash('success_msg', `Bem-vindo, ${usuario.nome}!`);
            res.redirect('/feed'); 
        } else {
            req.flash('error_msg', 'E-mail ou senha incorretos.');
            res.redirect('/login');
        }
    } catch (error) {
        console.error("ERRO NO LOGIN:", error);
        req.flash('error_msg', 'Houve um erro no login.');
        res.redirect('/login');
    }
};
// Lógica GET: Logout
export const realizarLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Erro ao fazer logout:", err);
            req.flash('error_msg', 'Erro ao tentar sair da sessão.');
            return res.redirect('/'); 
        }
        res.redirect('/login');
    });
};
// ----------------------------------------------------------
// 2. FUNÇÕES DE PERFIL E CRUD
// ----------------------------------------------------------
// Lógica GET: PÁGINA DE PERFIL (READ ONE)
export const getPerfil = async (req, res) => {
    const Usuario = getUsuarioModel(req);
    const idUsuario = req.session.userId; 
    try {
        const usuario = await Usuario.findByPk(idUsuario); 
        if (usuario) {
            res.render('perfil', { usuario: usuario });
        } else {
            req.flash('error_msg', 'Usuário não encontrado. Faça login novamente.');
            res.redirect('/login');
        }
    } catch (error) {
        console.error("ERRO AO CARREGAR PERFIL:", error);
        req.flash('error_msg', 'Não foi possível carregar o perfil.');
        res.redirect('/');
    }
};
// Lógica GET: ABRIR FORMULÁRIO DE EDIÇÃO DO PERFIL
export const getFormularioEdicaoPerfil = async (req, res) => {
    const Usuario = getUsuarioModel(req);
    const idUsuario = req.session.userId; 
    try {
        const usuario = await Usuario.findByPk(idUsuario); 
        if (usuario) {
            res.render('editarPerfil', { usuario: usuario }); 
        } else {
            req.flash('error_msg', 'Usuário não encontrado.');
            res.redirect('/login');
        }
    } catch (error) {
        console.error("ERRO AO CARREGAR FORMULÁRIO:", error);
        req.flash('error_msg', 'Não foi possível carregar os dados para edição.');
        res.redirect('/perfil');
    }
};
// Lógica POST: Salvar alterações no Perfil (UPDATE)
export const salvarEdicaoPerfil = async (req, res) => {
    const Usuario = getUsuarioModel(req);
    const idUsuario = req.session.userId; 
    const novosDados = req.body;   
    try {
        await Usuario.update(novosDados, {
            where: { id: idUsuario }
        });
        req.flash('success_msg', 'Perfil atualizado com sucesso!');
        res.redirect('/perfil'); 
    } catch (error) {
        console.error("ERRO AO SALVAR PERFIL:", error);
        req.flash('error_msg', 'Erro ao salvar as alterações do perfil.');
        res.redirect('/perfil/editar');
    }
};
// Lógica POST: Apagar o próprio perfil (DELETE)
export const deletarPerfil = async (req, res) => {
    const Usuario = req.app.get('Usuario');
    const idUsuario = req.session.userId; 
    try {
        await Usuario.destroy({
            where: { id: idUsuario }
        });
        // 2. DEFINIR O FLASH ANTES DE DESTRUIR A SESSÃO
        req.flash('success_msg', 'Sua conta foi deletada com sucesso. Sentiremos sua falta!');
        // 3. Destruir sessão e redirecionar
        req.session.destroy((err) => {
            if (err) {
                console.error("Erro ao destruir sessão após deleção de conta:", err);
                // Mesmo se falhar, o usuário foi deletado, então redirecionamos para o login.
            }
            res.redirect('/login'); 
        });
    } catch (error) {
        // Se a deleção no BD falhar (ex: Chave Estrangeira), o fluxo vem para cá.
        console.error("ERRO CRÍTICO AO DELETAR PERFIL (DB):", error.name, error.message); 
        req.flash('error_msg', 'Não foi possível apagar o perfil. Verifique se possui itens ativos ou trocas pendentes.');
        res.redirect('/perfil');
    }
};
// Lógica GET: PÁGINA DE CONFIGURAÇÕES (Não usa BD)
export const getConfiguracoes = (req, res) => {
    try {
        res.render('configuracoes', { title: "Configurações do Usuário" });
    } catch (error) {
        console.error("ERRO CRÍTICO AO RENDERIZAR configuracoes.ejs:", error);
        res.status(500).send(`<h1>ERRO 500 INTERNO</h1><p>Falha ao renderizar a view 'configuracoes'.</p>`);
    }
};