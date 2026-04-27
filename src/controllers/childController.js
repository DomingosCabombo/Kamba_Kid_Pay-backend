const { Op } = require("sequelize");
const Criancas = require("../models/Criancas");
const Tarefa = require("../models/Tarefa");
const Missao = require("../models/Missoes");
const Campanha = require("../models/Campanha");
const Doacoes = require("../models/Doacoes");
const Historico = require("../models/HistoricoTransacao");
const { Conteudo } = require("../models/VideoAssistido");
const { ConteudoAssistido } = require("../models/VideoAssistido");
const ShopItem = require("../models/ShopItem");
const CriancaShopItem = require("../models/CriancaShopItem");
const sequelize = require("../config/database");

// GET /api/child/dashboard
exports.dashboard = async (req, res) => {
    try {
        const criancaId = req.usuario.id;
        console.log("👧 Dashboard para criança ID:", criancaId);
        const crianca = await Criancas.findByPk(criancaId);
        if (!crianca) {
            return res.status(404).json({
                erro: "CRIANCA_NAO_ENCONTRADA",
                mensagem: "Criança não encontrada."
            });
        }

        // 🔥 CALCULAR XP E NÍVEL CORRETAMENTE
        const xpAtual = crianca.xp || 0;
        const nivelAtual = Math.floor(xpAtual / 100) + 1;
        const xpProximoNivel = (nivelAtual * 100) - xpAtual;

        // Tarefas do dia (pendentes)
        const tarefasDoDia = await Tarefa.findAll({
            where: {
                id_crianca: criancaId,
                status: "pendente"
            },
            limit: 5,
            order: [['createdAt', 'ASC']]
        });

        // Missão em destaque
        const missaoDestaque = await Missao.findAll({
            where: {
                id_crianca: criancaId,
                ativa: true,
                concluida: false
            },
            order: [['progresso_atual', 'DESC']]
        });
        // 🔥 CORREÇÃO: Itens comprados para o avatar
        const itensComprados = await CriancaShopItem.findAll({
            where: { id_crianca: criancaId },
            include: [{
                model: ShopItem,
                as: "item",
                required: false
            }]
        });

        const avatarAtual = {
            id: crianca.avatar?.id || null,
            cabelo: crianca.avatar?.cabelo || "padrao",
            roupa: crianca.avatar?.roupa || "padrao",
            acessorio: crianca.avatar?.acessorio || null,
            cor_pele: crianca.avatar?.cor_pele || "marrom",
            expressao: crianca.avatar?.expressao || "feliz"
        };

        const configPotes = crianca.distribuicao_potes || {
            gastar_pct: 60,
            poupar_pct: 30,
            ajudar_pct: 10
        };

        res.json({
            crianca: {
                id: crianca.id_crianca,
                nome: crianca.nome_completo,
                idade: crianca.idade,
                nivel: nivelAtual,
                xp: xpAtual,
                xp_para_proximo_nivel: xpProximoNivel,
                avatar: avatarAtual,
                potes: {
                    saldo_gastar: parseFloat(crianca.saldo_gastar),
                    saldo_poupar: parseFloat(crianca.saldo_poupar),
                    saldo_ajudar: parseFloat(crianca.saldo_ajudar),
                    total: parseFloat(crianca.saldo_gastar) + parseFloat(crianca.saldo_poupar) + parseFloat(crianca.saldo_ajudar),
                    config: {
                        gastar: {
                            label: "Pote Gastar",
                            descricao: "Para uso imediato",
                            cor: ["#FF6B00", "#FF8C00"],
                            icone: "cart-outline"
                        },
                        poupar: {
                            label: "Pote Poupar",
                            descricao: "Metas futuras",
                            cor: ["#4BD37B", "#2ECC71"],
                            icone: "target"
                        },
                        ajudar: {
                            label: "Pote Ajudar",
                            descricao: "Solidariedade",
                            cor: ["#FFD130", "#FBC02D"],
                            icone: "heart-outline"
                        }
                    }
                }
            },
            tarefas_do_dia: tarefasDoDia.map(t => ({
                id: t.id_tarefa,
                titulo: t.titulo,
                descricao: t.descricao,
                recompensa: parseFloat(t.recompensa),
                status: t.status,
                icone: t.icone || "clipboard",
                categoria: t.categoria || "save",
                crianca_id: t.id_crianca
            })), 
            missao_destaque: missaoDestaque.map(m => ({
                id: m.id_missao,
                titulo: m.titulo,
                icone: m.icone || "🎯",
                tipo: m.tipo,
                objetivo_valor: parseFloat(m.objetivo_valor),
                progresso_atual: parseFloat(m.progresso_atual),
                faltam: parseFloat(m.objetivo_valor) - parseFloat(m.progresso_atual)
            }))
        });

    } catch (error) {
        console.error("Erro no dashboard da criança:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// GET /api/child/tasks
exports.listTasks = async (req, res) => {
    try {
        const criancaId = req.usuario.id;
        const { status } = req.query;

        console.log("🔍 Buscando tarefas para criança:", criancaId);
        console.log("📋 Filtro status:", status);

        const where = { id_crianca: criancaId };
        if (status) where.status = status;

        const tarefas = await Tarefa.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });

        console.log("📊 Tarefas encontradas:", tarefas.length);

        res.json({
            tarefas: tarefas.map(t => ({
                id: t.id_tarefa,
                titulo: t.titulo,
                descricao: t.descricao,
                recompensa: parseFloat(t.recompensa),
                status: t.status,
                icone: t.icone || "clipboard",
                categoria: t.categoria || "save",
                foto_url: t.foto_comprovacao ? `/uploads/${t.foto_comprovacao}` : null,
                criado_em: t.createdAt,
                concluido_em: t.concluido_em,
                data_limite: t.data_limite,
                motivo_rejeicao: t.motivo_rejeicao,
                crianca_id: t.id_crianca
            }))
        });

    } catch (error) {
        console.error("Erro ao listar tarefas:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// PATCH /api/child/tasks/:taskId/submit
exports.submitTask = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { taskId } = req.params;
        const criancaId = req.usuario.id;

        const tarefa = await Tarefa.findByPk(taskId, { transaction });
      
        if (!tarefa) {
            console.log("tarefa não encontrada", criancaId);
            await transaction.rollback();
            return res.status(404).json({
                erro: "TAREFA_NAO_ENCONTRADA",
                mensagem: "A tarefa solicitada não foi encontrada."
            });
        }

        if (tarefa.id_crianca !== criancaId) {
            console.log("tarefa não pertence a você", criancaId);
            await transaction.rollback();
            return res.status(403).json({
                erro: "SEM_PERMISSAO",
                mensagem: "Esta tarefa não pertence a você."
            });
        }

        if (tarefa.status !== 'pendente' && tarefa.status !== 'rejeitada') {
            await transaction.rollback();
            return res.status(400).json({
                erro: "DADOS_INVALIDOS",
                mensagem: "Esta tarefa já foi submetida ou concluída."
            });
        }

        let fotoUrl = null;
        console.log("tarefa", req.file);
        if (req.file) {
              console.log("tarefa", req.file);
            fotoUrl = req.file.filename;
        } else if (req.body.foto_base64) {
            // Processar base64 se necessário
            fotoUrl = req.body.foto_base64; // Simplificado
        } else {
            await transaction.rollback();
            return res.status(400).json({
                erro: "FOTO_OBRIGATORIA",
                mensagem: "Tire uma foto ou selecione uma imagem como prova."
            });
        }

        tarefa.status = "aguardando_aprovacao";
        tarefa.foto_comprovacao = fotoUrl;
        tarefa.concluido_em = new Date();
        await tarefa.save({ transaction });

        await transaction.commit();
console.log("tarefa enviada para aprovação", criancaId);
        res.json({
            mensagem: "Tarefa enviada para aprovação!",
            tarefa: {
                id: tarefa.id_tarefa,
                status: tarefa.status,
                foto_url: fotoUrl ? `/uploads/${fotoUrl}` : null,
                concluido_em: tarefa.concluido_em
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error("erro ao enviar tarefa",error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};


// GET /api/child/missions
exports.listMissions = async (req, res) => {
    try {
        const criancaId = req.usuario.id;
        const { tipo } = req.query;
        const crianca = await Criancas.findByPk(criancaId);
        const idResponsavel = crianca.id_responsavel;

        const where = {
            [Op.or]: [
                { id_crianca: criancaId },           // Missões específicas da criança
                { id_crianca: null },                 // Missões do sistema
                { id_responsavel: idResponsavel }     // Missões criadas pelo responsável
            ],
            ativa: true
        };

        // 🔥 CORREÇÃO: Usar 'tipo_missao' em vez de 'tipo'
        if (tipo) where.tipo_missao = tipo;  // ← MUDAR AQUI!

        const missoes = await Missao.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });
console.log("missoes", missoes);
        const missoesFormatadas = missoes.map(m => {
            const progresso = parseFloat(m.progresso_atual);
            const objetivo = parseFloat(m.objetivo_valor);
            const percentagem = objetivo > 0 ? (progresso / objetivo) * 100 : 0;

            return {
                id: m.id_missao,
                titulo: m.titulo,
                descricao: m.descricao,
                tipo: m.tipo_missao,  // ← Retornar tipo_missao para o frontend
                tipo_label: m.tipo_missao === 'quiz' ? 'Quiz' : (m.tipo_missao === 'conteudo' ? 'Conteúdo' : (m.tipo_missao === 'tarefa_casa' ? 'Tarefa' : 'Ação Financeira')),
                objetivo_valor: objetivo,
                progresso_atual: progresso,
                percentagem: Math.round(percentagem),
                faltam: objetivo - progresso,
                recompensa: parseFloat(m.xp_recompensa),
                icone: m.icone || "🎯",
                icone_nome: m.tipo === 'poupanca' ? 'trending-up' : (m.tipo === 'consumo' ? 'cart' : 'heart'),
                cor: m.tipo === 'poupanca' ? ["#BF5AF2", "#A335EE"] : (m.tipo === 'consumo' ? ["#0984E3", "#0652DD"] : ["#FFD130", "#FBC02D"]),
                ativa: m.ativa,
                concluida: m.concluida
            };
        });

        res.json({ missoes: missoesFormatadas });

    } catch (error) {
        console.error("Erro ao listar missões:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// POST /api/child/donations
exports.donate = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const criancaId = req.usuario.id;
        const { campanha_id, valor } = req.body;

        if (!campanha_id || !valor) {
            await transaction.rollback();
            return res.status(400).json({
                erro: "CAMPOS_OBRIGATORIOS",
                mensagem: "Campanha e valor são obrigatórios."
            });
        }

        const crianca = await Criancas.findByPk(criancaId, { transaction });
        const campanha = await Campanha.findByPk(campanha_id, { transaction });

        if (!campanha) {
            await transaction.rollback();
            return res.status(404).json({
                erro: "CAMPANHA_NAO_ENCONTRADA",
                mensagem: "Campanha não encontrada."
            });
        }

        const valorNum = parseFloat(valor);
        if (parseFloat(crianca.saldo_ajudar) < valorNum) {
            await transaction.rollback();
            return res.status(400).json({
                erro: "SALDO_INSUFICIENTE",
                mensagem: "O seu Pote Ajudar não tem saldo suficiente para esta doação."
            });
        }

        // Atualizar saldo da criança
        const novoSaldoAjudar = parseFloat(crianca.saldo_ajudar) - valorNum;
        const novoXP = crianca.xp + 30;
        await crianca.update({
            saldo_ajudar: novoSaldoAjudar,
            xp: novoXP,
            nivel: Math.floor(novoXP / 100) + 1
        }, { transaction });

        // Atualizar campanha
        const novoArrecadado = parseFloat(campanha.valor_arrecadado) + valorNum;
        await campanha.update({
            valor_arrecadado: novoArrecadado
        }, { transaction });

        // Registrar doação
        const doacao = await Doacoes.create({
            id_crianca: criancaId,
            id_campanha: campanha_id,
            valor: valorNum
        }, { transaction });

        // Registrar histórico
        await Historico.create({
            id_crianca: criancaId,
            tipo: "doar",
            valor: valorNum,
            descricao: `Doação para: ${campanha.nome}`
        }, { transaction });

        await transaction.commit();

        const percentagem = (novoArrecadado / parseFloat(campanha.meta_valor)) * 100;

        res.json({
            mensagem: "Doação realizada com sucesso! Você é um herói! ✨",
            doacao: {
                id: doacao.id_doacao,
                campanha_id: campanha.id_campanha,
                campanha_titulo: campanha.nome,
                valor: valorNum,
                data: new Date()
            },
            pote_ajudar_atualizado: {
                saldo_anterior: parseFloat(crianca.saldo_ajudar) + valorNum,
                saldo_atual: novoSaldoAjudar
            },
            campanha_atualizada: {
                id: campanha.id_campanha,
                valor_arrecadado: novoArrecadado,
                meta_valor: parseFloat(campanha.meta_valor),
                percentagem: Math.round(percentagem)
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// PUT /api/child/avatar
exports.updateAvatar = async (req, res) => {
    try {
        const criancaId = req.usuario.id;
        const { cabelo, roupa, acessorio, cor_pele, expressao } = req.body;

        const crianca = await Criancas.findByPk(criancaId);
        if (!crianca) {
            return res.status(404).json({
                erro: "CRIANCA_NAO_ENCONTRADA",
                mensagem: "Criança não encontrada."
            });
        }

        const avatarAtual = crianca.avatar || {};
        const novoAvatar = {
            id: avatarAtual.id || Date.now(),
            cabelo: cabelo || avatarAtual.cabelo || "padrao",
            roupa: roupa || avatarAtual.roupa || "padrao",
            acessorio: acessorio !== undefined ? acessorio : (avatarAtual.acessorio || null),
            cor_pele: cor_pele || avatarAtual.cor_pele || "marrom",
            expressao: expressao || avatarAtual.expressao || "feliz"
        };

        await crianca.update({ avatar: novoAvatar });

        res.json({
            mensagem: "Avatar atualizado!",
            avatar: novoAvatar
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};