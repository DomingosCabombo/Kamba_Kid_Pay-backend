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
const RespostaUsuario = require("./RespostaUsuario");
const Mascote = require("./Mascote");
const CriancaMascote = require("./CriancaMascote");


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
    RespostaUsuario,
    Mascote,
    CriancaMascote,
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
// Missão pertence a um Conteúdo (vídeo vinculado)
db.Missao.belongsTo(db.Conteudo, { foreignKey: "id_conteudo", as: "conteudo" });
db.Conteudo.hasMany(db.Missao, { foreignKey: "id_conteudo", as: "missoes" });

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
db.Missao.hasOne(db.Quiz, { foreignKey: "id_missao", as: "quiz" });
db.Quiz.belongsTo(db.Missao, { foreignKey: "id_missao", as: "Missao" });
db.Quiz.hasMany(db.QuizOpcao, { foreignKey: "id_quiz", as: "opcoes" });
db.QuizOpcao.belongsTo(db.Quiz, { foreignKey: "id_quiz", as: "quiz" });

// Associações da Resposta do Usuário
db.Criancas.hasMany(db.RespostaUsuario, { foreignKey: "id_crianca" });
db.RespostaUsuario.belongsTo(db.Criancas, { foreignKey: "id_crianca" });
db.Quiz.hasMany(db.RespostaUsuario, { foreignKey: "id_quiz", as: "Respostas" });
db.RespostaUsuario.belongsTo(db.Quiz, { foreignKey: "id_quiz", as: "quiz" });

console.log("Todas as associations foram carregadas com sucesso!");

// MASCOTES
db.Mascote = Mascote;
db.CriancaMascote = CriancaMascote;
db.Criancas.hasMany(db.CriancaMascote, { foreignKey: "id_crianca", as: "mascotes" });
db.CriancaMascote.belongsTo(db.Criancas, { foreignKey: "id_crianca" });
db.Mascote.hasMany(db.CriancaMascote, { foreignKey: "id_mascote", as: "criancas" });
db.CriancaMascote.belongsTo(db.Mascote, { foreignKey: "id_mascote", as: "mascote" });

module.exports = db;