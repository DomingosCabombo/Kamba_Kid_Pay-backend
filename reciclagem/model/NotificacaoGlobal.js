const { DataTypes } = require("sequelize");
const sequelize = require("../../src/config/database");

const NotificacaoGlobal = sequelize.define("notificacao_global", {
    id_notificacao: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mensagem: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('info', 'alerta', 'promocao', 'sistema'),
        defaultValue: 'info'
    },
    publico_alvo: {
        type: DataTypes.ENUM('todos', 'responsaveis', 'criancas'),
        defaultValue: 'todos'
    },
    enviada_em: {
        type: DataTypes.DATE,
        allowNull: true
    },
    ativa: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: "notificacoes_globais",
    timestamps: true
});

module.exports = NotificacaoGlobal;
