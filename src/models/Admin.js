const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Admin = sequelize.define("admin", {
    id_admin: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    senha: {
        type: DataTypes.STRING,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('super_admin', 'moderador', 'analista'),
        defaultValue: 'moderador'
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    ultimo_acesso: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: "admins",
    timestamps: true
});

module.exports = Admin;
