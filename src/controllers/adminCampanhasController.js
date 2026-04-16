// controllers/adminCampanhasController.js
const { Op } = require("sequelize");
const Campanha = require("../models/Campanha");
const Doacoes = require("../models/Doacoes");
const LogAdmin = require("../models/LogAdmin");

// ============================================
// GET /api/admin/campanhas
// ============================================
exports.listarCampanhas = async (req, res) => {
    try {
        const { status, causa } = req.query;
        const where = {};

        if (status !== undefined) where.status = status === 'true';
        if (causa) where.causa = causa;

        const campanhas = await Campanha.findAll({
            where,
            order: [['id_campanha', 'DESC']]
        });

        // Calcular métricas adicionais
        const campanhasComMetricas = await Promise.all(campanhas.map(async (c) => {
            const doadores = await Doacoes.count({
                where: { id_campanha: c.id_campanha },
                distinct: true,
                col: 'id_crianca'
            });

            return {
                id: c.id_campanha,
                titulo: c.nome,
                descricao: c.descricao,
                imagemCapa: c.imagem_url,
                categoria: mapearCategoriaFrontend(c.causa),
                metaKz: parseFloat(c.meta_valor),
                arrecadadoKz: parseFloat(c.valor_arrecadado),
                percentualAtingido: (parseFloat(c.valor_arrecadado) / parseFloat(c.meta_valor)) * 100,
                dataInicio: c.date_inicio,
                dataFim: c.date_fim,
                status: c.status ? 'Ativa' : 'Pausada',
                numeroDoadores: doadores,
                organizacao: c.organizacao,
                localizacao: c.localizacao || '',
                dataCriacao: c.createdAt
            };
        }));

        res.json({ total: campanhas.length, campanhas: campanhasComMetricas });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/campanhas/metricas
// Métricas agregadas para os cards do dashboard
// ============================================
exports.metricasCampanhas = async (req, res) => {
    try {
        const campanhasAtivas = await Campanha.findAll({ where: { status: true } });
        const totalDoadores = await Doacoes.count({ distinct: true, col: 'id_crianca' });
        const totalMeta = campanhasAtivas.reduce((sum, c) => sum + parseFloat(c.meta_valor), 0);
        const totalArrecadado = campanhasAtivas.reduce((sum, c) => sum + parseFloat(c.valor_arrecadado), 0);

        res.json({
            total_campanhas_ativas: campanhasAtivas.length,
            total_doadores: totalDoadores,
            total_meta: totalMeta,
            total_arrecadado: totalArrecadado
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// POST /api/admin/campanhas
// ============================================
exports.criarCampanha = async (req, res) => {
    try {
        const {
            titulo, descricao, categoria, metaKz,
            organizacao, localizacao, dataInicio, dataFim, imagemCapa
        } = req.body;

        const novaCampanha = await Campanha.create({
            nome: titulo,
            descricao: descricao,
            causa: mapearCategoriaBackend(categoria),
            meta_valor: metaKz,
            organizacao: organizacao,
            localizacao: localizacao,
            date_inicio: dataInicio || new Date(),
            date_fim: dataFim || new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            imagem_url: imagemCapa,
            status: true,
            valor_arrecadado: 0
        });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "CRIAR",
            entidade: "campanha",
            id_entidade: novaCampanha.id_campanha,
            detalhes: JSON.stringify({ titulo, metaKz })
        });

        res.status(201).json({ mensagem: "Campanha criada com sucesso!", campanha: novaCampanha });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// PUT /api/admin/campanhas/:id
// ============================================
exports.atualizarCampanha = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const campanha = await Campanha.findByPk(id);
        if (!campanha) {
            return res.status(404).json({ erro: "CAMPANHA_NAO_ENCONTRADA" });
        }

        await campanha.update({
            nome: updates.titulo || campanha.nome,
            descricao: updates.descricao || campanha.descricao,
            meta_valor: updates.metaKz || campanha.meta_valor,
            organizacao: updates.organizacao || campanha.organizacao,
            date_fim: updates.dataFim || campanha.date_fim,
            imagem_url: updates.imagemCapa || campanha.imagem_url
        });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "ATUALIZAR",
            entidade: "campanha",
            id_entidade: id
        });

        res.json({ mensagem: "Campanha atualizada com sucesso!" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// PATCH /api/admin/campanhas/:id/status
// ============================================
exports.alterarStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const campanha = await Campanha.findByPk(id);
        if (!campanha) {
            return res.status(404).json({ erro: "CAMPANHA_NAO_ENCONTRADA" });
        }

        await campanha.update({ status: status === 'Ativa' });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: status === 'Ativa' ? "ATIVAR" : "DESATIVAR",
            entidade: "campanha",
            id_entidade: id
        });

        res.json({ mensagem: `Campanha ${status.toLowerCase()} com sucesso!` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// DELETE /api/admin/campanhas/:id
// ============================================
exports.deletarCampanha = async (req, res) => {
    try {
        const { id } = req.params;

        const campanha = await Campanha.findByPk(id);
        if (!campanha) {
            return res.status(404).json({ erro: "CAMPANHA_NAO_ENCONTRADA" });
        }

        await campanha.destroy();

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "DELETAR",
            entidade: "campanha",
            id_entidade: id
        });

        res.json({ mensagem: "Campanha removida com sucesso!" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// Funções auxiliares
function mapearCategoriaFrontend(causa) {
    const mapa = {
        'educacao': 'Educação',
        'saude': 'Saúde',
        'ambiente': 'Meio Ambiente',
        'alimentacao': 'Comunidade',
        'outro': 'Outro'
    };
    return mapa[causa] || 'Educação';
}

function mapearCategoriaBackend(categoria) {
    const mapa = {
        'Educação': 'educacao',
        'Saúde': 'saude',
        'Meio Ambiente': 'ambiente',
        'Comunidade': 'alimentacao'
    };
    return mapa[categoria] || 'outro';
}