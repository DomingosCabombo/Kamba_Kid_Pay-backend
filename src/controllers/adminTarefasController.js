// controllers/adminTarefasController.js
const { Op } = require("sequelize");
const Tarefa = require("../models/Tarefa");
const Criancas = require("../models/Criancas");
const Responsavel = require("../models/Responsavel");
const LogAdmin = require("../models/LogAdmin");

// ============================================
// GET /api/admin/tarefas
// Lista todas as tarefas com filtros
// ============================================
exports.listarTarefas = async (req, res) => {
    try {
        const { status, categoria, crianca_id, pagina = 1, limite = 20 } = req.query;
        const where = {};

        if (status) where.status = status;
        if (categoria) where.categoria = categoria;
        if (crianca_id) where.id_crianca = crianca_id;

        const offset = (pagina - 1) * limite;
        
        const { count, rows: tarefas } = await Tarefa.findAndCountAll({
            where,
            include: [
                { model: Criancas, attributes: ['id_crianca', 'nome_completo', 'idade'] },
                { model: Responsavel, attributes: ['id_responsavel', 'nome_completo'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limite),
            offset
        });

        res.json({
            total: count,
            pagina: parseInt(pagina),
            totalPaginas: Math.ceil(count / limite),
            tarefas: tarefas.map(t => ({
                id: t.id_tarefa,
                titulo: t.titulo,
                descricao: t.descricao,
                recompensaKz: parseFloat(t.recompensa),
                categoria: t.categoria === 'save' ? 'Casa' : (t.categoria === 'spend' ? 'Pessoal' : 'Escola'),
                dificuldade: mapearDificuldade(t.recompensa),
                icone: t.icone || '📋',
                tempoEstimado: '15 min',
                status: t.status === 'aprovada' ? 'Ativa' : (t.status === 'pendente' ? 'Ativa' : 'Inativa'),
                vezesCompletada: 0,
                crianca: t.Criancum ? {
                    id: t.Criancum.id_crianca,
                    nome: t.Criancum.nome_completo
                } : null,
                responsavel: t.Responsavel ? {
                    id: t.Responsavel.id_responsavel,
                    nome: t.Responsavel.nome_completo
                } : null,
                criado_em: t.createdAt,
                concluido_em: t.concluido_em,
                foto_url: t.foto_comprovacao
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/tarefas/criancas/:criancaId
// Lista tarefas de uma criança específica (DIFERENTE do listarTarefas)
// ============================================
exports.listarTarefasPorCrianca = async (req, res) => {
    try {
        const { criancaId } = req.params;
        
        const crianca = await Criancas.findByPk(criancaId);
        if (!crianca) {
            return res.status(404).json({ erro: "CRIANCA_NAO_ENCONTRADA" });
        }

        const tarefas = await Tarefa.findAll({
            where: { id_crianca: criancaId },
            include: [{ model: Responsavel, attributes: ['nome_completo'] }],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            crianca: {
                id: crianca.id_crianca,
                nome: crianca.nome_completo,
                idade: crianca.idade,
                nivel: crianca.nivel,
                responsavel: crianca.Responsavel?.nome_completo
            },
            total: tarefas.length,
            tarefas: tarefas.map(t => ({
                id: t.id_tarefa,
                titulo: t.titulo,
                descricao: t.descricao,
                recompensa: parseFloat(t.recompensa),
                categoria: t.categoria,
                icone: t.icone,
                status: t.status,
                criado_em: t.createdAt,
                concluido_em: t.concluido_em,
                aprovado_em: t.aprovado_em,
                foto_url: t.foto_comprovacao
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/criancas/para-tarefas
// Lista crianças para o select no modal (NOVA função)
// ============================================
exports.listarCriancasParaTarefas = async (req, res) => {
    try {
        const criancas = await Criancas.findAll({
            attributes: ['id_crianca', 'nome_completo', 'idade'],
            include: [{
                model: Responsavel,
                attributes: ['nome_completo']
            }],
            order: [['nome_completo', 'ASC']]
        });
        
        res.json({
            criancas: criancas.map(c => ({
                id: c.id_crianca,
                nome: c.nome_completo,
                idade: c.idade,
                responsavel: c.Responsavel?.nome_completo
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// POST /api/admin/tarefas
// ============================================
exports.criarTarefa = async (req, res) => {
    try {
        const { titulo, descricao, recompensa, categoria, icone, crianca_id } = req.body;

        const crianca = await Criancas.findByPk(crianca_id);
        if (!crianca) {
            return res.status(404).json({ erro: "CRIANCA_NAO_ENCONTRADA" });
        }

        const tarefa = await Tarefa.create({
            titulo,
            descricao,
            recompensa: parseFloat(recompensa),
            categoria: categoria === 'Casa' ? 'save' : (categoria === 'Pessoal' ? 'spend' : 'help'),
            icone: icone || 'clipboard',
            id_crianca: crianca_id,
            id_responsavel: crianca.id_responsavel,
            status: 'pendente'
        });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "CRIAR",
            entidade: "tarefa",
            id_entidade: tarefa.id_tarefa,
            detalhes: JSON.stringify({ titulo, crianca_id })
        });

        res.status(201).json({ mensagem: "Tarefa criada com sucesso!", tarefa });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// PUT /api/admin/tarefas/:id
// ============================================
exports.atualizarTarefa = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const tarefa = await Tarefa.findByPk(id);
        if (!tarefa) {
            return res.status(404).json({ erro: "TAREFA_NAO_ENCONTRADA" });
        }

        await tarefa.update({
            titulo: updates.titulo || tarefa.titulo,
            descricao: updates.descricao || tarefa.descricao,
            recompensa: updates.recompensa || tarefa.recompensa,
            icone: updates.icone || tarefa.icone
        });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "ATUALIZAR",
            entidade: "tarefa",
            id_entidade: id
        });

        res.json({ mensagem: "Tarefa atualizada com sucesso!" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// DELETE /api/admin/tarefas/:id
// ============================================
exports.deletarTarefa = async (req, res) => {
    try {
        const { id } = req.params;
        const tarefa = await Tarefa.findByPk(id);
        
        if (!tarefa) {
            return res.status(404).json({ erro: "TAREFA_NAO_ENCONTRADA" });
        }

        await tarefa.destroy();

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "DELETAR",
            entidade: "tarefa",
            id_entidade: id
        });

        res.json({ mensagem: "Tarefa removida com sucesso!" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// PATCH /api/admin/tarefas/:id/status
// ============================================
exports.alterarStatusTarefa = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const tarefa = await Tarefa.findByPk(id);
        if (!tarefa) {
            return res.status(404).json({ erro: "TAREFA_NAO_ENCONTRADA" });
        }

        const novoStatus = status === 'Ativa' ? 'pendente' : 'rejeitada';
        await tarefa.update({ status: novoStatus });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "ALTERAR_STATUS",
            entidade: "tarefa",
            id_entidade: id,
            detalhes: JSON.stringify({ status })
        });

        res.json({ mensagem: `Status da tarefa alterado para ${status}` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// Função auxiliar
function mapearDificuldade(recompensa) {
    if (recompensa < 200) return 'Fácil';
    if (recompensa < 400) return 'Média';
    return 'Difícil';
}