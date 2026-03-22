const sequelize = require("../config/database");

// Importar todos os models
const Responsavel = require("./Responsavel");
const Criancas = require("./Criancas");
const Campanhas = require("./Campanha");
const Doacoes = require("./Doacoes");
const ProgressoMissao = require("./ProgressoMissao");
const Quiz = require("./Quiz");
const Missao = require("./Missoes");
const QuizOpcao = require("./QuizOpcao");
const RespostaUsuario = require("./RespostaUsuario");
const { Conteudo, ConteudoAssistido } = require("./VideoAssistido");
const Tarefa = require("./Tarefa");
const CofreMeta = require("./CofreMeta");
const Mascote = require("./Mascote");
const CriancaMascote = require("./CriancaMascote");
const Historico = require("./HistoricoTransacao");

// Objeto db com todos os models
const db = {
    Responsavel,
    Criancas,
    Campanhas,
    Doacoes,
    ProgressoMissao,
    Quiz,
    Missao,
    QuizOpcao,
    RespostaUsuario,
    Conteudo,           
    ConteudoAssistido,
    Tarefa,
    CofreMeta,
    Mascote,
    CriancaMascote,
    Historico,
    sequelize
};

// ========== ASSOCIATIONS ==========

// DOAÇÕES
db.Criancas.hasMany(db.Doacoes, { foreignKey: "id_crianca" });
db.Doacoes.belongsTo(db.Criancas, { foreignKey: "id_crianca" });

db.Campanhas.hasMany(db.Doacoes, { foreignKey: "id_campanha" });
db.Doacoes.belongsTo(db.Campanhas, { foreignKey: "id_campanha" });

// MISSÃO -> QUIZ
db.Missao.hasMany(db.Quiz, { foreignKey: "id_missao" });
db.Quiz.belongsTo(db.Missao, { foreignKey: "id_missao" });

// QUIZ -> OPÇÕES
db.Quiz.hasMany(db.QuizOpcao, { foreignKey: "id_quiz" });
db.QuizOpcao.belongsTo(db.Quiz, { foreignKey: "id_quiz" });

// CRIANÇA -> RESPOSTAS
db.Criancas.hasMany(db.RespostaUsuario, { foreignKey: "id_crianca" });
db.RespostaUsuario.belongsTo(db.Criancas, { foreignKey: "id_crianca" });

// QUIZ -> RESPOSTAS
db.Quiz.hasMany(db.RespostaUsuario, { foreignKey: "id_quiz" });
db.RespostaUsuario.belongsTo(db.Quiz, { foreignKey: "id_quiz" });

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

// ⚠️ NOVAS ASSOCIATIONS PARA CONTEÚDO
// MISSÃO -> CONTEÚDO
db.Missao.hasMany(db.Conteudo, { foreignKey: "id_missao" });
db.Conteudo.belongsTo(db.Missao, { foreignKey: "id_missao" });

// CRIANÇA -> CONTEUDO_ASSISTIDO (através da tabela pivô)
db.Criancas.hasMany(db.ConteudoAssistido, { foreignKey: "id_crianca" });
db.ConteudoAssistido.belongsTo(db.Criancas, { foreignKey: "id_crianca" });

// CONTEÚDO -> CONTEUDO_ASSISTIDO
// ⚠️ NOTA: Esta association já foi definida dentro do próprio VideoAssistido.js
// Não precisa repetir aqui, senão dá erro de duplicação

// CRIANÇA -> COFRE METAS
db.Criancas.hasMany(db.CofreMeta, { foreignKey: "id_crianca" });
db.CofreMeta.belongsTo(db.Criancas, { foreignKey: "id_crianca" });

// MASCOTE -> CRIANCA_MASCOTE
db.Mascote.hasMany(db.CriancaMascote, { foreignKey: "id_mascote" });
db.CriancaMascote.belongsTo(db.Mascote, { foreignKey: "id_mascote" });

// CRIANÇA -> CRIANCA_MASCOTE
db.Criancas.hasMany(db.CriancaMascote, { foreignKey: "id_crianca" });
db.CriancaMascote.belongsTo(db.Criancas, { foreignKey: "id_crianca" });

// RESPONSÁVEL -> MISSÕES
db.Responsavel.hasMany(db.Missao, { foreignKey: "id_responsavel" });
db.Missao.belongsTo(db.Responsavel, { foreignKey: "id_responsavel" });

console.log("✅ Todas as associations foram carregadas com sucesso!");

module.exports = db;