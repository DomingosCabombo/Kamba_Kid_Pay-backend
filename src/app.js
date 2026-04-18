// app.js
const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors")

// Importar rotas
const authRoutes = require("./routes/authRoutes");
const parentRoutes = require("./routes/parentRoutes");
const childRoutes = require("./routes/childRoutes");
const tarefasRoutes = require("./routes/tarefasRoutes");
const missoesRoutes = require("./routes/missoesRoutes");
const campanhaRoutes = require("./routes/campanhaRoutes");
const financeiroRoutes = require("./routes/accaofinanceiraRoutes");
const shopRoutes = require("./routes/shopRoutes");
const educationalRoutes = require("./routes/educationalRoutes");
const relatoriosRoutes = require("./routes/relatoriosRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors())
// Rota de health check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
});

app.use(express.static(path.join(__dirname, "public")));

// Arquivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads2", express.static(path.join(__dirname, "uploads2")));
app.use("/uploadCampanhas", express.static(path.join(__dirname, "uploadCampanhas")));

// Rotas - todas prefixadas com /api
app.use("/api/auth", authRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/child", childRoutes);
app.use("/api/tasks", tarefasRoutes);
app.use("/api/missions", missoesRoutes);
app.use("/api/campaigns", campanhaRoutes);
app.use("/api/financeiro", financeiroRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/educational-content", educationalRoutes);
app.use("/api/reports", relatoriosRoutes);
app.use("/api/admin", adminRoutes);


module.exports = app;