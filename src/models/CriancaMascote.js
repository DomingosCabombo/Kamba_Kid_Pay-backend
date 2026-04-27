const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Tabela pivot: mascote ativo e desbloqueados por criança
const CriancaMascote = sequelize.define("crianca_mascote", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    id_crianca: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_mascote: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: false   // true = mascote activo/equipado
    },
    adquirido_em: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: "crianca_mascote",
    timestamps: false
});

module.exports = CriancaMascote;
