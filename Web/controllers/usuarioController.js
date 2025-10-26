// controllers/usuarioController.js

// ----------------------------------------------------------
// Importações Necessárias (Módulos nativos Node.js)
import fs from 'fs/promises'; // Módulo para manipulação de arquivos assíncrona
import path from 'path'; // Módulo para manipulação de caminhos
// ----------------------------------------------------------
// Importações de Módulos (Se necessário, ajuste conforme sua estrutura)
// import bcrypt from 'bcryptjs'; // Módulo para hash de senha (Recomendado, mas mantendo o seu padrão)
// ----------------------------------------------------------

// Constantes úteis (Ajuste o nome da imagem padrão se for diferente)
const DEFAULT_USER_IMAGE = 'default-user.png'; 

function getUsuarioModel(req) {
    // Esta função deve retornar o modelo de usuário para interação com o BD
    return req.app.get('Usuario');
}

// ----------------------------------------------------------
// FUNÇÃO AUXILIAR: Deleta a foto antiga do disco (Assíncrona)
// ----------------------------------------------------------
async function deletarFotoAntigaAsync(nomeFotoAntiga, diretorioUpload) {
    // Verifica se a foto a ser deletada existe e não é a foto padrão
    if (nomeFotoAntiga && nomeFotoAntiga !== DEFAULT_USER_IMAGE) {
        const caminhoArquivo = path.join(diretorioUpload, nomeFotoAntiga);
        
        try {
            // Verifica se o arquivo existe antes de tentar deletar
            await fs.access(caminhoArquivo, fs.constants.F_OK);
            await fs.unlink(caminhoArquivo); 
            console.log(`[PERFIL] Foto antiga deletada: ${nomeFotoAntiga}`);
        } catch (err) {
            // Se o erro for que o arquivo não existe (ENOENT), apenas ignora.
            if (err.code !== 'ENOENT') { 
                console.error(`[PERFIL] Erro ao deletar a foto antiga ${nomeFotoAntiga}:`, err);
            }
        }
    }
}

