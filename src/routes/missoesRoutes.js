// routes/missoesRoutes.js
const express = require("express");
const router = express.Router();
const missoesController = require("../controllers/MissoesController");
const { authMiddleware, requireParent } = require("../middlewares/auth");

router.use(authMiddleware);

router.post("/", requireParent, missoesController.createMission);
router.get("/", missoesController.listMissions);
router.patch("/:missionId/progress", missoesController.updateProgress);
router.put("/:missionId", requireParent, missoesController.updateMission);
router.delete("/:missionId", requireParent, missoesController.deleteMission);

module.exports = router;