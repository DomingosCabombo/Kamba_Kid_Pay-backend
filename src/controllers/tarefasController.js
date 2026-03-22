const Tarefa = require("../models/Tarefa");
const Criancas = require("../models/Criancas");
const Responsavel = require("../models/Responsavel");
const Historico = require("../models/HistoricoTransacao");
const Missao = require("../models/Missoes");
const ProgressoMissao = require("../models/ProgressoMissao");
const sequelize = require("../config/database");

exports.criarTarefa = async (req, res) => {
    try {
        const { titulo, descricao, recompensa, id_crianca, id_responsavel, id_missao } = req.body;

        // console.log(" Dados recebidos:", { titulo, id_missao });

        // ⚠️ VALIDAÇÃO: Se veio id_missao, verificar se é do tipo tarefa_casa
        if (id_missao) {
            const missao = await Missao.findByPk(id_missao);

            if (!missao) {
                return res.status(400).json({
                    erro: "Missão não encontrada"
                });
            }

            if (missao.tipo_missao !== 'tarefa_casa') {
                return res.status(400).json({
                    erro: "O ID da missão não corresponde a uma tarefa doméstica",
                    missao_encontrada: {
                        id: missao.id_missao,
                        titulo: missao.titulo,
                        tipo: missao.tipo_missao
                    }
                });
            }

            // Verificar se a missão pertence ao responsável
            if (missao.id_responsavel && missao.id_responsavel !== id_responsavel) {
                return res.status(400).json({
                    erro: "Esta missão não pertence ao responsável informado"
                });
            }
        }

        const tarefa = await Tarefa.create({
            titulo,
            descricao,
            recompensa,
            id_crianca,
            id_responsavel,
            id_missao: id_missao || null,
            status: "pendente"
        });

        res.status(201).json({
            mensagem: "✅ Tarefa criada com sucesso",
            tarefa,
            vinculacao: id_missao ? `Vinculada à missão: ${id_missao}` : "Tarefa avulsa"
        });

    } catch (error) {
        console.error("❌ Erro ao criar tarefa:", error);
        res.status(500).json({ erro: error.message });
    }
};

exports.enviarComprovacao = async (req, res) => {
    try {
        const { id_tarefa } = req.body;

        // 🔒 Validação básica
        if (!id_tarefa) {
            return res.status(400).json({ erro: "ID da tarefa é obrigatório" });
        }

        if (!req.file) {
            return res.status(400).json({ erro: "Envie uma foto da tarefa realizada" });
        }

        // 🔍 Verificar se a tarefa existe
        const tarefa = await Tarefa.findByPk(id_tarefa);

        if (!tarefa) {
            return res.status(404).json({
                erro: "Tarefa não encontrada"
            });
        }

        if (tarefa.status !== "pendente") {
            return res.status(400).json({
                erro: "Esta tarefa já foi enviada ou processada"
            });
        }

        // 🔄 Atualizar
        await tarefa.update({
            foto_comprovacao: req.file.filename,
            status: "aguardando_aprovacao"
        });


        res.json({
            mensagem: "📸 Comprovação enviada! Aguardando aprovação do responsável.",
            imagem: `/uploads/${req.file.filename}`,
            tarefa_id: tarefa.id_tarefa
        });

    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

exports.aprovarTarefa = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { id_tarefa } = req.params;

        // Buscar dados
        const tarefa = await Tarefa.findByPk(id_tarefa, { transaction });
        if (!tarefa) {
            await transaction.rollback();
            return res.status(404).json({ erro: "Tarefa não encontrada" });
        }

        const crianca = await Criancas.findByPk(tarefa.id_crianca, { transaction });
        const responsavel = await Responsavel.findByPk(crianca.id_responsavel, { transaction });

        // Calcular divisão nos potes
        const valor = parseFloat(tarefa.recompensa);
        const gastar = valor * (responsavel.perc_gastar / 100);
        const poupar = valor * (responsavel.perc_poupar / 100);
        const ajudar = valor * (responsavel.perc_ajudar / 100);

        // Atualizar saldos 
        crianca.saldo_gastar = parseFloat(crianca.saldo_gastar) + gastar;
        crianca.saldo_poupar = parseFloat(crianca.saldo_poupar) + poupar;
        crianca.saldo_ajudar = parseFloat(crianca.saldo_ajudar) + ajudar;
        await crianca.save({ transaction });

        // Atualizar tarefa
        tarefa.status = "aprovada";
        await tarefa.save({ transaction });

        // Criar histórico
        await Historico.create({
            id_crianca: crianca.id_crianca,
            tipo: "tarefa",
            valor,
            descricao: `Recompensa: ${tarefa.titulo}`
        }, { transaction });

        // Se tem missão, apenas marcar como concluída (SEM XP)
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

        res.json({
            mensagem: "✅ Tarefa aprovada!",
            valor_recebido: valor,
            divisao: { gastar, poupar, ajudar },
            novos_saldos: {
                gastar: crianca.saldo_gastar,
                poupar: crianca.saldo_poupar,
                ajudar: crianca.saldo_ajudar
            }
        });

    } catch (error) {
        console.error("❌ Erro ao aprovar tarefa:", error);
        await transaction.rollback();
        res.status(500).json({ erro: error.message });
    }
};

exports.rejeitarTarefa = async (req, res) => {
    try {
        const { id_tarefa } = req.params;

        await Tarefa.update({
            status: "rejeitada"
        }, {
            where: { id_tarefa }
        });

        res.json({
            mensagem: "❌ Tarefa rejeitada. Peça para a criança refazer."
        });

    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

exports.listarTarefasCrianca = async (req, res) => {
    try {
        const { id_crianca } = req.params;

        const tarefas = await Tarefa.findAll({
            where: { id_crianca },
            order: [['createdAt', 'DESC']]
        });

        // Separar por status
        const pendentes = tarefas.filter(t => t.status === 'pendente');
        const aguardando = tarefas.filter(t => t.status === 'aguardando_aprovacao');
        const aprovadas = tarefas.filter(t => t.status === 'aprovada');
        const rejeitadas = tarefas.filter(t => t.status === 'rejeitada');

        res.json({
            total: tarefas.length,
            pendentes,
            aguardando_aprovacao: aguardando,
            aprovadas,
            rejeitadas
        });

    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};