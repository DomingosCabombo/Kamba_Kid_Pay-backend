const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Quiz = sequelize.define("quiz", {
    id_quiz: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    pergunta: {
        type: DataTypes.STRING,
        allowNull: false
    },
    xp_recompensa: { 
        type: DataTypes.INTEGER,
        defaultValue: 10
    },
    id_missao: {
        type: DataTypes.INTEGER,
        allowNull: true, // Pode ou não pertencer a uma missão
        references: {
            model: 'missao',
            key: 'id_missao'
        }
    }
}, {
    tableName: "quiz",
    timestamps: false
});

module.exports = Quiz;