const NotificacaoGlobal = require("../models/NotificacaoGlobal");
const LogAdmin = require("../../src/models/LogAdmin");
const Responsavel = require("../../src/models/Responsavel");
const Criancas = require("../../src/models/Criancas");

// ============================================
// GET /api/admin/notificacoes
// ============================================
exports.listarNotificacoes = async (req, res) => {
    try {
        const notificacoes = await NotificacaoGlobal.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json({ total: notificacoes.length, notificacoes });
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// POST /api/admin/notificacoes
// ============================================
exports.criarNotificacao = async (req, res) => {
    try {
        const { titulo, mensagem, tipo, publico_alvo } = req.body;

        const notificacao = await NotificacaoGlobal.create({
            titulo, mensagem, tipo, publico_alvo,
            enviada_em: new Date()
        });

        // Aqui você pode integrar com Firebase Cloud Messaging ou WebSockets
        // para enviar notificações em tempo real

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "ENVIAR",
            entidade: "notificacao",
            id_entidade: notificacao.id_notificacao,
            detalhes: JSON.stringify({ titulo, publico_alvo })
        });

        res.status(201).json(notificacao);
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// DELETE /api/admin/notificacoes/:id
// ============================================
exports.deletarNotificacao = async (req, res) => {
    try {
        const { id } = req.params;
        await NotificacaoGlobal.destroy({ where: { id_notificacao: id } });
        res.json({ mensagem: "Notificação removida" });
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};
