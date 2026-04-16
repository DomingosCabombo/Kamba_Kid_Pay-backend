const sequelize = require("../config/database");
const Responsavel = require("./Responsavel");
const Criancas = require("./Criancas");
const Campanhas = require("./Campanha");
const Doacoes = require("./Doacoes");
const ProgressoMissao = require("./ProgressoMissao");
const Missao = require("./Missoes");
const { Conteudo, ConteudoAssistido } = require("./VideoAssistido");
const Tarefa = require("./Tarefa");
const Historico = require("./HistoricoTransacao");
const ShopItem = require("./ShopItem");
const CriancaShopItem = require("./CriancaShopItem");
const Quiz = require("./Quiz")
const QuizOpcao = require("./QuizOpcao")


const db = {
    Responsavel,
    Criancas,
    Campanhas,
    Doacoes,
    ProgressoMissao,
    Missao,
    Conteudo,           
    ConteudoAssistido,
    Tarefa,
    Historico,
    ShopItem,
    CriancaShopItem,
    Quiz,
    QuizOpcao,
    sequelize
};

// ========== ASSOCIATIONS ==========

// DOAÇÕES
db.Criancas.hasMany(db.Doacoes, { foreignKey: "id_crianca" });
db.Doacoes.belongsTo(db.Criancas, { foreignKey: "id_crianca" });

db.Campanhas.hasMany(db.Doacoes, { foreignKey: "id_campanha" });
db.Doacoes.belongsTo(db.Campanhas, { foreignKey: "id_campanha" });


// CRIANÇA -> PROGRESSO
db.Criancas.hasMany(db.ProgressoMissao, { foreignKey: "id_crianca" });
db.Missao.hasMany(db.ProgressoMissao, { foreignKey: "id_missao" });
db.ProgressoMissao.belongsTo(db.Criancas, { foreignKey: "id_crianca" });
db.ProgressoMissao.belongsTo(db.Missao, { foreignKey: "id_missao" });

// RESPONSÁVEL -> CRIANÇAS
db.Responsavel.hasMany(db.Criancas, { foreignKey: "id_responsavel" });
db.Criancas.belongsTo(db.Responsavel, { foreignKey: "id_responsavel" });

// CRIANÇA -> HISTÓRICO
db.Criancas.hasMany(db.Historico, { foreignKey: "id_crianca" });
db.Historico.belongsTo(db.Criancas, { foreignKey: "id_crianca" });

// CRIANÇA -> TAREFAS
db.Criancas.hasMany(db.Tarefa, { foreignKey: "id_crianca" });
db.Tarefa.belongsTo(db.Criancas, { foreignKey: "id_crianca" });

// RESPONSÁVEL -> TAREFAS
db.Responsavel.hasMany(db.Tarefa, { foreignKey: "id_responsavel" });
db.Tarefa.belongsTo(db.Responsavel, { foreignKey: "id_responsavel" });

// MISSÃO -> CONTEÚDO
db.Missao.hasMany(db.Conteudo, { foreignKey: "id_missao" });
db.Conteudo.belongsTo(db.Missao, { foreignKey: "id_missao" });

// CRIANÇA -> CONTEUDO_ASSISTIDO (através da tabela pivô)
db.Criancas.hasMany(db.ConteudoAssistido, { foreignKey: "id_crianca" });
db.ConteudoAssistido.belongsTo(db.Criancas, { foreignKey: "id_crianca" });

// RESPONSÁVEL -> MISSÕES
db.Responsavel.hasMany(db.Missao, { foreignKey: "id_responsavel" });
db.Missao.belongsTo(db.Responsavel, { foreignKey: "id_responsavel" });

//SHOP_ITEM E CRIANCA_SHOP_ITEM
db.ShopItem.hasMany(db.CriancaShopItem, { foreignKey: "id_item", as: "compras" });
db.CriancaShopItem.belongsTo(db.ShopItem, { foreignKey: "id_item", as: "item" });

// CRIANÇA -> CRIANCA_SHOP_ITEM
db.Criancas.hasMany(db.CriancaShopItem, { foreignKey: "id_crianca", as: "itens_comprados" });
db.CriancaShopItem.belongsTo(db.Criancas, { foreignKey: "id_crianca", as: "crianca" });

// Associações do Quiz
db.Missao.hasOne(Quiz, { foreignKey: "id_missao" });
db.Quiz.belongsTo(Missao, { foreignKey: "id_missao" });
db.Quiz.hasMany(QuizOpcao, { foreignKey: "id_quiz" });
db.QuizOpcao.belongsTo(Quiz, { foreignKey: "id_quiz" });

console.log("Todas as associations foram carregadas com sucesso!");

module.exports = db;