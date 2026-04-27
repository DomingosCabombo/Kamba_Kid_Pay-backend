// routes/educationalRoutes.js
const express = require("express");
const router = express.Router();
const educationalController = require("../controllers/educationalController");
const { authMiddleware, requireChild } = require("../middlewares/auth");

router.use(authMiddleware, requireChild);

router.get("/", educationalController.listContent);
router.patch("/:contentId/complete", educationalController.completeContent);

// Rotas de Quiz para Crianças
router.get("/quiz/geral", educationalController.getGeneralQuizzes);
router.get("/quiz/:missaoId", educationalController.getQuizDetails);
router.post("/quiz/:quizId/submit", educationalController.submitQuiz);

module.exports = router;