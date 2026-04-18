// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const { adminAuthMiddleware, requireSuperAdmin } = require("../middlewares/adminAuth");

// Auth
const adminAuthController = require("../controllers/adminAuthController");
router.post("/auth/login", adminAuthController.login);
router.get("/auth/me", adminAuthMiddleware, adminAuthController.me);

// Dashboard
const adminDashboardController = require("../controllers/adminDashboardController");
router.get("/dashboard", adminAuthMiddleware, adminDashboardController.dashboard);
router.get("/stats", adminAuthMiddleware, adminDashboardController.getStats);

// Analytics
const adminAnalyticsController = require("../controllers/adminAnalyticsController");
router.get("/analytics/comportamento", adminAuthMiddleware, adminAnalyticsController.analiseComportamento);
router.get("/analytics/ano-comparativo", adminAuthMiddleware, adminAnalyticsController.comparativoAnual);
router.get("/analytics/provincias", adminAuthMiddleware, adminAnalyticsController.rankingProvincias);
router.get("/analytics/municipios", adminAuthMiddleware, adminAnalyticsController.rankingMunicipios);
router.get("/analytics/faixa-etaria", adminAuthMiddleware, adminAnalyticsController.analiseFaixaEtaria);
router.get("/analytics/campanhas-populares", adminAuthMiddleware, adminAnalyticsController.campanhasPorRegiao);
router.get("/analytics/top-poupadores", adminAuthMiddleware, adminAnalyticsController.topPoupadores);
router.get("/analytics/top-gastadores", adminAuthMiddleware, adminAnalyticsController.topGastadores);
router.get("/analytics/top-doadores", adminAuthMiddleware, adminAnalyticsController.topDoadores);

// Utilizadores
const adminUtilizadoresController = require("../controllers/adminUtilizadoresController");
router.get("/utilizadores/responsaveis", adminAuthMiddleware, adminUtilizadoresController.listarResponsaveis);
router.get("/utilizadores/responsaveis/:id/dependentes", adminAuthMiddleware, adminUtilizadoresController.listarDependentes);
router.get("/utilizadores/criancas", adminAuthMiddleware, adminUtilizadoresController.listarCriancas);
router.get("/utilizadores/criancas/:id/responsavel", adminAuthMiddleware, adminUtilizadoresController.buscarResponsavel);
router.patch("/utilizadores/criancas/:id/status", adminAuthMiddleware, adminUtilizadoresController.alterarStatusCrianca);
router.delete("/utilizadores/responsaveis/:id", adminAuthMiddleware, adminUtilizadoresController.deletarResponsavel);
router.put("/utilizadores/responsaveis/:id", adminAuthMiddleware, adminUtilizadoresController.atualizarResponsavel);
router.patch("/utilizadores/responsaveis/:id/desativar", adminAuthMiddleware, adminUtilizadoresController.desativarResponsavel);
router.patch("/utilizadores/responsaveis/:id/ativar", adminAuthMiddleware, adminUtilizadoresController.ativarResponsavel);
router.delete("/utilizadores/criancas/:id", adminAuthMiddleware, adminUtilizadoresController.deletarCrianca);
router.put("/utilizadores/criancas/:id", adminAuthMiddleware, adminUtilizadoresController.atualizarCrianca);

// Tarefas
const adminTarefasController = require("../controllers/adminTarefasController");
router.get("/tarefas", adminAuthMiddleware, adminTarefasController.listarTarefas);
router.get("/tarefas/criancas/:criancaId", adminAuthMiddleware, adminTarefasController.listarTarefasPorCrianca);
router.get("/criancas/para-tarefas", adminAuthMiddleware, adminTarefasController.listarCriancasParaTarefas);  // ← NOVA
router.post("/tarefas", adminAuthMiddleware, adminTarefasController.criarTarefa);
router.put("/tarefas/:id", adminAuthMiddleware, adminTarefasController.atualizarTarefa);
router.delete("/tarefas/:id", adminAuthMiddleware, adminTarefasController.deletarTarefa);
router.patch("/tarefas/:id/status", adminAuthMiddleware, adminTarefasController.alterarStatusTarefa);

// Vídeos (Conteúdo)
const adminConteudoController = require("../controllers/adminConteudoController");
router.get("/videos", adminAuthMiddleware, adminConteudoController.listarConteudos);
router.get("/videos/estatisticas", adminAuthMiddleware, adminConteudoController.listarConteudosComViews);
router.post("/videos", adminAuthMiddleware, adminConteudoController.criarConteudo);
router.put("/videos/:id", adminAuthMiddleware, adminConteudoController.atualizarConteudo);
router.delete("/videos/:id", adminAuthMiddleware, adminConteudoController.deletarConteudo);

// Quizzes
const adminQuizController = require("../controllers/adminQuizController");
router.get("/quizzes", adminAuthMiddleware, adminQuizController.listarQuizzes);
router.post("/quizzes", adminAuthMiddleware, adminQuizController.criarQuiz);
router.put("/quizzes/:id", adminAuthMiddleware, adminQuizController.atualizarQuiz);
router.delete("/quizzes/:id", adminAuthMiddleware, adminQuizController.deletarQuiz);

// Campanhas
const adminCampanhasController = require("../controllers/adminCampanhasController");
router.get("/campanhas", adminAuthMiddleware, adminCampanhasController.listarCampanhas);
router.get("/campanhas/metricas", adminAuthMiddleware, adminCampanhasController.metricasCampanhas);
router.post("/campanhas", adminAuthMiddleware, adminCampanhasController.criarCampanha);
router.put("/campanhas/:id", adminAuthMiddleware, adminCampanhasController.atualizarCampanha);
router.patch("/campanhas/:id/status", adminAuthMiddleware, adminCampanhasController.alterarStatus);
router.delete("/campanhas/:id", adminAuthMiddleware, adminCampanhasController.deletarCampanha);

// Loja
const adminShopController = require("../controllers/adminShopController");
router.get("/shop/items", adminAuthMiddleware, adminShopController.listarItens);
router.post("/shop/items", adminAuthMiddleware, adminShopController.criarItem);
router.put("/shop/items/:id", adminAuthMiddleware, adminShopController.atualizarItem);
router.delete("/shop/items/:id", adminAuthMiddleware, adminShopController.deletarItem);

module.exports = router;