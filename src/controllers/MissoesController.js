// controllers/missoesController.js
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Missao = require("../models/Missoes");
const ProgressoMissao = require("../models/ProgressoMissao");
const Crianca = require("../models/Criancas");
const Historico = require("../models/HistoricoTransacao");

// POST /api/missions
exports.createMission = async (req, res) => {
    try {
        const { 
            titulo, 
            descricao, 
            tipo,           // ← O frontend envia como "tipo"
            objetivo_valor, 
            recompensa, 
            icone, 
            crianca_id 
        } = req.body;

      

        if (!titulo || !tipo || !objetivo_valor || !crianca_id) {
            return res.status(400).json({ 
                erro: "CAMPOS_OBRIGATORIOS", 
                mensagem: "Preencha todos os campos obrigatórios." 
            });
        }
        
        const descFinal = descricao || `Missão: ${titulo}`;

        const crianca = await Crianca.findByPk(crianca_id);
        if (!crianca || crianca.id_responsavel !== req.usuario.id) {
            return res.status(404).json({ 
                erro: "CRIANCA_NAO_ENCONTRADA", 
                mensagem: "Dependente não encontrado." 
            });
        }

        // 🔥 Mapear "tipo" para "tipo_missao"
        let tipo_missao;
        switch (tipo) {
            case 'poupanca':
            case 'consumo':
            case 'solidariedade':
            case 'estudo':
            case 'saude':
            case 'comportamento':
            case 'autonomia':
                tipo_missao = 'acao_financeira';
                break;
            default:
                tipo_missao = 'acao_financeira';
        }

        const missao = await Missao.create({
            titulo,
            descricao: descFinal,
            tipo_missao,                    // ← Usar tipo_missao, não tipo
            tipo,                           // ← Add tipo
            xp_recompensa: recompensa || 0,
            recompensa_financeira: 0,
            objetivo_valor: parseFloat(objetivo_valor),
            progresso_atual: 0,
            icone: icone || "🎯",
            id_crianca: crianca_id,
            id_responsavel: req.usuario.id,
            ativa: true,
            concluida: false,
            nivel_minimo: 1
        });

        res.status(201).json({
            id: missao.id_missao,
            titulo: missao.titulo,
            descricao: missao.descricao,
            tipo: tipo,  // ← Retorna o tipo original para o frontend
            objetivo_valor: parseFloat(missao.objetivo_valor),
            progresso_atual: parseFloat(missao.progresso_atual),
            recompensa: parseFloat(missao.xp_recompensa),
            icone: missao.icone,
            ativa: missao.ativa,
            crianca_id: missao.id_crianca,
            criado_em: missao.createdAt
        });

    } catch (error) {
        console.error("❌ Erro ao criar missão:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// GET /api/missions
exports.listMissions = async (req, res) => {
    try {
        const { crianca_id, ativa } = req.query;
        const responsavelId = req.usuario.id;

        const where = {};
        if (crianca_id) {
            const crianca = await Crianca.findByPk(crianca_id);
            if (!crianca || crianca.id_responsavel !== responsavelId) {
                return res.status(403).json({ 
                    erro: "SEM_PERMISSAO", 
                    mensagem: "Você não tem acesso a este dependente." 
                });
            }
            where.id_crianca = crianca_id;
        }
        if (ativa !== undefined) where.ativa = ativa === 'true';

        const missoes = await Missao.findAll({ where });

        res.json({
            missoes: missoes.map(m => ({
                id: m.id_missao,
                titulo: m.titulo,
                descricao: m.descricao,
                tipo: m.tipo,
                objetivo_valor: parseFloat(m.objetivo_valor),
                progresso_atual: parseFloat(m.progresso_atual),
                recompensa: parseFloat(m.xp_recompensa),
                icone: m.icone,
                cor: m.tipo === 'poupanca' ? ["#3b82f6", "#22c55e"] : 
                     (m.tipo === 'estudo' ? ["#7c3aed", "#3b82f6"] : 
                     (m.tipo === 'comportamento' ? ["#f59e0b", "#ef4444"] : 
                     (m.tipo === 'autonomia' ? ["#10b981", "#3b82f6"] : 
                     (m.tipo === 'saude' ? ["#ef4444", "#f43f5e"] : 
                     (m.tipo === 'solidariedade' ? ["#ec4899", "#f43f5e"] : ["#0984E3", "#0652DD"]))))),
                tipo_label: m.tipo === 'poupanca' ? "Poupança" : 
                            (m.tipo === 'estudo' ? "Estudo" : 
                            (m.tipo === 'comportamento' ? "Comp." : 
                            (m.tipo === 'autonomia' ? "Autonomia" : 
                            (m.tipo === 'saude' ? "Saúde" : 
                            (m.tipo === 'solidariedade' ? "Social" : "Consumo"))))),
                icone_nome: m.tipo === 'poupanca' ? "trending-up" : 
                            (m.tipo === 'estudo' ? "book" : 
                            (m.tipo === 'comportamento' ? "star" : 
                            (m.tipo === 'autonomia' ? "flash" : 
                            (m.tipo === 'saude' ? "heart" : 
                            (m.tipo === 'solidariedade' ? "hand-heart" : "cart"))))),
                ativa: m.ativa,
                crianca_id: m.id_crianca
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// PATCH /api/missions/:missionId/progress
exports.updateProgress = async (req, res) => {
    try {
        const { missionId } = req.params;
        const { novo_progresso } = req.body;

        const missao = await Missao.findByPk(missionId);
        if (!missao) {
            return res.status(404).json({ 
                erro: "MISSAO_NAO_ENCONTRADA", 
                mensagem: "Missão não encontrada." 
            });
        }

        const progresso = parseFloat(novo_progresso);
        const objetivo = parseFloat(missao.objetivo_valor);
        const concluida = progresso >= objetivo;

        await missao.update({
            progresso_atual: progresso,
            concluida
        });

        if (concluida) {
            // Dar XP da missão
            const crianca = await Crianca.findByPk(missao.id_crianca);
            const novoXP = crianca.xp + parseFloat(missao.xp_recompensa);
            const novoNivel = Math.floor(novoXP / 100) + 1;
            await crianca.update({ xp: novoXP, nivel: novoNivel });
        }

        res.json({
            id: missao.id_missao,
            progresso_atual: parseFloat(missao.progresso_atual),
            objetivo_valor: parseFloat(missao.objetivo_valor),
            percentagem: Math.round((progresso / objetivo) * 100),
            concluida
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};