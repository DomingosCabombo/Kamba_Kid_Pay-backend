const { Op } = require("sequelize");
const Quiz = require("../models/Quiz");
const QuizOpcao = require("../models/QuizOpcao");
const Criancas = require("../models/Criancas");
const Missao = require("../models/Missoes");
const {Conteudo} = require("../models/VideoAssistido");
const {ConteudoAssistido} = require("../models/VideoAssistido");
const ProgressoMissao = require("../models/ProgressoMissao")
const RespostaUsuario = require ("../models/RespostaUsuario")
const sequelize = require("../config/database");

exports.buscarQuiz = async (req, res) => {
    try {
        const criancaId = req.usuario.id;
        const { id_missao } = req.params;

        const missao = await Missao.findByPk(id_missao, {
            include: [
                { model: Quiz, as: 'quiz', include: [{ model: QuizOpcao, as: 'opcoes' }] },
                { model: Conteudo, as: 'conteudo' }
            ]
        });

        if (!missao || missao.tipo_missao !== 'quiz') {
            return res.status(404).json({ erro: "QUIZ_NAO_ENCONTRADO" });
        }

        // 🔥 Se o quiz está vinculado a um vídeo, verificar se a criança já assistiu
        if (missao.id_conteudo) {
            const assistiu = await ConteudoAssistido.findOne({
                where: { id_crianca: criancaId, id_conteudo: missao.id_conteudo }
            });

            if (!assistiu) {
                return res.status(403).json({ 
                    erro: "PRECISA_ASSISTIR_VIDEO",
                    mensagem: "Assista ao vídeo primeiro antes de fazer o quiz!",
                    video: {
                        id: missao.conteudo.id_conteudo,
                        titulo: missao.conteudo.titulo,
                        url: missao.conteudo.url
                    }
                });
            }
        }

        // Retornar quiz (sem mostrar respostas corretas)
        const quiz = missao.quiz;
        const opcoesSemCorreta = quiz?.opcoes?.map(op => ({
            id: op.id_opcao,
            texto: op.texto,
            icone: ['💰', '🏦', '💸', '🎁', '🛒', '🤔', '💳', '🚫'][Math.floor(Math.random() * 8)]
        })) || [];

        res.json({
            id: missao.id_missao,
            titulo: missao.titulo,
            pergunta: quiz?.pergunta,
            opcoes: opcoesSemCorreta,
            pontosRecompensa: missao.xp_recompensa,
            videoVinculado: missao.conteudo ? {
                id: missao.conteudo.id_conteudo,
                titulo: missao.conteudo.titulo
            } : null
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

// ============================================
// POST /api/child/quiz/:id_missao/responder
// ============================================
exports.responderQuiz = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const criancaId = req.usuario.id;
        const { id_missao } = req.params;
        const { respostas } = req.body; // [{ id_opcao, correta }]

        const missao = await Missao.findByPk(id_missao, {
            include: [{ model: Quiz, as: 'quiz', include: [{ model: QuizOpcao, as: 'opcoes' }] }]
        });

        if (!missao || missao.tipo_missao !== 'quiz') {
            return res.status(404).json({ erro: "QUIZ_NAO_ENCONTRADO" });
        }

        // Verificar respostas
        const quiz = missao.quiz;
        const opcoesCorretas = quiz.opcoes.filter(op => op.correta).map(op => op.id_opcao);
        
        const todasCorretas = respostas.every(r => opcoesCorretas.includes(r.id_opcao));

        if (todasCorretas) {
            // Registrar resposta
            for (const resposta of respostas) {
                await RespostaUsuario.create({
                    id_crianca: criancaId,
                    id_quiz: quiz.id_quiz,
                    id_opcao: resposta.id_opcao,
                    correta: true
                }, { transaction });
            }

            // Dar XP
            const crianca = await Criancas.findByPk(criancaId, { transaction });
            const novoXP = crianca.xp + missao.xp_recompensa;
            const novoNivel = Math.floor(novoXP / 100) + 1;
            
            await crianca.update({ xp: novoXP, nivel: novoNivel }, { transaction });

            // Registrar progresso da missão
            await ProgressoMissao.upsert({
                id_crianca: criancaId,
                id_missao: id_missao,
                estado: 'concluida',
                data_conclusao: new Date()
            }, { transaction });

            await transaction.commit();

            res.json({
                mensagem: "🎉 Parabéns! Quiz concluído com sucesso!",
                xp_ganho: missao.xp_recompensa,
                xp_total: novoXP,
                novo_nivel: novoNivel
            });
        } else {
            await transaction.rollback();
            res.status(400).json({ 
                erro: "RESPOSTAS_INCORRETAS",
                mensagem: "Algumas respostas estão incorretas. Tente novamente!"
            });
        }

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};