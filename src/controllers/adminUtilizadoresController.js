const { Op } = require("sequelize");
const sequelize = require("../config/database"); 
const Responsavel = require("../models/Responsavel");
const Criancas = require("../models/Criancas");
const LogAdmin = require("../models/LogAdmin");
const Tarefa = require("../models/Tarefa");
const Historico = require("../models/HistoricoTransacao");
const Doacoes = require("../models/Doacoes");
const ProgressoMissao = require("../models/ProgressoMissao");
const { ConteudoAssistido } = require("../models/VideoAssistido");
const CriancaShopItem = require("../models/CriancaShopItem");
const RespostaUsuario = require("../models/RespostaUsuario");
const Missao = require("../models/Missoes");

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
        const { busca, provincia, municipio, idade_min, idade_max, ordenar, pagina = 1, limite = 20 } = req.query;
        const where = {};

        if (busca) {
            where.nome_completo = { [Op.like]: `%${busca}%` };
        }
        if (provincia) where.provincia = provincia;
        if (municipio) where.municipio = municipio;
        if (idade_min) where.idade = { [Op.gte]: parseInt(idade_min) };
        if (idade_max) where.idade = { ...where.idade, [Op.lte]: parseInt(idade_max) };

        let order = [['id_crianca', 'DESC']];
        if (ordenar === 'poupam') order = [['saldo_poupar', 'DESC']];
        else if (ordenar === 'gastam') order = [['saldo_gastar', 'DESC']];
        else if (ordenar === 'doam') order = [['saldo_ajudar', 'DESC']];

        const offset = (pagina - 1) * limite;
        
        const { count, rows: criancas } = await Criancas.findAndCountAll({
            where,
            include: [{
                model: Responsavel,
                attributes: ['id_responsavel', 'nome_completo', 'email', 'telefone']
            }],
            order,
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
            status: c.ativo !== false ? "Ativo" : "Inativo",
            dataCadastro: c.createdAt,
            idade: c.idade,
            nivel: c.nivel,
            saldo_gastar: parseFloat(c.saldo_gastar || 0),
            saldo_poupar: parseFloat(c.saldo_poupar || 0),
            saldo_ajudar: parseFloat(c.saldo_ajudar || 0),
            saldoKz: parseFloat(c.saldo_gastar || 0) + parseFloat(c.saldo_poupar || 0) + parseFloat(c.saldo_ajudar || 0),
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

        // 1. Coletar IDs de todas as crianças para deletar registros relacionados
        const criancas = await Criancas.findAll({ where: { id_responsavel: id }, transaction });
        const idsCriancas = criancas.map(c => c.id_crianca);

        // 2. Deletar Tarefas associadas ao responsável (ou aos seus dependentes)
        // Deletamos primeiro as tarefas pois elas podem referenciar missões ou crianças
        await Tarefa.destroy({ 
            where: { 
                [Op.or]: [
                    { id_responsavel: id },
                    { id_crianca: idsCriancas }
                ]
            }, 
            transaction 
        });

        if (idsCriancas.length > 0) {
            // 3. Deletar registros relacionados às crianças
            await Historico.destroy({ where: { id_crianca: idsCriancas }, transaction });
            await Doacoes.destroy({ where: { id_crianca: idsCriancas }, transaction });
            await ProgressoMissao.destroy({ where: { id_crianca: idsCriancas }, transaction });
            await ConteudoAssistido.destroy({ where: { id_crianca: idsCriancas }, transaction });
            await CriancaShopItem.destroy({ where: { id_crianca: idsCriancas }, transaction });
            await RespostaUsuario.destroy({ where: { id_crianca: idsCriancas }, transaction });
            
            // 4. Deletar missões atribuídas especificamente às crianças
            await Missao.destroy({ where: { id_crianca: idsCriancas }, transaction });

            // 5. Deletar as crianças
            await Criancas.destroy({ where: { id_responsavel: id }, transaction });
        }
        
        // 6. Deletar missões criadas pelo responsável
        await Missao.destroy({ where: { id_responsavel: id }, transaction });

        // 7. Deletar responsável
        await responsavel.destroy({ transaction });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "DELETAR",
            entidade: "responsavel",
            id_entidade: id,
            detalhes: JSON.stringify({ nome: responsavel.nome_completo })
        }, { transaction });

        await transaction.commit();
        res.json({ mensagem: "Responsável e dependentes deletados com sucesso" });

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

