const Crianca = require("../models/Criancas");
const Doacao = require("../models/Doacoes");
const Campanha = require("../models/Campanha");
const HistoricoTransacao = require("../models/HistoricoTransacao");
const { verificarProgressoMissao } = require("./MissoesController"); // Se doação for parte de uma missão
const sequelize = require ("../config/database")


exports.doar = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id_crianca, id_campanha, valor } = req.body;
        const XP_DOACAO = req.body;

        const crianca = await Crianca.findByPk(id_crianca, { transaction });
        const campanha = await Campanha.findByPk(id_campanha, { transaction });

        if(!campanha) {
            campanha.date_fim == false
        }

        if (!crianca || !campanha) {
            await transaction.rollback();
            return res.status(404).json({ message: "Criança ou Campanha não encontrada" });
        }

        if (parseFloat(crianca.saldo_ajudar) < parseFloat(valor)) {
            await transaction.rollback();
            return res.status(400).json({ message: "Saldo 'ajudar' insuficiente" });
        }

        // 1. Deduzir do saldo_ajudar
        await crianca.update({
            saldo_ajudar: parseFloat(crianca.saldo_ajudar) - parseFloat(valor),
            xp: crianca.xp + XP_DOACAO // Dar XP por doar
        }, { transaction });

        // 2. Atualizar campanha
        await campanha.update({
            valor_arrecadado: parseFloat(campanha.valor_arrecadado) + parseFloat(valor)
        }, { transaction });

        // 3. Registar doação
        await Doacao.create({
            id_crianca,
            id_campanha,
            valor
        }, { transaction });

        // 4. Registar histórico financeiro
        await HistoricoTransacao.create({
            id_crianca,
            tipo: 'doar',
            valor,
            descricao: `Doação para: ${campanha.nome}`
        }, { transaction });

        await transaction.commit();

        res.json({
            message: "Doação realizada com sucesso!",
            xp_ganho: XP_DOACAO,
            badge: "Kamba Generoso" // Pode vir de uma lógica de conquistas
        });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: "Erro ao processar doação" });
    }
};