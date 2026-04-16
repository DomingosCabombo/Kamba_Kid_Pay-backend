const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Criancas = require("../models/Criancas");
const Responsavel = require("../models/Responsavel");
const Historico = require("../models/HistoricoTransacao");
const Campanha = require("../models/Campanha");
const Doacoes = require("../models/Doacoes");
const Tarefa = require("../models/Tarefa");

// ============================================
// GET /api/admin/analytics/comportamento
// Análise de onde mais poupam, gastam, doam
// Filtros: provincia, municipio, data_inicio, data_fim
// ============================================
exports.analiseComportamento = async (req, res) => {
    try {
        const { 
            provincia, 
            municipio, 
            data_inicio, 
            data_fim,
            agrupar_por = 'provincia' // provincia, municipio, mes, ano
        } = req.query;

        // Construir filtro de localização
        const whereCrianca = {};
        if (provincia) whereCrianca.provincia = provincia;
        if (municipio) whereCrianca.municipio = municipio;

        // Buscar crianças filtradas
        const criancas = await Criancas.findAll({
            where: whereCrianca,
            attributes: ['id_crianca', 'provincia', 'municipio']
        });

        const criancasIds = criancas.map(c => c.id_crianca);

        if (criancasIds.length === 0) {
            return res.json({
                filtros: { provincia, municipio, data_inicio, data_fim },
                total_poupado: 0,
                total_gasto: 0,
                total_doado: 0,
                top_provincias: [],
                top_municipios: [],
                tendencias: []
            });
        }

        // Filtro de datas
        const whereHistorico = { id_crianca: { [Op.in]: criancasIds } };
        if (data_inicio && data_fim) {
            whereHistorico.createdAt = {
                [Op.between]: [new Date(data_inicio), new Date(data_fim)]
            };
        }

        // Buscar transações
        const transacoes = await Historico.findAll({
            where: whereHistorico
        });

        // Calcular totais
        const totalPoupado = transacoes
            .filter(t => t.tipo === 'poupar')
            .reduce((sum, t) => sum + parseFloat(t.valor), 0);
        
        const totalGasto = transacoes
            .filter(t => t.tipo === 'gastar')
            .reduce((sum, t) => sum + parseFloat(t.valor), 0);
        
        const totalDoado = transacoes
            .filter(t => t.tipo === 'doar')
            .reduce((sum, t) => sum + parseFloat(t.valor), 0);

        // Top províncias (onde mais poupam)
        const poupancaPorProvincia = {};
        const gastoPorProvincia = {};
        const doacaoPorProvincia = {};

        for (const crianca of criancas) {
            const transacoesCrianca = transacoes.filter(t => t.id_crianca === crianca.id_crianca);
            
            const poupado = transacoesCrianca
                .filter(t => t.tipo === 'poupar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            
            const gasto = transacoesCrianca
                .filter(t => t.tipo === 'gastar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            
            const doado = transacoesCrianca
                .filter(t => t.tipo === 'doar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);

            const prov = crianca.provincia || 'Não informada';
            const mun = crianca.municipio || 'Não informado';

            if (!poupancaPorProvincia[prov]) {
                poupancaPorProvincia[prov] = 0;
                gastoPorProvincia[prov] = 0;
                doacaoPorProvincia[prov] = 0;
            }
            poupancaPorProvincia[prov] += poupado;
            gastoPorProvincia[prov] += gasto;
            doacaoPorProvincia[prov] += doado;
        }

        // Ordenar e pegar top 5
        const topPoupanca = Object.entries(poupancaPorProvincia)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([provincia, total]) => ({ provincia, total_poupado: total }));

        const topGastos = Object.entries(gastoPorProvincia)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([provincia, total]) => ({ provincia, total_gasto: total }));

        const topDoacoes = Object.entries(doacaoPorProvincia)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([provincia, total]) => ({ provincia, total_doado: total }));

        // Tendências por mês/ano
        const tendencias = {};
        for (const transacao of transacoes) {
            const data = new Date(transacao.createdAt);
            const chave = `${data.getFullYear()}-${data.getMonth() + 1}`;
            
            if (!tendencias[chave]) {
                tendencias[chave] = { poupado: 0, gasto: 0, doado: 0 };
            }
            
            if (transacao.tipo === 'poupar') tendencias[chave].poupado += parseFloat(transacao.valor);
            if (transacao.tipo === 'gastar') tendencias[chave].gasto += parseFloat(transacao.valor);
            if (transacao.tipo === 'doar') tendencias[chave].doado += parseFloat(transacao.valor);
        }

        const tendenciasArray = Object.entries(tendencias).map(([periodo, valores]) => ({
            periodo,
            ...valores
        })).sort((a, b) => a.periodo.localeCompare(b.periodo));

        res.json({
            filtros_aplicados: { provincia, municipio, data_inicio, data_fim },
            resumo: {
                total_criancas_analisadas: criancasIds.length,
                total_poupado: totalPoupado,
                total_gasto: totalGasto,
                total_doado: totalDoado,
                taxa_poupanca: totalPoupado + totalGasto > 0 
                    ? ((totalPoupado / (totalPoupado + totalGasto)) * 100).toFixed(1) 
                    : 0
            },
            top_regioes: {
                mais_poupam: topPoupanca,
                mais_gastam: topGastos,
                mais_doam: topDoacoes
            },
            tendencias_mensais: tendenciasArray
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/analytics/ano-comparativo
// Compara anos: qual ano mais pouparam, gastaram, doaram
// ============================================
exports.comparativoAnual = async (req, res) => {
    try {
        const { anos } = req.query; // ex: "2024,2025,2026"
        const anosLista = anos ? anos.split(',').map(Number) : [2024, 2025, 2026];

        const resultados = [];

        for (const ano of anosLista) {
            const inicio = new Date(ano, 0, 1);
            const fim = new Date(ano, 11, 31, 23, 59, 59);

            const transacoes = await Historico.findAll({
                where: {
                    createdAt: { [Op.between]: [inicio, fim] }
                }
            });

            const poupado = transacoes
                .filter(t => t.tipo === 'poupar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            
            const gasto = transacoes
                .filter(t => t.tipo === 'gastar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            
            const doado = transacoes
                .filter(t => t.tipo === 'doar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);

            const totalTarefas = await Tarefa.count({
                where: { 
                    status: 'aprovada',
                    aprovado_em: { [Op.between]: [inicio, fim] }
                }
            });

            resultados.push({
                ano,
                poupado,
                gasto,
                doado,
                total_tarefas: totalTarefas,
                media_por_mes: {
                    poupado: poupado / 12,
                    gasto: gasto / 12,
                    doado: doado / 12
                }
            });
        }

        // Determinar melhor ano em cada categoria
        const melhorAnoPoupanca = [...resultados].sort((a, b) => b.poupado - a.poupado)[0];
        const melhorAnoGastos = [...resultados].sort((a, b) => b.gasto - a.gasto)[0];
        const melhorAnoDoacoes = [...resultados].sort((a, b) => b.doado - a.doado)[0];

        res.json({
            comparativo: resultados,
            destaques: {
                ano_mais_poupou: { ano: melhorAnoPoupanca?.ano, valor: melhorAnoPoupanca?.poupado },
                ano_mais_gastou: { ano: melhorAnoGastos?.ano, valor: melhorAnoGastos?.gasto },
                ano_mais_doou: { ano: melhorAnoDoacoes?.ano, valor: melhorAnoDoacoes?.doado }
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/analytics/provincias
// Ranking completo de províncias
// ============================================
exports.rankingProvincias = async (req, res) => {
    try {
        const { ano } = req.query;
        const anoInt = ano ? parseInt(ano) : new Date().getFullYear();

        const inicio = new Date(anoInt, 0, 1);
        const fim = new Date(anoInt, 11, 31, 23, 59, 59);

        // Buscar todas as crianças com suas províncias
        const criancas = await Criancas.findAll({
            attributes: ['id_crianca', 'provincia', 'municipio']
        });

        // Buscar transações do ano
        const transacoes = await Historico.findAll({
            where: {
                createdAt: { [Op.between]: [inicio, fim] }
            }
        });

        const dadosPorProvincia = {};

        for (const crianca of criancas) {
            const prov = crianca.provincia || 'Não informada';
            
            if (!dadosPorProvincia[prov]) {
                dadosPorProvincia[prov] = {
                    provincia: prov,
                    total_criancas: 0,
                    total_poupado: 0,
                    total_gasto: 0,
                    total_doado: 0,
                    tarefas_concluidas: 0
                };
            }
            
            dadosPorProvincia[prov].total_criancas++;
            
            const transacoesCrianca = transacoes.filter(t => t.id_crianca === crianca.id_crianca);
            
            dadosPorProvincia[prov].total_poupado += transacoesCrianca
                .filter(t => t.tipo === 'poupar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            
            dadosPorProvincia[prov].total_gasto += transacoesCrianca
                .filter(t => t.tipo === 'gastar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            
            dadosPorProvincia[prov].total_doado += transacoesCrianca
                .filter(t => t.tipo === 'doar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
        }

        // Calcular médias e ordenar
        const ranking = Object.values(dadosPorProvincia).map(prov => ({
            ...prov,
            media_poupanca_por_crianca: prov.total_criancas > 0 ? prov.total_poupado / prov.total_criancas : 0,
            taxa_poupanca: prov.total_poupado + prov.total_gasto > 0 
                ? ((prov.total_poupado / (prov.total_poupado + prov.total_gasto)) * 100).toFixed(1)
                : 0
        })).sort((a, b) => b.total_poupado - a.total_poupado);

        res.json({
            ano: anoInt,
            total_criancas: criancas.length,
            total_analisadas: criancas.filter(c => c.provincia).length,
            ranking
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/analytics/municipios
// Ranking por município (dentro de uma província)
// ============================================
exports.rankingMunicipios = async (req, res) => {
    try {
        const { provincia, ano } = req.query;
        
        if (!provincia) {
            return res.status(400).json({ 
                erro: "PROVINCIA_OBRIGATORIA", 
                mensagem: "Informe a província para filtrar municípios." 
            });
        }

        const anoInt = ano ? parseInt(ano) : new Date().getFullYear();
        const inicio = new Date(anoInt, 0, 1);
        const fim = new Date(anoInt, 11, 31, 23, 59, 59);

        // Buscar crianças da província
        const criancas = await Criancas.findAll({
            where: { provincia },
            attributes: ['id_crianca', 'municipio']
        });

        const transacoes = await Historico.findAll({
            where: {
                createdAt: { [Op.between]: [inicio, fim] }
            }
        });

        const dadosPorMunicipio = {};

        for (const crianca of criancas) {
            const mun = crianca.municipio || 'Não informado';
            
            if (!dadosPorMunicipio[mun]) {
                dadosPorMunicipio[mun] = {
                    municipio: mun,
                    provincia,
                    total_criancas: 0,
                    total_poupado: 0,
                    total_gasto: 0,
                    total_doado: 0
                };
            }
            
            dadosPorMunicipio[mun].total_criancas++;
            
            const transacoesCrianca = transacoes.filter(t => t.id_crianca === crianca.id_crianca);
            
            dadosPorMunicipio[mun].total_poupado += transacoesCrianca
                .filter(t => t.tipo === 'poupar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            
            dadosPorMunicipio[mun].total_gasto += transacoesCrianca
                .filter(t => t.tipo === 'gastar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            
            dadosPorMunicipio[mun].total_doado += transacoesCrianca
                .filter(t => t.tipo === 'doar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
        }

        const ranking = Object.values(dadosPorMunicipio)
            .sort((a, b) => b.total_poupado - a.total_poupado);

        res.json({
            provincia,
            ano: anoInt,
            ranking
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/analytics/faixa-etaria
// Análise por faixa etária
// ============================================
exports.analiseFaixaEtaria = async (req, res) => {
    try {
        const { ano } = req.query;
        const anoInt = ano ? parseInt(ano) : new Date().getFullYear();

        const inicio = new Date(anoInt, 0, 1);
        const fim = new Date(anoInt, 11, 31, 23, 59, 59);

        const criancas = await Criancas.findAll();
        const transacoes = await Historico.findAll({
            where: { createdAt: { [Op.between]: [inicio, fim] } }
        });

        const faixas = {
            '6-8': { min: 6, max: 8, total_poupado: 0, total_gasto: 0, total_doado: 0, criancas: 0 },
            '9-10': { min: 9, max: 10, total_poupado: 0, total_gasto: 0, total_doado: 0, criancas: 0 },
            '11-12': { min: 11, max: 12, total_poupado: 0, total_gasto: 0, total_doado: 0, criancas: 0 },
            '13+': { min: 13, max: 99, total_poupado: 0, total_gasto: 0, total_doado: 0, criancas: 0 }
        };

        for (const crianca of criancas) {
            let faixa = '13+';
            if (crianca.idade <= 8) faixa = '6-8';
            else if (crianca.idade <= 10) faixa = '9-10';
            else if (crianca.idade <= 12) faixa = '11-12';
            
            faixas[faixa].criancas++;
            
            const transacoesCrianca = transacoes.filter(t => t.id_crianca === crianca.id_crianca);
            
            faixas[faixa].total_poupado += transacoesCrianca
                .filter(t => t.tipo === 'poupar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            
            faixas[faixa].total_gasto += transacoesCrianca
                .filter(t => t.tipo === 'gastar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
            
            faixas[faixa].total_doado += transacoesCrianca
                .filter(t => t.tipo === 'doar')
                .reduce((sum, t) => sum + parseFloat(t.valor), 0);
        }

        res.json({
            ano: anoInt,
            faixas_etarias: faixas
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/analytics/campanhas-populares
// Campanhas com mais doações por região
// ============================================
exports.campanhasPorRegiao = async (req, res) => {
    try {
        const { provincia, ano } = req.query;
        const anoInt = ano ? parseInt(ano) : new Date().getFullYear();

        const inicio = new Date(anoInt, 0, 1);
        const fim = new Date(anoInt, 11, 31, 23, 59, 59);

        const whereCrianca = {};
        if (provincia) whereCrianca.provincia = provincia;
        
        const criancas = await Criancas.findAll({
            where: whereCrianca,
            attributes: ['id_crianca']
        });
        const criancasIds = criancas.map(c => c.id_crianca);

        if (criancasIds.length === 0) {
            return res.json({
                provincia: provincia || 'Todas',
                ano: anoInt,
                total_doacoes: 0,
                ranking: []
            });
        }

        const doacoes = await Doacoes.findAll({
            where: {
                id_crianca: { [Op.in]: criancasIds },
                data_hora: { [Op.between]: [inicio, fim] }
            },
            include: [{ 
                model: Campanha, 
                as: "campanha",  //
                attributes: ['nome', 'causa'] 
            }]
        });

        const campanhasRanking = {};
        for (const doacao of doacoes) {
            // 🔥 Acessar com o alias correto
            const nomeCampanha = doacao.campanha?.nome || 'Sem campanha';
            const causa = doacao.campanha?.causa || 'outro';
            
            if (!campanhasRanking[nomeCampanha]) {
                campanhasRanking[nomeCampanha] = {
                    nome: nomeCampanha,
                    causa: causa,
                    total_arrecadado: 0,
                    numero_doacoes: 0
                };
            }
            campanhasRanking[nomeCampanha].total_arrecadado += parseFloat(doacao.valor);
            campanhasRanking[nomeCampanha].numero_doacoes++;
        }

        const ranking = Object.values(campanhasRanking)
            .sort((a, b) => b.total_arrecadado - a.total_arrecadado)
            .slice(0, 10);

        res.json({
            provincia: provincia || 'Todas',
            ano: anoInt,
            total_doacoes: doacoes.length,
            ranking
        });

    } catch (error) {
        console.error("Erro em campanhasPorRegiao:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};
// ============================================
// GET /api/admin/analytics/top-poupadores
// Ranking das crianças que mais poupam
// ============================================
exports.topPoupadores = async (req, res) => {
    try {
        const { periodo, limite = 10 } = req.query;
        let inicio, fim;

        if (periodo === 'mes') {
            inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            fim = new Date();
        } else if (periodo === 'ano') {
            inicio = new Date(new Date().getFullYear(), 0, 1);
            fim = new Date();
        } else {
            inicio = new Date(0);
            fim = new Date();
        }

        const transacoes = await Historico.findAll({
            where: {
                tipo: 'poupar',
                createdAt: { [Op.between]: [inicio, fim] }
            },
            attributes: ['id_crianca', 'valor']
        });

        const poupadores = {};
        for (const t of transacoes) {
            if (!poupadores[t.id_crianca]) {
                poupadores[t.id_crianca] = 0;
            }
            poupadores[t.id_crianca] += parseFloat(t.valor);
        }

        const ranking = await Promise.all(
            Object.entries(poupadores)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limite)
                .map(async ([id, total]) => {
                    const crianca = await Criancas.findByPk(id);
                    return {
                        id: crianca?.id_crianca,
                        nome: crianca?.nome_completo,
                        idade: crianca?.idade,
                        provincia: crianca?.provincia,
                        total_poupado: total,
                        xp: crianca?.xp,
                        nivel: crianca?.nivel
                    };
                })
        );

        res.json({
            periodo: periodo || 'total',
            total_poupadores: Object.keys(poupadores).length,
            ranking
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/analytics/top-gastadores
// ============================================
exports.topGastadores = async (req, res) => {
    try {
        const { periodo, limite = 10 } = req.query;
        let inicio, fim;

        if (periodo === 'mes') {
            inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            fim = new Date();
        } else if (periodo === 'ano') {
            inicio = new Date(new Date().getFullYear(), 0, 1);
            fim = new Date();
        } else {
            inicio = new Date(0);
            fim = new Date();
        }

        const transacoes = await Historico.findAll({
            where: {
                tipo: 'gastar',
                createdAt: { [Op.between]: [inicio, fim] }
            },
            attributes: ['id_crianca', 'valor']
        });

        const gastadores = {};
        for (const t of transacoes) {
            if (!gastadores[t.id_crianca]) {
                gastadores[t.id_crianca] = 0;
            }
            gastadores[t.id_crianca] += parseFloat(t.valor);
        }

        const ranking = await Promise.all(
            Object.entries(gastadores)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limite)
                .map(async ([id, total]) => {
                    const crianca = await Criancas.findByPk(id);
                    return {
                        id: crianca?.id_crianca,
                        nome: crianca?.nome_completo,
                        idade: crianca?.idade,
                        provincia: crianca?.provincia,
                        total_gasto: total,
                        xp: crianca?.xp,
                        nivel: crianca?.nivel
                    };
                })
        );

        res.json({
            periodo: periodo || 'total',
            total_gastadores: Object.keys(gastadores).length,
            ranking
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// GET /api/admin/analytics/top-doadores
// ============================================
exports.topDoadores = async (req, res) => {
    try {
        const { periodo, limite = 10 } = req.query;
        let inicio, fim;

        if (periodo === 'mes') {
            inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            fim = new Date();
        } else if (periodo === 'ano') {
            inicio = new Date(new Date().getFullYear(), 0, 1);
            fim = new Date();
        } else {
            inicio = new Date(0);
            fim = new Date();
        }

        const doacoes = await Doacoes.findAll({
            where: {
                data_hora: { [Op.between]: [inicio, fim] }
            },
            include: [{ model: Criancas, attributes: ['nome_completo', 'idade', 'provincia', 'xp', 'nivel'] }]
        });

        const doadores = {};
        for (const d of doacoes) {
            if (!doadores[d.id_crianca]) {
                doadores[d.id_crianca] = {
                    total: 0,
                    nome: d.Criancum?.nome_completo,
                    idade: d.Criancum?.idade,
                    provincia: d.Criancum?.provincia,
                    xp: d.Criancum?.xp,
                    nivel: d.Criancum?.nivel
                };
            }
            doadores[d.id_crianca].total += parseFloat(d.valor);
        }

        const ranking = Object.entries(doadores)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, limite)
            .map(([id, data]) => ({
                id,
                nome: data.nome,
                idade: data.idade,
                provincia: data.provincia,
                total_doado: data.total,
                xp: data.xp,
                nivel: data.nivel
            }));

        res.json({
            periodo: periodo || 'total',
            total_doadores: Object.keys(doadores).length,
            ranking
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};