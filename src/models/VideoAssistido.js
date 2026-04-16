const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Conteudo = sequelize.define("conteudo", {
    id_conteudo: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('video', 'artigo', 'infografico'),
        defaultValue: 'video'
    },
    faixa_etaria: {
        type: DataTypes.ENUM('6-8', '9-10', '11-12'),
        defaultValue: '9-10'
    },
    thumbnail_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    duracao: {
        type: DataTypes.STRING,
        defaultValue: "5:00"
    },
    topico: {
        type: DataTypes.STRING,
        defaultValue: "educacao_financeira"
    },
    xp_recompensa: {
        type: DataTypes.INTEGER,
        defaultValue: 10
    },
    id_missao: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'missao',
            key: 'id_missao'
        }
    }
}, {
    tableName: "conteudo",
    timestamps: true
});

const ConteudoAssistido = sequelize.define("conteudo_assistido", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    id_crianca: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'crianca',
            key: 'id_crianca'
        }
    },
    id_conteudo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'conteudo',
            key: 'id_conteudo'
        }
    }
}, {
    tableName: "conteudo_assistido",
    timestamps: true
});


Conteudo.hasMany(ConteudoAssistido, { foreignKey: "id_conteudo" });
ConteudoAssistido.belongsTo(Conteudo, { foreignKey: "id_conteudo" });

// Exportar ambos
module.exports = {
    Conteudo,
    ConteudoAssistido
};