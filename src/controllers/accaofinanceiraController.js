const  Crianca = require("../models/Criancas");
const HistoricoTransacao = require("../models/HistoricoTransacao");
const sequelize = require ("../config/database")


exports.poupar = async (req, res) => {
    try {
        const { id_crianca, valor } = req.body;

        const crianca = await Criancas.findByPk(id_crianca);
        
        if (!crianca) {
            return res.status(404).json({ erro: "Criança não encontrada" });
        }

        if (crianca.saldo_gastar < valor) {
            return res.status(400).json({ 
                erro: "Saldo insuficiente no pote Gastar" 
            });
        }

        await Criancas.update({
            saldo_gastar: crianca.saldo_gastar - valor,
            saldo_poupar: parseFloat(crianca.saldo_poupar) + parseFloat(valor)
        }, {
            where: { id_crianca }
        });

        await Historico.create({
            id_crianca,
            tipo: "poupar",
            valor,
            descricao: "Transferência para poupança"
        });

        res.json({
            mensagem: "💰 Valor transferido para poupança!",
            valor_poupado: valor
        });

    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

exports.gastar = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id_crianca, valor, descricao } = req.body;
        const crianca = await Crianca.findByPk(id_crianca, { transaction });

        if (parseFloat(crianca.saldo_gastar) < parseFloat(valor)) {
            await transaction.rollback();
            return res.status(400).json({ message: "Saldo 'gastar' insuficiente" });
        }

        await crianca.update({
            saldo_gastar: parseFloat(crianca.saldo_gastar) - parseFloat(valor)
        }, { transaction });

        await HistoricoTransacao.create({
            id_crianca,
            tipo: "gastar",
            valor,
            descricao: descricao || "Compra realizada"
        }, { transaction });

        await transaction.commit();
        res.json({ mensagem: "Compra realizada com sucesso" });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: "Erro ao realizar compra" });
    }
};

exports.bonusPoupanca = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id_crianca, percentagem } = req.body;
        const crianca = await Crianca.findByPk(id_crianca, { transaction });

        const bonus = (parseFloat(crianca.saldo_poupar) * percentagem) / 100;

        await crianca.update({
            saldo_poupar: parseFloat(crianca.saldo_poupar) + bonus
        }, { transaction });

        await HistoricoTransacao.create({
            id_crianca,
            tipo: "bonus_gestao",
            valor: bonus,
            descricao: "Bónus poupança aplicado"
        }, { transaction });

        await transaction.commit();
        res.json({ mensagem: "Bónus aplicado", bonus });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: "Erro ao aplicar bónus" });
    }
};