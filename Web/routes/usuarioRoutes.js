import express from "express";
import * as usuarioController from "../controllers/usuarioController.js";
import { profileUpload, userCadastroUpload } from "../config/multer.js";

const router = express.Router();

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    req.flash(
      "error_msg",
      "Você precisa estar logado para acessar esta página."
    );
    return res.redirect("/login");
  }
  next();
}

// ==========================================================
// ROTAS DE AUTENTIZAÇÃO
// ==========================================================
// ROTA POST: Cadastro de novo usuário
router.post(
  "/cadastro",
  userCadastroUpload.single("foto_perfil_cadastro"),
  usuarioController.cadastrarUsuario
);

// ROTA POST: Login
router.post("/login", usuarioController.realizarLogin);
// ROTA GET: Logout (DESTRUIR SESSÃO)
router.get("/logout", usuarioController.realizarLogout);

// ==========================================================
// CRUD DO PRÓPRIO PERFIL (PROTEGIDAS)
// ==========================================================
// ROTA GET: PÁGINA DE PERFIL (READ ONE)
router.get("/perfil", requireLogin, usuarioController.getPerfil);
// ROTA GET: ABRIR FORMULÁRIO DE EDIÇÃO DO PERFIL
router.get(
  "/perfil/editar",
  requireLogin,
  usuarioController.getFormularioEdicaoPerfil
);

// ROTA POST: Salvar alterações no Perfil (UPDATE)
router.post(
  "/perfil/salvar",
  requireLogin,
  profileUpload.single("foto_perfil_update"),
  usuarioController.salvarEdicaoPerfil
);

// ROTA POST: Apagar o próprio perfil (DELETE)
router.post("/perfil/apagar", requireLogin, usuarioController.deletarPerfil);
// ROTA GET: PÁGINA DE CONFIGURAÇÕES
router.get("/configuracoes", requireLogin, usuarioController.getConfiguracoes);

export default router;
