const {Conteudo} = require("../models/VideoAssistido");
const {ConteudoAssistido} = require("../models/VideoAssistido");
const LogAdmin = require("../models/LogAdmin");

// ============================================
// GET /api/admin/conteudo
// ============================================
exports.listarConteudos = async (req, res) => {
    try {
        const { tipo, faixa_etaria, topico } = req.query;
        const where = {};

        if (tipo) where.tipo = tipo;
        if (faixa_etaria) where.faixa_etaria = faixa_etaria;
        if (topico) where.topico = topico;

        const conteudos = await Conteudo.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });

        res.json({ total: conteudos.length, conteudos });
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// POST /api/admin/conteudo
// ============================================
exports.criarConteudo = async (req, res) => {
    try {
        const {
            titulo, descricao, tipo, faixa_etaria,
            thumbnail_url, url, duracao, topico, xp_recompensa, id_missao
        } = req.body;

        const novoConteudo = await Conteudo.create({
            titulo, descricao, tipo, faixa_etaria,
            thumbnail_url, url, duracao, topico, xp_recompensa, id_missao
        });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "CRIAR",
            entidade: "conteudo",
            id_entidade: novoConteudo.id_conteudo,
            detalhes: JSON.stringify({ titulo, id_missao })
        });

        res.status(201).json(novoConteudo);
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// PUT /api/admin/conteudo/:id
// ============================================
exports.atualizarConteudo = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const conteudo = await Conteudo.findByPk(id);
        if (!conteudo) {
            return res.status(404).json({ erro: "CONTEUDO_NAO_ENCONTRADO" });
        }

        await conteudo.update(updates);

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "ATUALIZAR",
            entidade: "conteudo",
            id_entidade: id,
            detalhes: JSON.stringify(updates)
        });

        res.json(conteudo);
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// DELETE /api/admin/conteudo/:id
// ============================================
exports.deletarConteudo = async (req, res) => {
    try {
        const { id } = req.params;
        const conteudo = await Conteudo.findByPk(id);
        
        if (!conteudo) {
            return res.status(404).json({ erro: "CONTEUDO_NAO_ENCONTRADO" });
        }

        await conteudo.destroy();

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "DELETAR",
            entidade: "conteudo",
            id_entidade: id,
            detalhes: JSON.stringify({ titulo: conteudo.titulo })
        });

        res.json({ mensagem: "Conteúdo deletado com sucesso" });
    } catch (error) {
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// controllers/adminConteudoController.js
exports.listarConteudosComViews = async (req, res) => {
    try {
        const { tipo, faixa_etaria } = req.query;
        const where = {};
        if (tipo) where.tipo = tipo;
        if (faixa_etaria) where.faixa_etaria = faixa_etaria;

        const conteudos = await Conteudo.findAll({
            where,
            include: [{
                model: ConteudoAssistido,
                attributes: ['id_crianca'],
                required: false
            }],
            order: [['createdAt', 'DESC']]
        });

        const resultado = conteudos.map(c => ({
            id: c.id_conteudo,
            titulo: c.titulo,
            descricao: c.descricao,
            url: c.url,
            thumbnail: c.thumbnail_url,
            duracao: c.duracao,
            categoria: c.tipo,
            faixa_etaria: c.faixa_etaria,
            id_missao: c.id_missao,
            visualizacoes: c.conteudo_assistidos?.length || 0,
            status: c.status !== false ? "Ativo" : "Inativo"
        }));

        res.json({ total: resultado.length, videos: resultado });

    } catch (error) {
        console.error("Erro listar conteudos:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};