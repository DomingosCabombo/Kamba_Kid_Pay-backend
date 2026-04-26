const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Tarefa = sequelize.define("tarefas", {
    id_tarefa: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descricao: {
        type: DataTypes.TEXT
    },
    recompensa: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM(
            "pendente",
            "aguardando_aprovacao",
            "aprovada",
            "rejeitada"
        ),
        defaultValue: "pendente"
    },
    foto_comprovacao: {
        type: DataTypes.STRING
    },
    categoria: {
        type: DataTypes.ENUM('save', 'spend', 'help'),
        defaultValue: 'save'
    },
    icone: {
        type: DataTypes.STRING,
        defaultValue: "clipboard"
    },
    motivo_rejeicao: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    concluido_em: {
        type: DataTypes.DATE,
        allowNull: true
    },
    aprovado_em: {
        type: DataTypes.DATE,
        allowNull: true
    },
    rejeitado_em: {
        type: DataTypes.DATE,
        allowNull: true
    },
    id_crianca: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'crianca',
            key: 'id_crianca'
        }
    },
    id_responsavel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Responsavel',
            key: 'id_responsavel'
        }
    },
    id_missao: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'missao',
            key: 'id_missao'
        }
    },
    data_limite: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: "tarefas",
    timestamps: true
});

module.exports = Tarefa;