const { Conteudo, ConteudoAssistido } = require("../models/VideoAssistido");
const Criancas = require("../models/Criancas");
const Missao = require("../models/Missoes");
const Quiz = require("../models/Quiz");
const QuizOpcao = require("../models/QuizOpcao");
const RespostaUsuario = require("../models/RespostaUsuario");
const sequelize = require("../config/database");
const { Op } = require("sequelize");

// GET /api/educational-content
exports.listContent = async (req, res) => {
    try {
        const criancaId = req.usuario.id;
        const { faixa_etaria } = req.query;

        const crianca = await Criancas.findByPk(criancaId);
        if (!crianca) {
            return res.status(404).json({ 
                erro: "CRIANCA_NAO_ENCONTRADA", 
                mensagem: "Criança não encontrada." 
            });
        }

        const idadeCrianca = crianca.idade;
        let faixaRecomendada =  '0-100';
        
        if (!faixaRecomendada) {
            if (idadeCrianca <= 8) faixaRecomendada = '6-8';
            else if (idadeCrianca <= 10) faixaRecomendada = '9-10';
            else faixaRecomendada = '11-12';
        }

        //const conteudos = await Conteudo.findAll({
        //    where: { faixa_etaria: faixaRecomendada }
        //});

        const conteudos = await Conteudo.findAll();

        const conteudosAssistidos = await ConteudoAssistido.findAll({
            where: { id_crianca: criancaId },
            attributes: ['id_conteudo']
        });
        const idsAssistidos = conteudosAssistidos.map(c => c.id_conteudo);

        res.json({
            conteudos: conteudos.map(c => ({
                id: c.id_conteudo,
                titulo: c.titulo,
                descricao: c.descricao,
                tipo: c.tipo,
                faixa_etaria: c.faixa_etaria,
                thumbnail_url: c.thumbnail_url,
                url: c.url,
                duracao: c.duracao,
                topico: c.topico,
                id_missao: c.id_missao, 
                completo: idsAssistidos.includes(c.id_conteudo)
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// GET /api/educational-content/quiz/:missaoId
exports.getQuizDetails = async (req, res) => {
    try {
        const { missaoId } = req.params;
        
        const quiz = await Quiz.findOne({
            where: { id_missao: missaoId },
            include: [{
                model: QuizOpcao,
                as: 'opcoes',
                attributes: ['id_opcao', 'texto', 'id_quiz']
            }]
        });

        if (!quiz) {
            return res.status(404).json({ erro: "QUIZ_NAO_ENCONTRADO" });
        }

        res.json({
            id: quiz.id_quiz,
            id_missao: quiz.id_missao,
            pergunta: quiz.pergunta,
            opcoes: quiz.opcoes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// POST /api/educational-content/quiz/:quizId/submit
exports.submitQuiz = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { quizId } = req.params;
        const { id_opcao } = req.body;
        const criancaId = req.usuario.id;

        const quiz = await Quiz.findByPk(quizId, {
            include: [{ model: Missao, as: 'Missao' }]
        });
        const opcao = await QuizOpcao.findByPk(id_opcao);

        if (!quiz || !opcao || opcao.id_quiz !== parseInt(quizId)) {
            await transaction.rollback();
            return res.status(404).json({ erro: "DADOS_INVALIDOS" });
        }

        const jaRespondeu = await RespostaUsuario.findOne({
            where: { id_crianca: criancaId, id_quiz: quizId, correta: true }
        });

        const correta = opcao.correta;

        // Registrar resposta
        await RespostaUsuario.create({
            id_crianca: criancaId,
            id_quiz: quizId,
            id_opcao: id_opcao,
            correta: correta
        }, { transaction });

        let recompensa = { xp: 0, pontos: 0 };

        if (correta && !jaRespondeu) {
            const crianca = await Criancas.findByPk(criancaId, { transaction });
            const xpGanho = quiz.Missao?.xp_recompensa || 20;
            
            recompensa.xp = xpGanho;
            
            const novoXP = crianca.xp + xpGanho;
            const novoNivel = Math.floor(novoXP / 100) + 1;
            
            await crianca.update({
                xp: novoXP,
                nivel: novoNivel
            }, { transaction });
        }

        await transaction.commit();
        res.json({
            correta,
            mensagem: correta ? "Parabéns! Acertaste!" : "Não foi desta vez. Tenta novamente!",
            recompensa: correta && !jaRespondeu ? recompensa : null
        });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// GET /api/educational-content/quiz/geral?quantidade=5
// Returns N random quizzes from the whole database (for general test mode)
exports.getGeneralQuizzes = async (req, res) => {
    try {
        const quantidade = Math.min(parseInt(req.query.quantidade) || 5, 10);

        // Fetch all quizzes with their options
        const todos = await Quiz.findAll({
            include: [{
                model: QuizOpcao,
                as: 'opcoes',
                attributes: ['id_opcao', 'texto', 'correta', 'id_quiz']
            }]
        });

        if (todos.length === 0) {
            return res.status(404).json({ erro: "SEM_QUIZZES", mensagem: "Nenhum quiz encontrado na base de dados." });
        }

        // Shuffle and pick
        const shuffled = todos.sort(() => Math.random() - 0.5).slice(0, quantidade);

        res.json({
            quizzes: shuffled.map(q => ({
                id: q.id_quiz,
                pergunta: q.pergunta,
                xp_recompensa: q.xp_recompensa || 20,
                opcoes: q.opcoes.map(o => ({
                    id_opcao: o.id_opcao,
                    texto: o.texto,
                    correta: o.correta,
                    id_quiz: o.id_quiz
                }))
            }))
        });

    } catch (error) {
        console.error("getGeneralQuizzes error:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};
exports.completeContent = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { contentId } = req.params;
        const criancaId = req.usuario.id;

        const conteudo = await Conteudo.findByPk(contentId, { transaction });
      
        if (!conteudo) {
            await transaction.rollback();
            return res.status(404).json({ erro: "CONTEUDO_NAO_ENCONTRADO" });
        }

        const crianca = await Criancas.findByPk(criancaId, { transaction });
        
        // Registrar visualização
        const [registro, created] = await ConteudoAssistido.findOrCreate({
            where: { id_crianca: criancaId, id_conteudo: contentId },
            transaction
        });
        if (!created) {
       

            await transaction.rollback();
            return res.json({ mensagem: "Conteúdo concluído!", xp_ganho: 0 });
            // return res.status(400).json({ erro: "JA_COMPLETO", mensagem: "Já completaste este conteúdo." });
        }

        // Dar XP por assistir
        const xp_por_assistir = conteudo.xp_recompensa || 10;
        const xpGanho = conteudo.xp_recompensa || 10;
        const novoXP = crianca.xp + xpGanho + xp_por_assistir;
        const novoNivel = Math.floor(novoXP / 100) + 1;
         console.log("chegou aqui", novoXP);
       const crianca2 = await crianca.update({ xp: novoXP, nivel: novoNivel }, { transaction });

        await transaction.commit();
        res.json({ mensagem: "Conteúdo concluído!", xp_ganho: xpGanho });

    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};