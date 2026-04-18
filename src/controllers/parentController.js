// controllers/parentController.js
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Criancas = require("../models/Criancas");
const Tarefa = require("../models/Tarefa");
const Missao = require("../models/Missoes");
const Campanha = require("../models/Campanha");
const Historico = require("../models/HistoricoTransacao");
const Responsavel = require("../models/Responsavel");
const bcrypt = require("bcrypt");

// ============================================
// FUNÇÕES AUXILIARES (DEFINIDAS ANTES DE SEREM USADAS)
// ============================================

function calcularTaxaPoupancaMedia(criancas) {
    if (!criancas.length) return 0;
    let total = 0;
    for (const c of criancas) {
        const totalSaldo = parseFloat(c.saldo_gastar) + parseFloat(c.saldo_poupar) + parseFloat(c.saldo_ajudar);
        if (totalSaldo > 0) {
            total += (parseFloat(c.saldo_poupar) / totalSaldo) * 100;
        }
    }
    return Math.round(total / criancas.length);
}

async function calcularDesempenhoMensal(criancasIds) {
    try {
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const hoje = new Date();
        const ano = hoje.getFullYear();
        
        const resultados = [];
        
        for (let i = 0; i < 12; i++) {
            const dataInicio = new Date(ano, i, 1);
            const dataFim = new Date(ano, i + 1, 0);
            
            // 🔧 CORREÇÃO: Usar 'createdAt' em vez de 'data_hora'
            const historicos = await Historico.findAll({
                where: {
                    id_crianca: { [Op.in]: criancasIds },
                    createdAt: {
                        [Op.between]: [dataInicio, dataFim]
                    }
                }
            });
            
            const poupado = historicos.filter(h => h.tipo === 'poupar').reduce((sum, h) => sum + parseFloat(h.valor), 0);
            const gasto = historicos.filter(h => h.tipo === 'gastar').reduce((sum, h) => sum + parseFloat(h.valor), 0);
            const ajudou = historicos.filter(h => h.tipo === 'doar').reduce((sum, h) => sum + parseFloat(h.valor), 0);
            
            resultados.push({
                mes: meses[i],
                poupado,
                gasto,
                ajudou
            });
        }
        
        return resultados;
    } catch (error) {
        console.error("Erro ao calcular desempenho mensal:", error);
        // Retornar dados vazios em caso de erro
        return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(mes => ({
            mes,
            poupado: 0,
            gasto: 0,
            ajudou: 0
        }));
    }
}

async function calcularDesempenhoSemanal(childId) {
    try {
        const semanas = ['S1', 'S2', 'S3', 'S4'];
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        const resultados = [];
        
        for (let i = 0; i < 4; i++) {
            const inicioSemana = new Date(inicioMes);
            inicioSemana.setDate(inicioMes.getDate() + (i * 7));
            const fimSemana = new Date(inicioSemana);
            fimSemana.setDate(inicioSemana.getDate() + 6);
            
            const tarefas = await Tarefa.findAll({
                where: {
                    id_crianca: childId,
                    status: 'aprovada',
                    aprovado_em: {
                        [Op.between]: [inicioSemana, fimSemana]
                    }
                }
            });
            
            const ganhou = tarefas.reduce((sum, t) => sum + parseFloat(t.recompensa), 0);
            
            resultados.push({
                semana: semanas[i],
                tarefas: tarefas.length,
                ganhou
            });
        }
        
        return resultados;
    } catch (error) {
        console.error("Erro ao calcular desempenho semanal:", error);
        return [
            { semana: "S1", tarefas: 0, ganhou: 0 },
            { semana: "S2", tarefas: 0, ganhou: 0 },
            { semana: "S3", tarefas: 0, ganhou: 0 },
            { semana: "S4", tarefas: 0, ganhou: 0 }
        ];
    }
}

function mapearPoteAfetado(tipo) {
    const mapa = {
        tarefa: "gastar",
        gastar: "gastar",
        poupar: "poupar",
        doar: "ajudar",
        bonus_gestao: "poupar"
    };
    return mapa[tipo] || "gastar";
}

