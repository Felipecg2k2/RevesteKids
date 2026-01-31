import express from "express";
import * as itemController from "../controllers/itemController.js";
import { itemUpload } from "../config/multer.js";

const router = express.Router();

function requireLogin(req, res, next) {
    if (req.session.userId) {
        if (typeof req.session.userId === "string") {
            req.session.userId = parseInt(req.session.userId, 10);
        }
    }

    if (!req.session.userId || isNaN(req.session.userId)) {
        req.flash("error_msg", "Você precisa estar logado para acessar esta página.");
        return res.redirect("/login");
    }
    next();
}

router.use(requireLogin);

// ==========================================================
// ROTAS DE ITENS (CRUD)
// ==========================================================
// ROTA GET: LISTAR AS ROUPAS DO USUÁRIO LOGADO
router.get("/", itemController.getItensUsuario);

// ROTA GET: BUSCAR ITEM PARA EDIÇÃO
router.get("/editar/:id", itemController.getFormularioEdicao);

// ROTA POST: CRIA UM NOVO ITEM (CREATE)
router.post(
    "/salvar",
    itemUpload.array("imagens_upload", 5),
    itemController.salvarItem
);

// ROTA POST: ATUALIZA UM ITEM EXISTENTE (UPDATE)
router.post(
    "/salvar-edicao",
    itemUpload.array("imagens_upload", 5),
    itemController.salvarEdicao
);

// 🔥 NOVA ROTA: Cadastro via AJAX
router.post(
    "/salvar-ajax",
    itemUpload.array("imagens_upload", 5),
    itemController.salvarItemAjax
);

// ROTA GET: Exclui um item (DELETE)
router.get("/excluir/:id", itemController.excluirItem);

export default router;