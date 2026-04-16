const { Op } = require("sequelize");
const sequelize = require("../config/database"); 
const Responsavel = require("../models/Responsavel");
const Criancas = require("../models/Criancas");
const LogAdmin = require("../models/LogAdmin");

// ============================================
// GET /api/admin/utilizadores/responsaveis
// Lista todos os responsáveis com filtros
// ============================================
exports.listarResponsaveis = async (req, res) => {
    try {
        const { busca, provincia, municipio, status, pagina = 1, limite = 20 } = req.query;
        const where = {};

        if (busca) {
            where[Op.or] = [
                { nome_completo: { [Op.like]: `%${busca}%` } },
                { email: { [Op.like]: `%${busca}%` } }
            ];
        }
        if (provincia) where.provincia = provincia;
        if (municipio) where.municipio = municipio;
        if (status === 'Ativo') where.ativo = true;
        if (status === 'Inativo') where.ativo = false;

        const offset = (pagina - 1) * limite;
        
        const { count, rows: responsaveis } = await Responsavel.findAndCountAll({
            where,
            include: [{
                model: Criancas,
                as: 'criancas',
                attributes: ['id_crianca', 'nome_completo', 'idade', 'nivel', 'saldo_gastar', 'saldo_poupar', 'saldo_ajudar']
            }],
            order: [['id_responsavel', 'DESC']],
            limit: parseInt(limite),
            offset
        });

        // Formatar resposta conforme frontend
        const usuarios = responsaveis.map(r => ({
            id: r.id_responsavel,
            nome: r.nome_completo,
            email: r.email,
            telefone: r.telefone,
            provincia: r.provincia,
            municipio: r.municipio,
            tipo: "Pai",
            status: r.ativo !== false ? "Ativo" : "Inativo",
            dataCadastro: r.createdAt,
            saldoKz: 0, // Responsável não tem saldo diretamente
            dependentes: r.criancas?.map(c => ({
                id: c.id_crianca,
                nome: c.nome_completo,
                idade: c.idade,
                nivel: c.nivel,
                saldos: {
                    gastar: parseFloat(c.saldo_gastar),
                    poupar: parseFloat(c.saldo_poupar),
                    ajudar: parseFloat(c.saldo_ajudar),
                    total: parseFloat(c.saldo_gastar) + parseFloat(c.saldo_poupar) + parseFloat(c.saldo_ajudar)
                }
            })) || []
        }));

        res.json({
            total: count,
            pagina: parseInt(pagina),
            totalPaginas: Math.ceil(count / limite),
            usuarios
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/utilizadores/responsaveis/:id/dependentes
// Lista dependentes de um responsável específico
// ============================================
exports.listarDependentes = async (req, res) => {
    try {
        const { id } = req.params;
        
        const responsavel = await Responsavel.findByPk(id);
        if (!responsavel) {
            return res.status(404).json({ erro: "RESPONSAVEL_NAO_ENCONTRADO" });
        }

        const dependentes = await Criancas.findAll({
            where: { id_responsavel: id },
            attributes: ['id_crianca', 'nome_completo', 'idade', 'nivel', 'saldo_gastar', 'saldo_poupar', 'saldo_ajudar', 'xp', 'provincia', 'municipio']
        });

        res.json({
            responsavel: {
                id: responsavel.id_responsavel,
                nome: responsavel.nome_completo,
                email: responsavel.email
            },
            total: dependentes.length,
            dependentes: dependentes.map(c => ({
                id: c.id_crianca,
                nome: c.nome_completo,
                idade: c.idade,
                nivel: c.nivel,
                xp: c.xp,
                provincia: c.provincia,
                municipio: c.municipio,
                saldos: {
                    gastar: parseFloat(c.saldo_gastar),
                    poupar: parseFloat(c.saldo_poupar),
                    ajudar: parseFloat(c.saldo_ajudar),
                    total: parseFloat(c.saldo_gastar) + parseFloat(c.saldo_poupar) + parseFloat(c.saldo_ajudar)
                }
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/utilizadores/criancas
// Lista todas as crianças com filtros
// ============================================
exports.listarCriancas = async (req, res) => {
    try {
        const { busca, provincia, municipio, idade_min, idade_max, pagina = 1, limite = 20 } = req.query;
        const where = {};

        if (busca) {
            where.nome_completo = { [Op.like]: `%${busca}%` };
        }
        if (provincia) where.provincia = provincia;
        if (municipio) where.municipio = municipio;
        if (idade_min) where.idade = { [Op.gte]: parseInt(idade_min) };
        if (idade_max) where.idade = { ...where.idade, [Op.lte]: parseInt(idade_max) };

        const offset = (pagina - 1) * limite;
        
        const { count, rows: criancas } = await Criancas.findAndCountAll({
            where,
            include: [{
                model: Responsavel,
                attributes: ['id_responsavel', 'nome_completo', 'email', 'telefone']
            }],
            order: [['id_crianca', 'DESC']],
            limit: parseInt(limite),
            offset
        });

        const usuarios = criancas.map(c => ({
            id: c.id_crianca,
            nome: c.nome_completo,
            email: c.nome_usuario,
            telefone: c.Responsavel?.telefone || '-',
            provincia: c.provincia,
            municipio: c.municipio,
            tipo: "Criança",
            status: "Ativo",
            dataCadastro: c.createdAt,
            saldoKz: parseFloat(c.saldo_gastar) + parseFloat(c.saldo_poupar) + parseFloat(c.saldo_ajudar),
            responsavel: c.Responsavel ? {
                id: c.Responsavel.id_responsavel,
                nome: c.Responsavel.nome_completo,
                email: c.Responsavel.email
            } : null
        }));

        res.json({
            total: count,
            pagina: parseInt(pagina),
            totalPaginas: Math.ceil(count / limite),
            usuarios
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/utilizadores/criancas/:id/responsavel
// Busca o responsável de uma criança
// ============================================
exports.buscarResponsavel = async (req, res) => {
    try {
        const { id } = req.params;
        
        const crianca = await Criancas.findByPk(id, {
            include: [{ model: Responsavel }]
        });
        
        if (!crianca) {
            return res.status(404).json({ erro: "CRIANCA_NAO_ENCONTRADA" });
        }

        res.json({
            crianca: {
                id: crianca.id_crianca,
                nome: crianca.nome_completo
            },
            responsavel: crianca.Responsavel ? {
                id: crianca.Responsavel.id_responsavel,
                nome: crianca.Responsavel.nome_completo,
                email: crianca.Responsavel.email,
                telefone: crianca.Responsavel.telefone
            } : null
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// PATCH /api/admin/utilizadores/criancas/:id/status
// ============================================
exports.alterarStatusCrianca = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const crianca = await Criancas.findByPk(id);
        if (!crianca) {
            return res.status(404).json({ erro: "CRIANCA_NAO_ENCONTRADA" });
        }

        await crianca.update({ ativo: status === 'Ativo' });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: status === 'Ativo' ? "ATIVAR" : "DESATIVAR",
            entidade: "crianca",
            id_entidade: id,
            detalhes: JSON.stringify({ nome: crianca.nome_completo, status })
        });

        res.json({ mensagem: `Criança ${status.toLowerCase()} com sucesso` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// DELETE /api/admin/utilizadores/responsaveis/:id
// DELETA PERMANENTEMENTE (não apenas desativa)
// ============================================
exports.deletarResponsavel = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const responsavel = await Responsavel.findByPk(id, { transaction });
        
        if (!responsavel) {
            await transaction.rollback();
            return res.status(404).json({ erro: "RESPONSAVEL_NAO_ENCONTRADO" });
        }

        // Deletar crianças primeiro (por causa da FK)
        await Criancas.destroy({ where: { id_responsavel: id }, transaction });
        
        // Deletar responsável
        await responsavel.destroy({ transaction });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "DELETAR",
            entidade: "responsavel",
            id_entidade: id,
            detalhes: JSON.stringify({ nome: responsavel.nome_completo })
        }, { transaction });

        await transaction.commit();
        res.json({ mensagem: "Responsável deletado permanentemente com sucesso" });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// PATCH /api/admin/utilizadores/responsaveis/:id/desativar
// DESATIVA (não deleta)
// ============================================
exports.desativarResponsavel = async (req, res) => {
    try {
        const { id } = req.params;
        const responsavel = await Responsavel.findByPk(id);
        
        if (!responsavel) {
            return res.status(404).json({ erro: "RESPONSAVEL_NAO_ENCONTRADO" });
        }

        await responsavel.update({ ativo: false });
        await Criancas.update({ ativo: false }, { where: { id_responsavel: id } });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "DESATIVAR",
            entidade: "responsavel",
            id_entidade: id,
            detalhes: JSON.stringify({ nome: responsavel.nome_completo })
        });

        res.json({ mensagem: "Responsável desativado com sucesso" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// PATCH /api/admin/utilizadores/responsaveis/:id/ativar
// ATIVA
// ============================================
exports.ativarResponsavel = async (req, res) => {
    try {
        const { id } = req.params;
        const responsavel = await Responsavel.findByPk(id);
        
        if (!responsavel) {
            return res.status(404).json({ erro: "RESPONSAVEL_NAO_ENCONTRADO" });
        }

        await responsavel.update({ ativo: true });
        await Criancas.update({ ativo: true }, { where: { id_responsavel: id } });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "ATIVAR",
            entidade: "responsavel",
            id_entidade: id
        });

        res.json({ mensagem: "Responsável ativado com sucesso" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

