// routes/childRoutes.js
const express = require("express");
const router = express.Router();
const childController = require("../controllers/childController");
const childQuizController = require("../controllers/childQuizController");
const { authMiddleware, requireChild } = require("../middlewares/auth");
const {upload} = require("../middlewares/upload");

// Todas as rotas de criança exigem autenticação e permissão
router.use(authMiddleware, requireChild);

router.get("/dashboard", childController.dashboard);
router.get("/tasks", childController.listTasks);
router.patch("/tasks/:taskId/submit", authMiddleware, upload.single("foto"), childController.submitTask);
router.get("/missions", childController.listMissions);
router.post("/donations", childController.donate);
router.put("/avatar", childController.updateAvatar);
router.get("/quiz/:id_missao", authMiddleware, requireChild, childQuizController.buscarQuiz);
router.post("/quiz/:id_missao/responder", authMiddleware, requireChild, childQuizController.responderQuiz);


module.exports = router;