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
        const usuario = req.usuario;

        const where = {};
        
        if (usuario.tipo === 'crianca') {
            // Criança só vê as suas próprias missões
            where.id_crianca = usuario.id;
        } else {
            // Responsável
            const responsavelId = usuario.id;
            
            if (crianca_id) {
                const crianca = await Crianca.findByPk(crianca_id);
                if (!crianca || crianca.id_responsavel !== responsavelId) {
                    return res.status(403).json({ 
                        erro: "SEM_PERMISSAO", 
                        mensagem: "Você não tem acesso a este dependente." 
                    });
                }
                where.id_crianca = crianca_id;
            } else {
                // Filtrar apenas crianças do responsável autenticado
                const criancas = await Crianca.findAll({ where: { id_responsavel: responsavelId }, attributes: ['id_crianca'] });
                where.id_crianca = criancas.map(c => c.id_crianca);
            }
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
                concluida: m.concluida || (parseFloat(m.progresso_atual) >= parseFloat(m.objetivo_valor) && parseFloat(m.objetivo_valor) > 0),
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
    const t = await sequelize.transaction();
    try {
        const { missionId } = req.params;
        const { valor } = req.body; // Valor da contribuição

        if (valor === undefined || isNaN(parseFloat(valor))) {
            await t.rollback();
            return res.status(400).json({ erro: "VALOR_INVALIDO", mensagem: "Informe um valor válido." });
        }

        const contribuicao = parseFloat(valor);

        const missao = await Missao.findByPk(missionId, { transaction: t });
        if (!missao) {
            await t.rollback();
            return res.status(404).json({ 
                erro: "MISSAO_NAO_ENCONTRADA", 
                mensagem: "Missão não encontrada." 
            });
        }

        const crianca = await Crianca.findByPk(missao.id_crianca, { transaction: t });
        if (!crianca) {
            await t.rollback();
            return res.status(404).json({ erro: "CRIANCA_NAO_ENCONTRADA", mensagem: "Criança não encontrada." });
        }

        // Determinar de qual pote descontar
        let campoPote = 'saldo_gastar';
        if (missao.tipo === 'poupanca') campoPote = 'saldo_poupar';
        else if (missao.tipo === 'solidariedade' || missao.tipo === 'social') campoPote = 'saldo_ajudar';

        if (crianca[campoPote] < contribuicao) {
            await t.rollback();
            return res.status(400).json({ 
                erro: "SALDO_INSUFICIENTE", 
                mensagem: `Saldo insuficiente no pote ${missao.tipo === 'poupanca' ? 'Poupar' : (campoPote === 'saldo_ajudar' ? 'Ajudar' : 'Gastar')}.` 
            });
        }

        // Atualizar saldo da criança
        await crianca.update({
            [campoPote]: crianca[campoPote] - contribuicao
        }, { transaction: t });

        // Atualizar progresso da missão
        const novoProgresso = parseFloat(missao.progresso_atual) + contribuicao;
        const objetivo = parseFloat(missao.objetivo_valor);
        const concluida = novoProgresso >= objetivo;

        await missao.update({
            progresso_atual: novoProgresso,
            concluida: concluida
        }, { transaction: t });

        // Criar histórico
        await Historico.create({
            id_crianca: crianca.id_crianca,
            tipo: 'saida',
            valor: contribuicao,
            descricao: `Contribuição para missão: ${missao.titulo}`,
            pote_afetado: campoPote.replace('saldo_', ''),
            data: new Date()
        }, { transaction: t });

        if (concluida && !missao.concluida) {
            // Dar XP da missão se acabou de concluir
            const novoXP = crianca.xp + parseFloat(missao.xp_recompensa || 0);
            const novoNivel = Math.floor(novoXP / 100) + 1;
            await crianca.update({ xp: novoXP, nivel: novoNivel }, { transaction: t });
        }

        await t.commit();

        res.json({
            id: missao.id_missao,
            progresso_atual: parseFloat(missao.progresso_atual),
            objetivo_valor: parseFloat(missao.objetivo_valor),
            percentagem: Math.round((missao.progresso_atual / objetivo) * 100),
            concluida: missao.concluida,
            saldo_atualizado: {
                total: crianca.saldo_gastar + crianca.saldo_poupar + crianca.saldo_ajudar,
                gastar: crianca.saldo_gastar,
                poupar: crianca.saldo_poupar,
                ajudar: crianca.saldo_ajudar
            }
        });

    } catch (error) {
        await t.rollback();
        console.error("❌ Erro ao atualizar progresso:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};
// PUT /api/missions/:missionId
exports.updateMission = async (req, res) => {
    try {
        const { titulo, descricao, tipo, objetivo_valor, recompensa, icone } = req.body;
        const missao = await Missao.findByPk(req.params.missionId);

        if (!missao) {
            return res.status(404).json({ erro: "MISSAO_NAO_ENCONTRADA", mensagem: "Missão não encontrada." });
        }

        // Verifica se é o responsável dono
        const crianca = await Crianca.findByPk(missao.id_crianca);
        if (!crianca || crianca.id_responsavel !== req.usuario.id) {
            return res.status(403).json({ erro: "SEM_PERMISSAO", mensagem: "Você não tem acesso a esta missão." });
        }

        if (titulo) missao.titulo = titulo;
        if (descricao) missao.descricao = descricao;
        if (tipo) missao.tipo = tipo;
        if (objetivo_valor !== undefined) missao.objetivo_valor = parseFloat(objetivo_valor);
        if (recompensa !== undefined) missao.xp_recompensa = parseFloat(recompensa);
        if (icone) missao.icone = icone;

        await missao.save();

        res.json({ mensagem: "Missão atualizada com sucesso.", missao });
    } catch (error) {
        console.error("❌ Erro ao atualizar missão:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// DELETE /api/missions/:missionId
exports.deleteMission = async (req, res) => {
    try {
        const missao = await Missao.findByPk(req.params.missionId);

        if (!missao) {
            return res.status(404).json({ erro: "MISSAO_NAO_ENCONTRADA", mensagem: "Missão não encontrada." });
        }

        const crianca = await Crianca.findByPk(missao.id_crianca);
        if (!crianca || crianca.id_responsavel !== req.usuario.id) {
            return res.status(403).json({ erro: "SEM_PERMISSAO", mensagem: "Você não tem acesso a esta missão." });
        }

        await missao.destroy();
        res.json({ mensagem: "Missão apagada com sucesso." });
    } catch (error) {
        console.error("❌ Erro ao apagar missão:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};
