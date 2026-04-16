const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const LogAdmin = sequelize.define("log_admin", {
    id_log: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    id_admin: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    acao: {
        type: DataTypes.STRING,
        allowNull: false
    },
    entidade: {
        type: DataTypes.STRING,
        allowNull: false
    },
    id_entidade: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    detalhes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ip: {
        type: DataTypes.STRING(45),
        allowNull: true
    }
}, {
    tableName: "logs_admin",
    timestamps: true
});

module.exports = LogAdmin;
