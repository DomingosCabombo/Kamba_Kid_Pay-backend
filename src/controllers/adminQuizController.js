// controllers/adminQuizController.js
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Missao = require("../models/Missoes");
const Quiz = require("../models/Quiz");
const QuizOpcao = require("../models/QuizOpcao");
const RespostaUsuario = require("../models/RespostaUsuario");
const LogAdmin = require("../models/LogAdmin");

// ============================================
// GET /api/admin/quizzes
// ============================================
exports.listarQuizzes = async (req, res) => {
    try {
        const missoesQuiz = await Missao.findAll({
            where: { tipo_missao: 'quiz' },
            include: [{
                model: Quiz,
                as: 'Quiz',
                include: [{ model: QuizOpcao, as: 'QuizOpcaos' }]
            }],
            order: [['createdAt', 'DESC']]
        });

        // Calcular vezes completado
        const respostas = await RespostaUsuario.findAll({
            include: [{
                model: Quiz,
                attributes: ['id_missao']
            }]
        });

        const resultado = missoesQuiz.map(missao => {
            const quiz = missao.Quiz;
            const vezesCompletado = respostas.filter(r => r.Quiz?.id_missao === missao.id_missao).length;
            
            return {
                id: missao.id_missao,
                titulo: missao.titulo,
                descricao: missao.descricao,
                categoria: mapearCategoriaFrontend(missao.tipo),
                dificuldade: missao.nivel_minimo === 1 ? 'Fácil' : (missao.nivel_minimo === 2 ? 'Média' : 'Difícil'),
                pergunta: quiz?.pergunta || '',
                opcoes: quiz?.QuizOpcaos?.map((op, idx) => ({
                    id: op.id_opcao,
                    texto: op.texto,
                    correta: op.correta,
                    icone: ['💰', '🏦', '💸', '🎁', '🛒', '🤔', '💳', '🚫'][idx % 8]
                })) || [],
                explicacao: missao.descricao,
                pontosRecompensa: missao.xp_recompensa,
                vezesCompletado: vezesCompletado,
                dataCriacao: missao.createdAt
            };
        });

        res.json({ total: resultado.length, quizzes: resultado });

    } catch (error) {
        console.error("Erro listar quizzes:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// POST /api/admin/quizzes
// ============================================
exports.criarQuiz = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            titulo, descricao, categoria, dificuldade,
            pergunta, opcoes, explicacao, pontosRecompensa
        } = req.body;

        // Mapear categoria
        let tipo;
        switch (categoria) {
            case 'Poupar': tipo = 'poupanca'; break;
            case 'Gastar': tipo = 'consumo'; break;
            case 'Investir': tipo = 'poupanca'; break;
            case 'Doar': tipo = 'solidariedade'; break;
            default: tipo = 'poupanca';
        }

        // Mapear dificuldade
        let nivelMinimo;
        switch (dificuldade) {
            case 'Fácil': nivelMinimo = 1; break;
            case 'Média': nivelMinimo = 2; break;
            case 'Difícil': nivelMinimo = 3; break;
            default: nivelMinimo = 1;
        }

        // 🔥 CORREÇÃO: id_crianca NÃO é obrigatório para missões do sistema
        const missao = await Missao.create({
            titulo,
            descricao: explicacao || descricao,
            tipo_missao: 'quiz',
            tipo: tipo,
            xp_recompensa: pontosRecompensa || 50,
            nivel_minimo: nivelMinimo,
            ativa: true,
            id_crianca: null  // ← Missão do sistema, não vinculada a uma criança específica
        }, { transaction });

        // Criar quiz
        const quiz = await Quiz.create({
            pergunta: pergunta,
            id_missao: missao.id_missao
        }, { transaction });

        // Criar opções
        for (const opcao of opcoes) {
            await QuizOpcao.create({
                texto: opcao.texto,
                correta: opcao.correta,
                id_quiz: quiz.id_quiz
            }, { transaction });
        }

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "CRIAR",
            entidade: "quiz",
            id_entidade: missao.id_missao,
            detalhes: JSON.stringify({ titulo, categoria })
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            mensagem: "Quiz criado com sucesso!",
            quiz: { id: missao.id_missao, titulo, categoria, pontosRecompensa }
        });

    } catch (error) {
        await transaction.rollback();
        console.error("Erro criar quiz:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// DELETE /api/admin/quizzes/:id
// ============================================
exports.deletarQuiz = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;

        const missao = await Missao.findByPk(id, { transaction });
        if (!missao) {
            await transaction.rollback();
            return res.status(404).json({ erro: "QUIZ_NAO_ENCONTRADO" });
        }

        // Buscar quiz associado
        const quiz = await Quiz.findOne({ where: { id_missao: id }, transaction });
        if (quiz) {
            await QuizOpcao.destroy({ where: { id_quiz: quiz.id_quiz }, transaction });
            await quiz.destroy({ transaction });
        }
        
        await missao.destroy({ transaction });

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "DELETAR",
            entidade: "quiz",
            id_entidade: id
        }, { transaction });

        await transaction.commit();
        res.json({ mensagem: "Quiz deletado com sucesso!" });

    } catch (error) {
        await transaction.rollback();
        console.error("Erro deletar quiz:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// Função auxiliar
function mapearCategoriaFrontend(tipo) {
    const mapa = {
        'poupanca': 'Poupar',
        'consumo': 'Gastar',
        'solidariedade': 'Doar'
    };
    return mapa[tipo] || 'Poupar';
}

// ============================================
// PUT /api/admin/quizzes/:id
// Atualiza um quiz existente
// ============================================
exports.atualizarQuiz = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const {
            titulo, descricao, categoria, dificuldade,
            pergunta, opcoes, explicacao, pontosRecompensa
        } = req.body;

        const missao = await Missao.findByPk(id, { transaction });
        if (!missao || missao.tipo_missao !== 'quiz') {
            await transaction.rollback();
            return res.status(404).json({ erro: "QUIZ_NAO_ENCONTRADO" });
        }

        // Atualizar missão
        await missao.update({
            titulo,
            descricao: explicacao || descricao,
            xp_recompensa: pontosRecompensa || 50
        }, { transaction });

        // Buscar e atualizar quiz
        const quiz = await Quiz.findOne({ where: { id_missao: id }, transaction });
        if (quiz) {
            await quiz.update({ pergunta }, { transaction });

            // Remover opções antigas
            await QuizOpcao.destroy({ where: { id_quiz: quiz.id_quiz }, transaction });

            // Criar novas opções
            for (const opcao of opcoes) {
                await QuizOpcao.create({
                    texto: opcao.texto,
                    correta: opcao.correta,
                    id_quiz: quiz.id_quiz
                }, { transaction });
            }
        }

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "ATUALIZAR",
            entidade: "quiz",
            id_entidade: id,
            detalhes: JSON.stringify({ titulo, categoria })
        }, { transaction });

        await transaction.commit();

        res.json({ mensagem: "Quiz atualizado com sucesso!" });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

