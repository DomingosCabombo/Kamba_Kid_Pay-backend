// controllers/tarefasController.js
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Tarefa = require("../models/Tarefa");
const Criancas = require("../models/Criancas");
const Responsavel = require("../models/Responsavel");
const Historico = require("../models/HistoricoTransacao");
const Missao = require("../models/Missoes");
const ProgressoMissao = require("../models/ProgressoMissao");


exports.createTask = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { titulo, descricao, recompensa, categoria, crianca_id, icone, data_limite } = req.body;
        const responsavelId = req.usuario.id;

        console.log("📝 Criando tarefa:", { titulo, recompensa, crianca_id, categoria });

        if (!titulo || !descricao || !recompensa || !crianca_id) {
            await transaction.rollback();
            return res.status(400).json({
                erro: "CAMPOS_OBRIGATORIOS",
                mensagem: "Preencha todos os campos obrigatórios."
            });
        }

        // Verificar se a criança existe e pertence ao responsável
        const crianca = await Criancas.findByPk(crianca_id, { transaction });
        if (!crianca || crianca.id_responsavel !== responsavelId) {
            await transaction.rollback();
            return res.status(404).json({
                erro: "CRIANCA_NAO_ENCONTRADA",
                mensagem: "Dependente não encontrado."
            });
        }

        const tarefa = await Tarefa.create({
            titulo,
            descricao,
            recompensa: parseFloat(recompensa),
            categoria: categoria || 'save',
            icone: icone || 'clipboard',
            id_crianca: crianca_id,
            id_responsavel: responsavelId,
            status: 'pendente',
            data_limite
        }, { transaction });

        await transaction.commit();

        console.log("✅ Tarefa criada com ID:", tarefa.id_tarefa);

        res.status(201).json({
            id: tarefa.id_tarefa,
            titulo: tarefa.titulo,
            descricao: tarefa.descricao,
            recompensa: parseFloat(tarefa.recompensa),
            status: tarefa.status,
            crianca_id: tarefa.id_crianca,
            icone: tarefa.icone,
            categoria: tarefa.categoria,
            criado_em: tarefa.createdAt
        });

    } catch (error) {
        await transaction.rollback();
        console.error("❌ Erro ao criar tarefa:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// GET /api/tasks
exports.listTasks = async (req, res) => {
    try {
        const { crianca_id, status } = req.query;
        const responsavelId = req.usuario.id;

        const where = { id_responsavel: responsavelId };
        if (crianca_id) where.id_crianca = crianca_id;
        if (status) where.status = status;

        const tarefas = await Tarefa.findAll({
            where,
            include: [{ model: Criancas, attributes: ['nome_completo'] }],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            tarefas: tarefas.map(t => ({
                id: t.id_tarefa,
                titulo: t.titulo,
                descricao: t.descricao,
                recompensa: parseFloat(t.recompensa),
                status: t.status,
                crianca_id: t.id_crianca,
                crianca_nome: t.Criancum?.nome_completo,
                foto_url: t.foto_comprovacao ? `/uploads/${t.foto_comprovacao}` : null,
                icone: t.icone,
                categoria: t.categoria,
                criado_em: t.createdAt,
                concluido_em: t.concluido_em,
                aprovado_em: t.aprovado_em,
                data_limite: t.data_limite,
                motivo_rejeicao: t.motivo_rejeicao
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// 
exports.approveTask = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { taskId } = req.params;

        const tarefa = await Tarefa.findByPk(taskId, { transaction });
        if (!tarefa) {
            await transaction.rollback();
            return res.status(404).json({
                erro: "TAREFA_NAO_ENCONTRADA",
                mensagem: "A tarefa solicitada não foi encontrada."
            });
        }

        // 🔥 VERIFICAR SE A TAREFA ESTÁ AGUARDANDO APROVAÇÃO
        if (tarefa.status !== 'aguardando_aprovacao') {
            await transaction.rollback();
            return res.status(400).json({
                erro: "STATUS_INVALIDO",
                mensagem: `A tarefa está com status "${tarefa.status}". Só é possível aprovar tarefas que estão "aguardando_aprovacao".`
            });
        }

        const crianca = await Criancas.findByPk(tarefa.id_crianca, { transaction });
        const responsavel = await Responsavel.findByPk(crianca.id_responsavel, { transaction });

        // 🔥 CORREÇÃO: Garantir que os percentuais existem e são números
        let configPotes = crianca.distribuicao_potes;

        // Verificar se configPotes é válido
        if (!configPotes || typeof configPotes !== 'object') {
            configPotes = {
                gastar_pct: 60,
                poupar_pct: 30,
                ajudar_pct: 10
            };
        }

        // Garantir que os valores são números
        const gastar_pct = parseFloat(configPotes.gastar_pct) || 60;
        const poupar_pct = parseFloat(configPotes.poupar_pct) || 30;
        const ajudar_pct = parseFloat(configPotes.ajudar_pct) || 10;

        // Garantir que a soma é 100
        const total = gastar_pct + poupar_pct + ajudar_pct;
        if (total !== 100) {
            console.warn(`⚠️ Soma dos percentuais é ${total}, ajustando...`);
            // Ajustar para 100 mantendo proporções
        }

        const valor = parseFloat(tarefa.recompensa);

        // 🔥 Cálculo seguro dos valores
        const gastar = (valor * gastar_pct) / 100;
        const poupar = (valor * poupar_pct) / 100;
        const ajudar = (valor * ajudar_pct) / 100;

        console.log("💰 Configuração dos potes:", { gastar_pct, poupar_pct, ajudar_pct });
        console.log("💰 Cálculo:", { valor, gastar, poupar, ajudar });
        console.log("👧 Saldos ANTES:", {
            gastar: crianca.saldo_gastar,
            poupar: crianca.saldo_poupar,
            ajudar: crianca.saldo_ajudar
        });

        // 🔥 Calcular novos saldos
        const novoSaldoGastar = parseFloat(crianca.saldo_gastar || 0) + gastar;
        const novoSaldoPoupar = parseFloat(crianca.saldo_poupar || 0) + poupar;
        const novoSaldoAjudar = parseFloat(crianca.saldo_ajudar || 0) + ajudar;

        // 🔥 Atualizar saldos
        await crianca.update({
            saldo_gastar: novoSaldoGastar,
            saldo_poupar: novoSaldoPoupar,
            saldo_ajudar: novoSaldoAjudar
        }, { transaction });

        console.log("👧 Saldos DEPOIS:", {
            gastar: novoSaldoGastar,
            poupar: novoSaldoPoupar,
            ajudar: novoSaldoAjudar
        });

        // Atualizar tarefa
        tarefa.status = "aprovada";
        tarefa.aprovado_em = new Date();
        await tarefa.save({ transaction });

        // Criar histórico
        await Historico.create({
            id_crianca: crianca.id_crianca,
            tipo: "tarefa",
            valor,
            descricao: `Recompensa: ${tarefa.titulo}`
        }, { transaction });

        // Se tem missão, atualizar progresso
        if (tarefa.id_missao) {
            const progresso = await ProgressoMissao.findOne({
                where: { id_crianca: crianca.id_crianca, id_missao: tarefa.id_missao },
                transaction
            });
            if (progresso && progresso.estado !== 'concluida') {
                progresso.estado = 'concluida';
                progresso.data_conclusao = new Date();
                await progresso.save({ transaction });
            }
        }

        await transaction.commit();

        // 🔥 Determinar qual pote foi afetado
        let poteAfetado = "gastar";
        let novoSaldoPote = novoSaldoGastar;

        if (tarefa.categoria === 'save') {
            poteAfetado = "poupar";
            novoSaldoPote = novoSaldoPoupar;
        } else if (tarefa.categoria === 'help') {
            poteAfetado = "ajudar";
            novoSaldoPote = novoSaldoAjudar;
        }

        res.json({
            mensagem: "Tarefa aprovada com sucesso!",
            tarefa: {
                id: tarefa.id_tarefa,
                status: tarefa.status,
                aprovado_em: tarefa.aprovado_em
            },
            recompensa_creditada: {
                valor,
                pote: tarefa.categoria || "save",
                novo_saldo_pote: novoSaldoPote,
                detalhes: {
                    gastar: novoSaldoGastar,
                    poupar: novoSaldoPoupar,
                    ajudar: novoSaldoAjudar
                }
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error("❌ Erro ao aprovar tarefa:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// PATCH /api/tasks/:taskId/reject
exports.rejectTask = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { taskId } = req.params;
        const { motivo } = req.body;

        const tarefa = await Tarefa.findByPk(taskId, { transaction });
        if (!tarefa) {
            await transaction.rollback();
            return res.status(404).json({
                erro: "TAREFA_NAO_ENCONTRADA",
                mensagem: "A tarefa solicitada não foi encontrada."
            });
        }

        const crianca = await Criancas.findByPk(tarefa.id_crianca, { transaction });
        if (crianca.id_responsavel !== req.usuario.id) {
            await transaction.rollback();
            return res.status(403).json({
                erro: "SEM_PERMISSAO",
                mensagem: "Você não tem permissão para rejeitar esta tarefa."
            });
        }

        tarefa.status = "rejeitada";
        tarefa.motivo_rejeicao = motivo || "Tarefa não atende aos critérios";
        tarefa.rejeitado_em = new Date();
        await tarefa.save({ transaction });

        await transaction.commit();

        res.json({
            mensagem: "Tarefa rejeitada.",
            tarefa: {
                id: tarefa.id_tarefa,
                status: tarefa.status,
                rejeitado_em: tarefa.rejeitado_em,
                motivo_rejeicao: tarefa.motivo_rejeicao
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};