// ----------------------------------------------------------
// 1. FUNÇÕES DE AUTENTICAÇÃO
// ----------------------------------------------------------
// Lógica POST: Cadastro de novo usuário
export const cadastrarUsuario = async (req, res) => {
    const Usuario = getUsuarioModel(req);
    const dadosUsuario = req.body; 
    const arquivoFotoTemp = req.file; 

    if (arquivoFotoTemp) {
        dadosUsuario.foto_perfil = arquivoFotoTemp.filename; 
    }
    
    let usuarioCriado;
    try {
        usuarioCriado = await Usuario.create(dadosUsuario);

        if (arquivoFotoTemp && usuarioCriado && usuarioCriado.id) {
            
            const oldPath = arquivoFotoTemp.path; 
            const ext = path.extname(arquivoFotoTemp.filename);
            const novoNome = `profile-${usuarioCriado.id}${ext}`;
            
            const newPath = path.join(path.dirname(oldPath), novoNome); 
            
            await fs.rename(oldPath, newPath);

            await Usuario.update(
                { foto_perfil: novoNome },
                { where: { id: usuarioCriado.id } }
            );
        }

        req.flash('success_msg', 'Cadastro realizado com sucesso! Faça login.');
        res.redirect('/login'); 
        
    } catch (error) {
        console.error("ERRO NO CADASTRO:", error);

        if (arquivoFotoTemp) {
             try {
                await fs.unlink(arquivoFotoTemp.path); 
                console.log(`Arquivo temporário ${arquivoFotoTemp.filename} deletado após falha.`);
             } catch (unlinkError) {
                console.error("Erro ao deletar arquivo temporário:", unlinkError);
             }
        }
        
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
        
        if (usuario && usuario.senha === senha) {
            req.session.userId = usuario.id; 
            // Armazena o objeto de usuário completo na sessão para acesso fácil
            req.session.usuario = usuario.get({ plain: true }); 
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
            res.render('perfil', { usuario: usuario.get({ plain: true }) });
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
            res.render('editarPerfil', { usuario: usuario.get({ plain: true }) }); 
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


// Lógica POST: Salvar alterações no Perfil (UPDATE) - IMPLEMENTAÇÃO CORRIGIDA
export const salvarEdicaoPerfil = async (req, res) => {
    const Usuario = getUsuarioModel(req);
    const idUsuario = req.session.userId; 
    const novosDados = req.body; 
    const arquivoFotoTemp = req.file; 
    
    try {
        // 1. BUSCA O USUÁRIO ATUAL para obter o nome da foto antiga
        const usuarioAtual = await Usuario.findByPk(idUsuario);
        if (!usuarioAtual) {
            req.flash('error_msg', 'Usuário não encontrado.');
            return res.redirect('/perfil');
        }
        
        // Define o diretório de uploads com base no caminho do arquivo temporário do Multer
        const diretorioUpload = arquivoFotoTemp ? path.dirname(arquivoFotoTemp.path) : path.join(process.cwd(), 'public', 'uploads', 'perfis');
        
        // 2. LÓGICA DE UPLOAD E ATUALIZAÇÃO DA FOTO
        if (arquivoFotoTemp) {
            // 2.1. DELETA A FOTO ANTIGA
            await deletarFotoAntigaAsync(usuarioAtual.foto_perfil, diretorioUpload); 
            
            // 2.2. RENOMEIA O NOVO ARQUIVO
            const ext = path.extname(arquivoFotoTemp.filename);
            const novoNomeFoto = `profile-${idUsuario}${ext}`;
            
            const oldPath = arquivoFotoTemp.path;
            const newPath = path.join(diretorioUpload, novoNomeFoto);
            
            await fs.rename(oldPath, newPath);
            
            novosDados.foto_perfil = novoNomeFoto; // Atualiza o nome da foto nos dados
            
        } 
        
        // 3. LÓGICA DE REMOÇÃO DA FOTO (Se você tiver um checkbox "Remover Foto")
        if (novosDados.remover_foto === 'on') {
            await deletarFotoAntigaAsync(usuarioAtual.foto_perfil, diretorioUpload);
            novosDados.foto_perfil = DEFAULT_USER_IMAGE;
        } else if (!arquivoFotoTemp) {
             // Garante que se nenhuma foto foi enviada E o checkbox de remover não foi marcado,
             // o campo foto_perfil NÃO seja sobrescrito com um valor vazio/null do req.body.
             delete novosDados.foto_perfil;
        }

        // 4. ATUALIZA O BANCO DE DADOS
        const [numLinhasAtualizadas] = await Usuario.update(novosDados, {
            where: { id: idUsuario }
        });
        
        // 5. ATUALIZA A SESSÃO
        const usuarioAtualizado = await Usuario.findByPk(idUsuario);
        req.session.usuario = usuarioAtualizado.get({ plain: true }); 

        req.flash('success_msg', 'Perfil atualizado com sucesso!');
        res.redirect('/perfil'); 
        
    } catch (error) {
        console.error("ERRO AO SALVAR PERFIL:", error);

        // Se a renomeação falhar, deleta o arquivo temporário
        if (arquivoFotoTemp) {
            try {
                await fs.unlink(arquivoFotoTemp.path);
            } catch (e) {
                console.error("Falha ao deletar arquivo temporário após erro:", e);
            }
        }
        req.flash('error_msg', 'Erro ao salvar as alterações do perfil. Verifique os dados.');
        res.redirect('/perfil/editar');
    }
};

// Lógica POST: Apagar o próprio perfil (DELETE)
export const deletarPerfil = async (req, res) => {
    const Usuario = getUsuarioModel(req);
    const idUsuario = req.session.userId; 
    try {
        const usuario = await Usuario.findByPk(idUsuario);
        if (usuario) {
            // OPCIONAL: Lógica para deletar a foto do disco antes de deletar o usuário
            const diretorioUpload = path.join(process.cwd(), 'public', 'uploads', 'perfis');
            await deletarFotoAntigaAsync(usuario.foto_perfil, diretorioUpload);
        }

        await Usuario.destroy({
            where: { id: idUsuario }
        });
        
        req.flash('success_msg', 'Sua conta foi deletada com sucesso. Sentiremos sua falta!');
        req.session.destroy((err) => {
            if (err) {
                console.error("Erro ao destruir sessão após deleção de conta:", err);
            }
            res.redirect('/login'); 
        });
    } catch (error) {
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

// OBSOLETA: Não é mais necessária, a lógica foi movida para salvarEdicaoPerfil
// export const uploadFoto = async (req, res) => { ... };