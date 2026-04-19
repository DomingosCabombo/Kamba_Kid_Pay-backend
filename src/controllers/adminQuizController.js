// controllers/adminQuizController.js
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Missao = require("../models/Missoes");
const Quiz = require("../models/Quiz");
const QuizOpcao = require("../models/QuizOpcao");
const {Conteudo} = require("../models/VideoAssistido")
const RespostaUsuario = require("../models/RespostaUsuario");
const LogAdmin = require("../models/LogAdmin");

// ============================================
// GET /api/admin/quizzes
// ============================================
exports.listarQuizzes = async (req, res) => {
    try {
        const missoesQuiz = await Missao.findAll({
            where: { tipo_missao: 'quiz' },
            include: [
                {
                    model: Quiz,
                    as: 'quiz',
                    include: [{
                        model: QuizOpcao,
                        as: 'opcoes'
                    }]
                },
                {
                    model: Conteudo,
                    as: 'conteudo',  // ← ALIAS DEFINIDO
                    attributes: ['id_conteudo', 'titulo', 'tipo', 'thumbnail_url']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Calcular vezes completado
        const respostas = await RespostaUsuario.findAll({
            include: [{
                model: Quiz,
                as: 'Quiz',
                attributes: ['id_missao']
            }]
        });

        const resultado = missoesQuiz.map(missao => {
            const quiz = missao.quiz;
            const conteudo = missao.conteudo;  // ← ACESSAR COM O ALIAS
            
            return {
                id: missao.id_missao,
                titulo: missao.titulo,
                descricao: missao.descricao,
                categoria: missao.tipo === 'poupanca' ? 'Poupar' : (missao.tipo === 'consumo' ? 'Gastar' : 'Doar'),
                dificuldade: missao.nivel_minimo === 1 ? 'Fácil' : (missao.nivel_minimo === 2 ? 'Média' : 'Difícil'),
                pergunta: quiz?.pergunta || '',
                opcoes: quiz?.opcoes?.map((op, idx) => ({
                    id: op.id_opcao,
                    texto: op.texto,
                    correta: op.correta,
                    icone: ['💰', '🏦', '💸', '🎁', '🛒', '🤔', '💳', '🚫'][idx % 8]
                })) || [],
                explicacao: missao.descricao,
                pontosRecompensa: missao.xp_recompensa,
                vezesCompletado: 0,
                dataCriacao: missao.createdAt,
                videoVinculado: conteudo ? {
                    id: conteudo.id_conteudo,
                    titulo: conteudo.titulo,
                    thumbnail: conteudo.thumbnail_url
                } : null
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
            titulo, 
            descricao, 
            categoria, 
            dificuldade, 
            pergunta, 
            opcoes, 
            explicacao, 
            pontosRecompensa,
            id_conteudo  // ← NOVO: ID do vídeo/conteúdo vinculado
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

        // Criar missão
        const missao = await Missao.create({
            titulo,
            descricao: explicacao || descricao,
            tipo_missao: 'quiz',
            tipo: tipo,
            xp_recompensa: pontosRecompensa || 50,
            nivel_minimo: nivelMinimo,
            ativa: true,
            id_crianca: null,
            id_conteudo: id_conteudo || null  // ← NOVO: vincular a vídeo (opcional)
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
            detalhes: JSON.stringify({ titulo, categoria, id_conteudo })
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            mensagem: "Quiz criado com sucesso!",
            quiz: { 
                id: missao.id_missao, 
                titulo, 
                categoria, 
                pontosRecompensa,
                id_conteudo: id_conteudo || null
            }
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Erro criar quiz:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// DELETE /api/admin/quizzes/:id
// ============================================
// controllers/adminQuizController.js - deletarQuiz

exports.deletarQuiz = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;

        const missao = await Missao.findByPk(id, { transaction });
        
        if (!missao) {
            if (transaction) await transaction.rollback();
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
            id_entidade: id,
            detalhes: JSON.stringify({ titulo: missao.titulo })
        }, { transaction });

        await transaction.commit();
        res.json({ mensagem: "Quiz deletado com sucesso!" });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Erro deletar quiz:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// PUT /api/admin/quizzes/:id
// Atualiza um quiz existente
// ============================================
// PUT /api/admin/quizzes/:id (atualizar)
// ===========================================
exports.atualizarQuiz = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { 
            titulo, 
            descricao, 
            categoria, 
            dificuldade, 
            pergunta, 
            opcoes, 
            explicacao, 
            pontosRecompensa 
        } = req.body;

        const missao = await Missao.findByPk(id, { transaction });
        if (!missao || missao.tipo_missao !== 'quiz') {
            if (transaction) await transaction.rollback();
            return res.status(404).json({ erro: "QUIZ_NAO_ENCONTRADO" });
        }

        await missao.update({
            titulo: titulo || missao.titulo,
            descricao: explicacao || descricao || missao.descricao,
            tipo: tipo,
            xp_recompensa: pontosRecompensa || missao.xp_recompensa,
            nivel_minimo: nivelMinimo
        }, { transaction });

        // Atualizar quiz
        const quiz = await Quiz.findOne({ where: { id_missao: id }, transaction });
        
        if (quiz && pergunta) {
            await quiz.update({ pergunta }, { transaction });
        }

        // 🔥 CORREÇÃO: Verificar se opcoes existe e é um array
        if (quiz && opcoes && Array.isArray(opcoes) && opcoes.length > 0) {
            // Remover opções antigas
            await QuizOpcao.destroy({ where: { id_quiz: quiz.id_quiz }, transaction });

            // Criar novas opções
            for (const opcao of opcoes) {
                await QuizOpcao.create({
                    texto: opcao.texto,
                    correta: opcao.correta || false,
                    id_quiz: quiz.id_quiz
                }, { transaction });
            }
        }

        await LogAdmin.create({
            id_admin: req.usuario.id,
            acao: "ATUALIZAR",
            entidade: "quiz",
            id_entidade: id
        }, { transaction });

        await transaction.commit();
        res.json({ mensagem: "Quiz atualizado com sucesso!" });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Erro atualizar quiz:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

function mapearCategoriaFrontend(tipo) {
    const mapa = {
        'poupanca': 'Poupar',
        'consumo': 'Gastar',
        'solidariedade': 'Ajudar',
        'investimento': 'Investir',
        'planejamento': 'Planejamento'
    };
    return mapa[tipo] || 'Poupar';
}
