// controllers/adminDashboardController.js
const { Op } = require("sequelize");
const Responsavel = require("../models/Responsavel");
const Criancas = require("../models/Criancas");
const Tarefa = require("../models/Tarefa");
const Missao = require("../models/Missoes");
const Campanha = require("../models/Campanha");
const Doacoes = require("../models/Doacoes");
const {Conteudo} = require("../models/VideoAssistido");
const ShopItem = require("../models/ShopItem");
const LogAdmin = require("../models/LogAdmin");
const Admin = require("../models/Admin");
const sequelize = require("../config/database");

// ============================================
// GET /api/admin/dashboard
// ============================================
exports.dashboard = async (req, res) => {
    try {
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

        // Estatísticas principais
        const totalResponsaveis = await Responsavel.count();
        const totalCriancas = await Criancas.count();
        
        // Tarefas aprovadas no mês
        const totalTarefasMes = await Tarefa.count({
            where: { 
                status: 'aprovada',
                aprovado_em: { [Op.gte]: inicioMes }
            }
        });
        
        const totalMissoesCompletas = await Missao.count({
            where: { concluida: true }
        });
        
        // 🔥 CORREÇÃO: Buscar total de doações sem filtro de data
        const totalDoacoesResult = await Doacoes.sum('valor');
        const totalDoacoes = totalDoacoesResult || 0;
        
        const totalCampanhasAtivas = await Campanha.count({
            where: { status: true }
        });
        const totalConteudos = await Conteudo.count();

        // Gráfico de tarefas por mês (últimos 12 meses)
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const tarefasPorMes = [];

        for (let i = 11; i >= 0; i--) {
            const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            const mesFim = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0);
            mesFim.setHours(23, 59, 59, 999);
            
            const tarefas = await Tarefa.count({
                where: { 
                    status: 'aprovada',
                    aprovado_em: { [Op.between]: [mesInicio, mesFim] }
                }
            });
            
            tarefasPorMes.push(tarefas);
        }

        // Top 5 crianças com mais XP
        const topCriancas = await Criancas.findAll({
            order: [['xp', 'DESC']],
            limit: 5,
            attributes: ['id_crianca', 'nome_completo', 'xp', 'nivel']
        });

        // Top 5 campanhas com mais doações
        const topCampanhas = await Campanha.findAll({
            order: [['valor_arrecadado', 'DESC']],
            limit: 5,
            attributes: ['id_campanha', 'nome', 'valor_arrecadado', 'meta_valor']
        });

        res.json({
            resumo: {
                total_responsaveis: totalResponsaveis,
                total_criancas: totalCriancas,
                total_tarefas_mes: totalTarefasMes,
                total_missoes_completas: totalMissoesCompletas,
                total_doacoes: totalDoacoes,
                total_campanhas_ativas: totalCampanhasAtivas,
                total_conteudos: totalConteudos
            },
            graficos: {
                tarefas_por_mes: tarefasPorMes,
                meses: meses
            },
            top_criancas: topCriancas.map(c => ({
                id: c.id_crianca,
                nome: c.nome_completo,
                xp: c.xp,
                nivel: c.nivel
            })),
            top_campanhas: topCampanhas.map(c => ({
                id: c.id_campanha,
                nome: c.nome,
                arrecadado: parseFloat(c.valor_arrecadado),
                meta: parseFloat(c.meta_valor),
                percentual: (parseFloat(c.valor_arrecadado) / parseFloat(c.meta_valor)) * 100
            }))
        });

    } catch (error) {
        console.error("Erro no dashboard admin:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/stats
// ============================================
exports.getStats = async (req, res) => {
    try {
        const { periodo } = req.query;
        let inicio, fim;

        const hoje = new Date();
        switch (periodo) {
            case 'diario':
                inicio = new Date(hoje);
                inicio.setHours(0, 0, 0, 0);
                fim = new Date(hoje);
                fim.setHours(23, 59, 59, 999);
                break;
            case 'semanal':
                inicio = new Date(hoje);
                inicio.setDate(hoje.getDate() - 7);
                fim = new Date();
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
            default:
                inicio = new Date(hoje);
                inicio.setDate(hoje.getDate() - 30);
                fim = new Date();
        }

        // 🔥 CORREÇÃO: Usar data_hora para doações e evitar createdAt onde não existe
        const valorArrecadado = await Doacoes.sum('valor', {
            where: { data_hora: { [Op.between]: [inicio, fim] } }
        }) || 0;

        // 🔥 CORREÇÃO: Para campanhas, usar date_inicio em vez de createdAt
        const novasCampanhas = await Campanha.count({
            where: { date_inicio: { [Op.between]: [inicio, fim] } }
        });

        const stats = {
            tarefas_concluidas: await Tarefa.count({
                where: { 
                    status: 'aprovada', 
                    aprovado_em: { [Op.between]: [inicio, fim] } 
                }
            }),
            novas_criancas: await Criancas.count({
                where: { createdAt: { [Op.between]: [inicio, fim] } }
            }),
            novas_campanhas: novasCampanhas,
            valor_arrecadado: valorArrecadado
        };

        res.json({ periodo, ...stats });

    } catch (error) {
        console.error("Erro ao buscar stats:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};