// ============================================
// PUT /api/admin/utilizadores/responsaveis/:id
// ============================================
exports.atualizarResponsavel = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, telefone, provincia, municipio } = req.body;

        const responsavel = await Responsavel.findByPk(id);
        if (!responsavel) {
            return res.status(404).json({ erro: "RESPONSAVEL_NAO_ENCONTRADO" });
        }

        await responsavel.update({
            nome_completo: nome || responsavel.nome_completo,
            email: email || responsavel.email,
            telefone: telefone || responsavel.telefone,
            provincia: provincia || responsavel.provincia,
            municipio: municipio || responsavel.municipio
        });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "ATUALIZAR",
            entidade: "responsavel",
            id_entidade: id,
            detalhes: JSON.stringify({ nome: responsavel.nome_completo })
        });

        res.json({ mensagem: "Responsável atualizado com sucesso", responsavel });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// PUT /api/admin/utilizadores/criancas/:id
// ============================================
exports.atualizarCrianca = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, idade, nivel, provincia, municipio, saldo_gastar, saldo_poupar, saldo_ajudar } = req.body;

        const crianca = await Criancas.findByPk(id);
        if (!crianca) {
            return res.status(404).json({ erro: "CRIANCA_NAO_ENCONTRADA" });
        }

        await crianca.update({
            nome_completo: nome || crianca.nome_completo,
            idade: idade !== undefined ? idade : crianca.idade,
            nivel: nivel || crianca.nivel,
            provincia: provincia || crianca.provincia,
            municipio: municipio || crianca.municipio,
            saldo_gastar: saldo_gastar !== undefined ? saldo_gastar : crianca.saldo_gastar,
            saldo_poupar: saldo_poupar !== undefined ? saldo_poupar : crianca.saldo_poupar,
            saldo_ajudar: saldo_ajudar !== undefined ? saldo_ajudar : crianca.saldo_ajudar
        });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "ATUALIZAR",
            entidade: "crianca",
            id_entidade: id,
            detalhes: JSON.stringify({ nome: crianca.nome_completo })
        });

        res.json({ mensagem: "Criança atualizada com sucesso", crianca });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// DELETE /api/admin/utilizadores/criancas/:id
// ============================================
exports.deletarCrianca = async (req, res) => {
    try {
        const { id } = req.params;
        const crianca = await Criancas.findByPk(id);
        
        if (!crianca) {
            return res.status(404).json({ erro: "CRIANCA_NAO_ENCONTRADA" });
        }

        const transaction = await sequelize.transaction();
        try {
            // Deletar registros relacionados
            await Tarefa.destroy({ where: { id_crianca: id }, transaction });
            await Historico.destroy({ where: { id_crianca: id }, transaction });
            await Doacoes.destroy({ where: { id_crianca: id }, transaction });
            await ProgressoMissao.destroy({ where: { id_crianca: id }, transaction });
            await ConteudoAssistido.destroy({ where: { id_crianca: id }, transaction });
            await CriancaShopItem.destroy({ where: { id_crianca: id }, transaction });
            await RespostaUsuario.destroy({ where: { id_crianca: id }, transaction });
            await Missao.destroy({ where: { id_crianca: id }, transaction });

            await crianca.destroy({ transaction });

            await LogAdmin.create({
                id_admin: req.usuario.id,
                acao: "DELETAR",
                entidade: "crianca",
                id_entidade: id,
                detalhes: JSON.stringify({ nome: crianca.nome_completo })
            }, { transaction });

            await transaction.commit();
            res.json({ mensagem: "Criança deletada com sucesso" });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

