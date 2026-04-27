// controllers/mascoteController.js
const Mascote = require("../models/Mascote");
const CriancaMascote = require("../models/CriancaMascote");
const Criancas = require("../models/Criancas");
const Historico = require("../models/HistoricoTransacao");
const sequelize = require("../config/database");

// Helper: parse JSON array or return default
const parseMessages = (raw, fallback) => {
    try {
        if (!raw) return fallback;
        if (typeof raw === 'string') return JSON.parse(raw);
        return raw; 
    }
    catch { return fallback; }
};

const formatMascote = (m, desbloqueado, ativo) => ({
    id: m.id_mascote,
    nome: m.nome,
    tagline: m.tagline,
    descricao: m.descricao,
    tipo: m.tipo,
    emoji: m.emoji,
    bg_color: m.bg_color,
    preco: m.preco, // Preço agora em XP
    ativo,
    desbloqueado,
    messages: {
        correct: parseMessages(m.msg_correct, ["Muito bem! 🎉"]),
        wrong: parseMessages(m.msg_wrong, ["Quase lá! 💪"]),
        greeting: parseMessages(m.msg_greeting, ["Olá! 😊"]),
        drag: parseMessages(m.msg_drag, ["Arrasta a resposta! 🤔"]),
    }
});

// GET /api/mascotes  — lista todos com status da criança
exports.listMascotes = async (req, res) => {
    try {
        const criancaId = req.usuario.id;

        const [mascotes, criancaMascotes] = await Promise.all([
            Mascote.findAll({ where: { ativo: true }, order: [['ordem', 'ASC'], ['preco', 'ASC']] }),
            CriancaMascote.findAll({ where: { id_crianca: criancaId } })
        ]);

        const desbloqueadosMap = new Map();
        let mascoteAtivoId = null;

        for (const cm of criancaMascotes) {
            desbloqueadosMap.set(cm.id_mascote, true);
            if (cm.ativo) mascoteAtivoId = cm.id_mascote;
        }

        res.json({
            mascotes: mascotes.map(m => formatMascote(
                m,
                m.preco === 0 || desbloqueadosMap.has(m.id_mascote),
                m.id_mascote === mascoteAtivoId
            )),
            mascote_ativo_id: mascoteAtivoId
        });

    } catch (error) {
        console.error("listMascotes error:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// POST /api/mascotes/:id/comprar — compra e desbloqueia USANDO XP
exports.comprarMascote = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const criancaId = req.usuario.id;
        const mascoteId = parseInt(req.params.id);

        const [crianca, mascote] = await Promise.all([
            Criancas.findByPk(criancaId, { transaction }),
            Mascote.findByPk(mascoteId, { transaction })
        ]);

        if (!mascote || !mascote.ativo) {
            await transaction.rollback();
            return res.status(404).json({ erro: "MASCOTE_NAO_ENCONTRADO" });
        }

        // Check already owned
        const jaComprou = await CriancaMascote.findOne({
            where: { id_crianca: criancaId, id_mascote: mascoteId },
            transaction
        });
        if (jaComprou) {
            await transaction.rollback();
            return res.status(400).json({ erro: "JA_POSSUI", mensagem: "Já tens este mascote!" });
        }

        // Check XP balance
        if (mascote.preco > 0) {
            if (crianca.xp < mascote.preco) {
                await transaction.rollback();
                return res.status(400).json({ erro: "XP_INSUFICIENTE", mensagem: `Precisas de ${mascote.preco} XP para este mascote.` });
            }

            // Deduct XP
            const novoXP = crianca.xp - mascote.preco;
            const novoNivel = Math.floor(novoXP / 100) + 1;
            await crianca.update({ xp: novoXP, nivel: novoNivel }, { transaction });

            // Registrar no histórico de transações? 
            // HistoricoTransacao é para dinheiro real/virtual, talvez criar um histórico de XP no futuro.
            // Por enquanto, apenas atualizamos a criança.
        }

        // Unlock mascot (set as active too)
        await CriancaMascote.update(
            { ativo: false },
            { where: { id_crianca: criancaId, ativo: true }, transaction }
        );

        await CriancaMascote.create({
            id_crianca: criancaId,
            id_mascote: mascoteId,
            ativo: true
        }, { transaction });

        await transaction.commit();

        res.json({
            mensagem: "Mascote desbloqueado com XP!",
            mascote: formatMascote(mascote, true, true),
            xp_restante: crianca.xp - mascote.preco
        });

    } catch (error) {
        await transaction.rollback();
        console.error("comprarMascote error:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// PATCH /api/mascotes/:id/ativar — muda mascote activo
exports.ativarMascote = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const criancaId = req.usuario.id;
        const mascoteId = parseInt(req.params.id);

        const mascote = await Mascote.findByPk(mascoteId);
        if (!mascote) {
            await transaction.rollback();
            return res.status(404).json({ erro: "MASCOTE_NAO_ENCONTRADO" });
        }

        const possuiOuGratis = mascote.preco === 0 || await CriancaMascote.findOne({
            where: { id_crianca: criancaId, id_mascote: mascoteId }
        });

        if (!possuiOuGratis) {
            await transaction.rollback();
            return res.status(403).json({ erro: "SEM_PERMISSAO", mensagem: "Ainda não tens este mascote." });
        }

        await CriancaMascote.update({ ativo: false }, { where: { id_crianca: criancaId }, transaction });

        await CriancaMascote.upsert({
            id_crianca: criancaId,
            id_mascote: mascoteId,
            ativo: true,
            adquirido_em: new Date()
        }, { transaction });

        await transaction.commit();
        res.json({ mensagem: "Mascote activado!", id_mascote: mascoteId });

    } catch (error) {
        await transaction.rollback();
        console.error("ativarMascote error:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// ADMIN CRUD METHODS
// ============================================

exports.adminList = async (req, res) => {
    try {
        const mascotes = await Mascote.findAll({ order: [['ordem', 'ASC']] });
        res.json(mascotes);
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

exports.adminCreate = async (req, res) => {
    try {
        const data = req.body;
        // Ensure messages are stored as strings if they come as arrays
        if (Array.isArray(data.msg_correct)) data.msg_correct = JSON.stringify(data.msg_correct);
        if (Array.isArray(data.msg_wrong)) data.msg_wrong = JSON.stringify(data.msg_wrong);
        if (Array.isArray(data.msg_greeting)) data.msg_greeting = JSON.stringify(data.msg_greeting);
        if (Array.isArray(data.msg_drag)) data.msg_drag = JSON.stringify(data.msg_drag);

        const novo = await Mascote.create(data);
        res.status(201).json(novo);
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

exports.adminUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const mascote = await Mascote.findByPk(id);
        if (!mascote) return res.status(404).json({ erro: "NAO_ENCONTRADO" });

        if (Array.isArray(data.msg_correct)) data.msg_correct = JSON.stringify(data.msg_correct);
        if (Array.isArray(data.msg_wrong)) data.msg_wrong = JSON.stringify(data.msg_wrong);
        if (Array.isArray(data.msg_greeting)) data.msg_greeting = JSON.stringify(data.msg_greeting);
        if (Array.isArray(data.msg_drag)) data.msg_drag = JSON.stringify(data.msg_drag);

        await mascote.update(data);
        res.json(mascote);
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

exports.adminDelete = async (req, res) => {
    try {
        const { id } = req.params;
        const mascote = await Mascote.findByPk(id);
        if (!mascote) return res.status(404).json({ erro: "NAO_ENCONTRADO" });

        await mascote.destroy();
        res.json({ mensagem: "Mascote removido com sucesso." });
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};
