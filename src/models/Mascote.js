const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Mascote = sequelize.define("mascote", {
    id_mascote: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    tagline: {
        type: DataTypes.STRING,
        allowNull: true
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tipo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    emoji: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    bg_color: {
        type: DataTypes.STRING(20),
        defaultValue: '#DBEAFE'
    },
    preco: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    msg_correct: {
        type: DataTypes.TEXT,  // JSON array of messages
        defaultValue: '["Muito bem! 🎉"]'
    },
    msg_wrong: {
        type: DataTypes.TEXT,
        defaultValue: '["Quase lá! 💪"]'
    },
    msg_greeting: {
        type: DataTypes.TEXT,
        defaultValue: '["Olá! 😊"]'
    },
    msg_drag: {
        type: DataTypes.TEXT,
        defaultValue: '["Arrasta a resposta! 🤔"]'
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    ordem: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: "mascotes",
    timestamps: false
});

module.exports = Mascote;
