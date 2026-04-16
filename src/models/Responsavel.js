const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Responsavel = sequelize.define("Responsavel", {
    id_responsavel: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome_completo: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    telefone: {
        type: DataTypes.STRING(20)
    },

    tipo: {
        type: DataTypes.ENUM("pai", "mãe", "avô", "avó", "tio", "tia", "outro"),
        allowNull: false
    },

    senha: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    provincia: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    municipio: {
        type: DataTypes.STRING(100),
        allowNull: true
    }, ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: true
    },
    config_valor_mesada: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    config_valor_frequencia: {
        type: DataTypes.ENUM('diaria', 'semanal', 'mensal'),
        defaultValue: 'mensal'
    },
    perc_gastar: {
        type: DataTypes.INTEGER,
        defaultValue: 40
    },
    perc_poupar: {
        type: DataTypes.INTEGER,
        defaultValue: 40
    },
    perc_ajudar: {
        type: DataTypes.INTEGER,
        defaultValue: 20
    }
}, {
    tableName: "Responsavel",
    timestamps: false
});

module.exports = Responsavel;