// ============================================
// FUNÇÕES DO CONTROLLER (EXPORTS)
// ============================================

// GET /api/parent/dashboard
exports.dashboard = async (req, res) => {
    try {
        const responsavelId = req.usuario.id;

        const criancas = await Criancas.findAll({
            where: { id_responsavel: responsavelId }
        });

        const criancasIds = criancas.map(c => c.id_crianca);

        // Tarefas pendentes de aprovação
        const tarefasPendentes = await Tarefa.findAll({
            where: {
                id_crianca: { [Op.in]: criancasIds },
                status: "aguardando_aprovacao"
            },
            include: [{ model: Criancas, attributes: ['nome_completo'] }]
        });

        // Missões ativas
        const missoesAtivas = await Missao.findAll({
            where: {
                id_crianca: { [Op.in]: criancasIds },
                ativa: true,
                concluida: false
            }
        });

        // Campanhas ativas
        const campanhasAtivas = await Campanha.findAll({
            where: { 
                status: true,
                date_fim: { [Op.gte]: new Date() }
            }
        });

        // 🔧 CALCULAR DESEMPENHO MENSAL (AGORA DEFINIDO)
        const desempenhoMensal = await calcularDesempenhoMensal(criancasIds);

        const dependentes = criancas.map(c => ({
            id: c.id_crianca,
            nome: c.nome_completo,
            idade: c.idade,
            nivel: c.nivel,
            potes: {
                saldo_gastar: parseFloat(c.saldo_gastar),
                saldo_poupar: parseFloat(c.saldo_poupar),
                saldo_ajudar: parseFloat(c.saldo_ajudar),
                total: parseFloat(c.saldo_gastar) + parseFloat(c.saldo_poupar) + parseFloat(c.saldo_ajudar)
            }
        }));

        res.json({
            resumo: {
                total_dependentes: criancas.length,
                tarefas_aguardando_aprovacao: tarefasPendentes.length,
                taxa_poupanca_media: calcularTaxaPoupancaMedia(criancas)
            },
            dependentes,
            tarefas_pendentes_aprovacao: tarefasPendentes.map(t => ({
                id: t.id_tarefa,
                titulo: t.titulo,
                descricao: t.descricao,
                recompensa: parseFloat(t.recompensa),
                status: t.status,
                crianca_id: t.id_crianca,
                foto_url: t.foto_comprovacao ? `/uploads/${t.foto_comprovacao}` : null,
                concluido_em: t.concluido_em
            })),
            missoes_ativas: missoesAtivas.map(m => ({
                id: m.id_missao,
                titulo: m.titulo,
                objetivo_valor: parseFloat(m.objetivo_valor),
                progresso_atual: parseFloat(m.progresso_atual),
                crianca_id: m.id_crianca
            })),
            campanhas_ativas: campanhasAtivas.map(c => ({
                id: c.id_campanha,
                titulo: c.nome,
                organizacao: c.organizacao || "Kamba Kid Pay"
            })),
            desempenho_mensal: desempenhoMensal
        });

    } catch (error) {
        console.error("Erro no dashboard:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// GET /api/parent/children
exports.listChildren = async (req, res) => {
    try {
        const criancas = await Criancas.findAll({
            where: { id_responsavel: req.usuario.id }
        });

        res.json({
            dependentes: criancas.map(c => ({
                id: c.id_crianca,
                nome: c.nome_completo,
                idade: c.idade,
                nivel: c.nivel,
                potes: {
                    saldo_gastar: parseFloat(c.saldo_gastar),
                    saldo_poupar: parseFloat(c.saldo_poupar),
                    saldo_ajudar: parseFloat(c.saldo_ajudar),
                    total: parseFloat(c.saldo_gastar) + parseFloat(c.saldo_poupar) + parseFloat(c.saldo_ajudar)
                }
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// POST /api/parent/children
exports.addChild = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { nome, idade, username, pin, distribuicao_potes, provincia, municipio } = req.body;

        if (!nome || !idade || !username || !pin) {
            await transaction.rollback();
            return res.status(400).json({ 
                erro: "CAMPOS_OBRIGATORIOS", 
                mensagem: "Preencha todos os campos obrigatórios." 
            });
        }

        if (pin.length !== 4 || !/^\d+$/.test(pin)) {
            await transaction.rollback();
            return res.status(400).json({ 
                erro: "PIN_INVALIDO", 
                mensagem: "O PIN deve ter exatamente 4 dígitos numéricos." 
            });
        }

        const existe = await Criancas.findOne({ where: { nome_usuario: username } });
        if (existe) {
            await transaction.rollback();
            return res.status(409).json({ 
                erro: "USERNAME_JA_REGISTADO", 
                mensagem: "Este nome de utilizador já está em uso." 
            });
        }

        const senhaHash = await bcrypt.hash(pin, 10);
        
        const configPotes = distribuicao_potes || {
            gastar_pct: 60,
            poupar_pct: 30,
            ajudar_pct: 10
        };

        const novaCrianca = await Criancas.create({
            nome_completo: nome,
            nome_usuario: username,
            senha: senhaHash,
            idade,
            id_responsavel: req.usuario.id,
            provincia: provincia || null,
            municipio: municipio || null,
            distribuicao_potes: configPotes,
            saldo_gastar: 0,
            saldo_poupar: 0,
            saldo_ajudar: 0,
            xp: 0,
            nivel: 1
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            id: novaCrianca.id_crianca,
            nome: novaCrianca.nome_completo,
            idade: novaCrianca.idade,
            nivel: novaCrianca.nivel,
            pai_id: req.usuario.id,
            username: novaCrianca.nome_usuario,
            provincia: novaCrianca.provincia,
            municipio: novaCrianca.municipio,
            potes: {
                saldo_gastar: 0,
                saldo_poupar: 0,
                saldo_ajudar: 0,
                total: 0,
                config: configPotes
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// GET /api/parent/children/:childId/stats
exports.childStats = async (req, res) => {
    try {
        const { childId } = req.params;
        
        const crianca = await Criancas.findByPk(childId);
        if (!crianca) {
            return res.status(404).json({ 
                erro: "CRIANCA_NAO_ENCONTRADA", 
                mensagem: "Dependente não encontrado" 
            });
        }

        if (crianca.id_responsavel !== req.usuario.id) {
            return res.status(403).json({ 
                erro: "SEM_PERMISSAO", 
                mensagem: "Você não tem acesso a este dependente." 
            });
        }

        const tarefasConcluidasMes = await Tarefa.count({
            where: { 
                id_crianca: childId, 
                status: "aprovada",
                aprovado_em: {
                    [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        });

        const missoesCompletas = await Missao.count({
            where: { id_crianca: childId, concluida: true }
        });

        const doacoes = await Historico.findAll({
            where: { id_crianca: childId, tipo: "doar" }
        });

        const historicoRecente = await Historico.findAll({
            where: { id_crianca: childId },
            limit: 10,
            order: [['createdAt', 'DESC']]  // 🔧 Usar 'createdAt'
        });

        res.json({
            crianca: {
                id: crianca.id_crianca,
                nome: crianca.nome_completo,
                idade: crianca.idade,
                nivel: crianca.nivel,
                potes: {
                    saldo_gastar: parseFloat(crianca.saldo_gastar),
                    saldo_poupar: parseFloat(crianca.saldo_poupar),
                    saldo_ajudar: parseFloat(crianca.saldo_ajudar),
                    total: parseFloat(crianca.saldo_gastar) + parseFloat(crianca.saldo_poupar) + parseFloat(crianca.saldo_ajudar)
                }
            },
            tarefas_concluidas_mes: tarefasConcluidasMes,
            missoes_completas: missoesCompletas,
            doacoes_realizadas: doacoes.length,
            desempenho_semanal: await calcularDesempenhoSemanal(childId),
            historico_recente: historicoRecente.map(h => ({
                id: h.id_transacao,
                tipo: h.tipo,
                descricao: h.descricao,
                valor: parseFloat(h.valor),
                data: h.createdAt,  // 🔧 Usar 'createdAt'
                pote_afetado: mapearPoteAfetado(h.tipo)
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// POST /api/parent/children/:childId/add-balance
exports.addBalance = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { childId } = req.params;
        const { valor, pote, descricao } = req.body;

        if (!valor || !pote) {
            await transaction.rollback();
            return res.status(400).json({ 
                erro: "CAMPOS_OBRIGATORIOS", 
                mensagem: "Valor e pote são obrigatórios." 
            });
        }

        if (!['gastar', 'poupar', 'ajudar'].includes(pote)) {
            await transaction.rollback();
            return res.status(400).json({ 
                erro: "DADOS_INVALIDOS", 
                mensagem: "Pote inválido. Use: gastar, poupar ou ajudar." 
            });
        }

        const crianca = await Criancas.findByPk(childId, { transaction });
        if (!crianca) {
            await transaction.rollback();
            return res.status(404).json({ 
                erro: "CRIANCA_NAO_ENCONTRADA", 
                mensagem: "Dependente não encontrado" 
            });
        }

        if (crianca.id_responsavel !== req.usuario.id) {
            await transaction.rollback();
            return res.status(403).json({ 
                erro: "SEM_PERMISSAO", 
                mensagem: "Você não tem acesso a este dependente." 
            });
        }

        const valorNum = parseFloat(valor);
        let campo = `saldo_${pote}`;
        let novoSaldo = parseFloat(crianca[campo]) + valorNum;

        await crianca.update({ [campo]: novoSaldo }, { transaction });

        await Historico.create({
            id_crianca: childId,
            tipo: pote === 'gastar' ? 'bonus_gestao' : pote,
            valor: valorNum,
            descricao: descricao || `Adição manual ao pote ${pote}`
        }, { transaction });

        await transaction.commit();

        res.json({
            mensagem: "Saldo adicionado com sucesso.",
            potes_atualizados: {
                saldo_gastar: parseFloat(crianca.saldo_gastar),
                saldo_poupar: parseFloat(crianca.saldo_poupar),
                saldo_ajudar: parseFloat(crianca.saldo_ajudar),
                total: parseFloat(crianca.saldo_gastar) + parseFloat(crianca.saldo_poupar) + parseFloat(crianca.saldo_ajudar)
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// PATCH /api/parent/children/:childId
exports.updateChild = async (req, res) => {
    try {
        const { childId } = req.params;
        const { nome, idade } = req.body;

        const crianca = await Criancas.findByPk(childId);
        if (!crianca) {
            return res.status(404).json({ 
                erro: "CRIANCA_NAO_ENCONTRADA", 
                mensagem: "Dependente não encontrado" 
            });
        }

        if (crianca.id_responsavel !== req.usuario.id) {
            return res.status(403).json({ 
                erro: "SEM_PERMISSAO", 
                mensagem: "Você não tem acesso a este dependente." 
            });
        }

        if (nome) crianca.nome_completo = nome;
        if (idade) crianca.idade = idade;
        await crianca.save();

        res.json({
            id: crianca.id_crianca,
            nome: crianca.nome_completo,
            idade: crianca.idade,
            nivel: crianca.nivel
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// PATCH /api/parent/children/:childId/potes-config
exports.updatePotesConfig = async (req, res) => {
    try {
        const { childId } = req.params;
        const { gastar_pct, poupar_pct, ajudar_pct } = req.body;

        if (gastar_pct + poupar_pct + ajudar_pct !== 100) {
            return res.status(400).json({ 
                erro: "DADOS_INVALIDOS", 
                mensagem: "A soma das percentagens deve ser 100." 
            });
        }

        const crianca = await Criancas.findByPk(childId);
        if (!crianca) {
            return res.status(404).json({ 
                erro: "CRIANCA_NAO_ENCONTRADA", 
                mensagem: "Dependente não encontrado" 
            });
        }

        if (crianca.id_responsavel !== req.usuario.id) {
            return res.status(403).json({ 
                erro: "SEM_PERMISSAO", 
                mensagem: "Você não tem acesso a este dependente." 
            });
        }

        crianca.distribuicao_potes = {
            gastar_pct,
            poupar_pct,
            ajudar_pct
        };
        await crianca.save();

        res.json({
            mensagem: "Configuração dos potes atualizada.",
            config: {
                gastar_pct,
                poupar_pct,
                ajudar_pct
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// GET /api/parent/children/:childId/finance
exports.childFinance = async (req, res) => {
    try {
        const { childId } = req.params;

        const crianca = await Criancas.findByPk(childId);
        if (!crianca) {
            return res.status(404).json({ 
                erro: "CRIANCA_NAO_ENCONTRADA", 
                mensagem: "Dependente não encontrado" 
            });
        }

        if (crianca.id_responsavel !== req.usuario.id) {
            return res.status(403).json({ 
                erro: "SEM_PERMISSAO", 
                mensagem: "Você não tem acesso a este dependente." 
            });
        }

        const historico = await Historico.findAll({
            where: { id_crianca: childId },
            limit: 50,
            order: [['createdAt', 'DESC']]  // 🔧 Usar 'createdAt'
        });

        res.json({
            potes: {
                saldo_gastar: parseFloat(crianca.saldo_gastar),
                saldo_poupar: parseFloat(crianca.saldo_poupar),
                saldo_ajudar: parseFloat(crianca.saldo_ajudar),
                total: parseFloat(crianca.saldo_gastar) + parseFloat(crianca.saldo_poupar) + parseFloat(crianca.saldo_ajudar)
            },
            historico: historico.map(h => ({
                id: h.id_transacao,
                tipo: h.tipo,
                descricao: h.descricao,
                valor: parseFloat(h.valor),
                data: h.createdAt,  // 🔧 Usar 'createdAt'
                pote_afetado: mapearPoteAfetado(h.tipo)
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

//novos filtros

// ============================================
// GET /api/parent/children/:childId/stats (com filtro de período)
// ============================================

exports.childStatsWithPeriod = async (req, res) => {
    try {
        const { childId } = req.params;
        const { periodo, data } = req.query;

        const periodosValidos = ['diario', 'semanal', 'mensal', 'anual'];
        if (!periodosValidos.includes(periodo)) {
            return res.status(400).json({
                erro: "PERIODO_INVALIDO",
                mensagem: "Período deve ser: diario, semanal, mensal ou anual"
            });
        }

        // Calcular intervalo de datas
        let inicio, fim;
        const hoje = data ? new Date(data) : new Date();

        switch (periodo) {
            case 'diario':
                inicio = new Date(hoje);
                inicio.setHours(0, 0, 0, 0);
                fim = new Date(hoje);
                fim.setHours(23, 59, 59, 999);
                break;
            case 'semanal':
                const diaSemana = hoje.getDay();
                inicio = new Date(hoje);
                inicio.setDate(hoje.getDate() - diaSemana);
                inicio.setHours(0, 0, 0, 0);
                fim = new Date(inicio);
                fim.setDate(inicio.getDate() + 6);
                fim.setHours(23, 59, 59, 999);
                break;
            case 'mensal':
                inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
                fim.setHours(23, 59, 59, 999);
                break;
            case 'anual':
                inicio = new Date(hoje.getFullYear(), 0, 1);
                fim = new Date(hoje.getFullYear(), 11, 31);
                fim.setHours(23, 59, 59, 999);
                break;
        }

        const crianca = await Criancas.findByPk(childId);
        if (!crianca || crianca.id_responsavel !== req.usuario.id) {
            return res.status(404).json({
                erro: "CRIANCA_NAO_ENCONTRADA",
                mensagem: "Dependente não encontrado"
            });
        }

        // 🔥 CORREÇÃO: usar 'createdAt' em vez de 'data_hora'
        const transacoes = await Historico.findAll({
            where: {
                id_crianca: childId,
                createdAt: {
                    [Op.between]: [inicio, fim]
                }
            },
            order: [['createdAt', 'ASC']]
        });

        const stats = calcularEstatisticas(transacoes, crianca, periodo, inicio, fim);

        res.json(stats);

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/parent/children/:childId/transacoes
// ============================================

exports.getTransacoes = async (req, res) => {
    try {
        const { childId } = req.params;
        const { inicio, fim, tipo } = req.query;

        const crianca = await Criancas.findByPk(childId);
        if (!crianca || crianca.id_responsavel !== req.usuario.id) {
            return res.status(404).json({
                erro: "CRIANCA_NAO_ENCONTRADA",
                mensagem: "Dependente não encontrado"
            });
        }

        const where = { id_crianca: childId };
        
        if (inicio && fim) {
            // 🔥 CORREÇÃO: usar 'createdAt' em vez de 'data_hora'
            where.createdAt = {
                [Op.between]: [new Date(inicio), new Date(fim)]
            };
        }
        
        if (tipo) {
            where.tipo = tipo;
        }

        const transacoes = await Historico.findAll({
            where,
            order: [['createdAt', 'DESC']]  // 🔥 CORREÇÃO: usar 'createdAt'
        });

        res.json({
            total: transacoes.length,
            periodo: { inicio, fim },
            transacoes: transacoes.map(t => ({
                id: t.id_transacao,
                tipo: t.tipo,
                valor: parseFloat(t.valor),
                descricao: t.descricao,
                data: t.createdAt,  // 🔥 CORREÇÃO: usar 'createdAt'
                pote_afetado: mapearPoteAfetado(t.tipo)
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/parent/children/:childId/resumo-mensal
// ============================================

exports.resumoMensal = async (req, res) => {
    try {
        const { childId } = req.params;
        const { ano } = req.query;

        const anoInt = parseInt(ano) || new Date().getFullYear();

        const crianca = await Criancas.findByPk(childId);
        if (!crianca || crianca.id_responsavel !== req.usuario.id) {
            return res.status(404).json({
                erro: "CRIANCA_NAO_ENCONTRADA",
                mensagem: "Dependente não encontrado"
            });
        }

        const meses = [];
        let saldoAcumulado = 0;

        for (let mes = 1; mes <= 12; mes++) {
            const inicio = new Date(anoInt, mes - 1, 1);
            const fim = new Date(anoInt, mes, 0);
            fim.setHours(23, 59, 59, 999);

            // 🔥 CORREÇÃO: usar 'createdAt' em vez de 'data_hora'
            const transacoes = await Historico.findAll({
                where: {
                    id_crianca: childId,
                    createdAt: { [Op.between]: [inicio, fim] }
                }
            });

            const ganhou = transacoes.filter(t => t.tipo === 'tarefa' || t.tipo === 'bonus_gestao')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            const gastou = transacoes.filter(t => t.tipo === 'gastar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            const poupou = transacoes.filter(t => t.tipo === 'poupar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            const doou = transacoes.filter(t => t.tipo === 'doar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            const tarefas = transacoes.filter(t => t.tipo === 'tarefa').length;
            const missoes = transacoes.filter(t => t.tipo === 'missao').length;

            saldoAcumulado += ganhou - gastou;

            meses.push({
                mes,
                nome: obterNomeMes(mes),
                saldo_inicial: saldoAcumulado - (ganhou - gastou),
                saldo_final: saldoAcumulado,
                ganhou,
                gastou,
                poupou,
                doou,
                tarefas,
                missoes
            });
        }

        res.json({ ano: anoInt, meses });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/parent/children/:childId/evolucao-saldo
// ============================================

exports.evolucaoSaldo = async (req, res) => {
    try {
        const { childId } = req.params;
        const { periodo, ano } = req.query;

        const crianca = await Criancas.findByPk(childId);
        if (!crianca || crianca.id_responsavel !== req.usuario.id) {
            return res.status(404).json({
                erro: "CRIANCA_NAO_ENCONTRADA",
                mensagem: "Dependente não encontrado"
            });
        }

        let dados = [];
        const anoInt = parseInt(ano) || new Date().getFullYear();

        if (periodo === 'anual') {
            for (let mes = 1; mes <= 12; mes++) {
                const inicio = new Date(anoInt, mes - 1, 1);
                const fim = new Date(anoInt, mes, 0);
                fim.setHours(23, 59, 59, 999);

                // 🔥 CORREÇÃO: usar 'createdAt' em vez de 'data_hora'
                const transacoes = await Historico.findAll({
                    where: {
                        id_crianca: childId,
                        createdAt: { [Op.lte]: fim }
                    }
                });

                const saldoGastar = transacoes.reduce((sum, t) => {
                    if (t.tipo === 'tarefa') return sum + parseFloat(t.valor) * 0.6;
                    if (t.tipo === 'gastar') return sum - parseFloat(t.valor);
                    return sum;
                }, 0);

                const saldoPoupar = transacoes.reduce((sum, t) => {
                    if (t.tipo === 'tarefa') return sum + parseFloat(t.valor) * 0.3;
                    if (t.tipo === 'poupar') return sum + parseFloat(t.valor);
                    if (t.tipo === 'bonus_gestao') return sum + parseFloat(t.valor);
                    return sum;
                }, 0);

                const saldoAjudar = transacoes.reduce((sum, t) => {
                    if (t.tipo === 'tarefa') return sum + parseFloat(t.valor) * 0.1;
                    if (t.tipo === 'doar') return sum - parseFloat(t.valor);
                    return sum;
                }, 0);

                dados.push({
                    data: `${anoInt}-${String(mes).padStart(2, '0')}-01`,
                    saldo_total: saldoGastar + saldoPoupar + saldoAjudar,
                    gastar: saldoGastar,
                    poupar: saldoPoupar,
                    ajudar: saldoAjudar
                });
            }
        }

        res.json({
            periodo,
            ano: anoInt,
            dados
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// Funções auxiliares
// ============================================
function obterNomeMes(mes) {
    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return meses[mes - 1];
}

// controllers/parentController.js - calcularEstatisticas

function calcularEstatisticas(transacoes, crianca, periodo, inicio, fim) {
    const ganhou = transacoes.filter(t => t.tipo === 'tarefa' || t.tipo === 'bonus_gestao')
        .reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const gastou = transacoes.filter(t => t.tipo === 'gastar')
        .reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const poupou = transacoes.filter(t => t.tipo === 'poupar')
        .reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const doou = transacoes.filter(t => t.tipo === 'doar')
        .reduce((sum, t) => sum + parseFloat(t.valor), 0);
    const tarefas = transacoes.filter(t => t.tipo === 'tarefa').length;
    const missoes = transacoes.filter(t => t.tipo === 'missao').length;

    return {
        crianca: {
            id: crianca.id_crianca,
            nome: crianca.nome_completo,
            idade: crianca.idade,
            nivel: crianca.nivel
        },
        periodo,
        inicio,
        fim,
        resumo: {
            total_ganho: ganhou,
            total_gasto: gastou,
            total_poupado: poupou,
            total_doado: doou,
            tarefas_concluidas: tarefas,
            missoes_completas: missoes
        },
        saldo_atual: {
            gastar: parseFloat(crianca.saldo_gastar),
            poupar: parseFloat(crianca.saldo_poupar),
            ajudar: parseFloat(crianca.saldo_ajudar),
            total: parseFloat(crianca.saldo_gastar) + parseFloat(crianca.saldo_poupar) + parseFloat(crianca.saldo_ajudar)
        }
    };
}