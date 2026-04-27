// routes/mascoteRoutes.js
const express = require("express");
const router = express.Router();
const mascoteController = require("../controllers/mascoteController");
const { authMiddleware, requireChild } = require("../middlewares/auth");

router.use(authMiddleware, requireChild);

// GET /api/mascotes — lista todos com status da criança logada
router.get("/", mascoteController.listMascotes);

// POST /api/mascotes/:id/comprar — compra e desbloqueia um mascote
router.post("/:id/comprar", mascoteController.comprarMascote);

// PATCH /api/mascotes/:id/ativar — muda mascote activo
router.patch("/:id/ativar", mascoteController.ativarMascote);

module.exports = router;
