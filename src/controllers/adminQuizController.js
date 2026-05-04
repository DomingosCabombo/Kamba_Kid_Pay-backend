const db = require("../models/Associations");
const { 
    Missao, 
    Quiz, 
    QuizOpcao, 
    RespostaUsuario, 
    Conteudo,
    LogAdmin,
    sequelize 
} = db;
const { Op } = require("sequelize");


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
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        const respostas = await RespostaUsuario.findAll({
            attributes: ['id_quiz']
        });

        const counts = {};
        respostas.forEach(r => {
            if (r.id_quiz) counts[r.id_quiz] = (counts[r.id_quiz] || 0) + 1;
        });

        const resultado = missoesQuiz.map(m => {
            const missao = m.get({ plain: true });
            const quiz = missao.quiz;
            
            const vezesCompletado = quiz ? (counts[quiz.id_quiz] || 0) : 0;
            
            const catMap = {
                'poupanca': 'Poupar',
                'consumo': 'Gastar',
                'solidariedade': 'Ajudar',
                'estudo': 'Investir',
                'saude': 'Planejamento'
            };

            return {
                id: missao.id_missao,
                titulo: missao.titulo || 'Sem Título',
                descricao: missao.descricao || '',
                categoria: catMap[missao.tipo] || 'Poupar',
                dificuldade: missao.nivel_minimo === 1 ? 'Fácil' : (missao.nivel_minimo === 2 ? 'Média' : 'Difícil'),
                pergunta: quiz?.pergunta || '',
                opcoes: quiz?.opcoes?.map((op, idx) => ({
                    id: op.id_opcao,
                    texto: op.texto,
                    correta: op.correta,
                    icone: ['💰', '🏦', '💸', '🎁', '🛒', '🤔', '💳', '🚫'][idx % 8]
                })) || [],
                explicacao: missao.descricao || '',
                pontosRecompensa: missao.xp_recompensa || 0,
                vezesCompletado: vezesCompletado,
                dataCriacao: missao.createdAt
            };
        });

        res.json({ total: resultado.length, quizzes: resultado });

    } catch (error) {
        console.error("ERRO LISTAR QUIZZES:", error);
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
            id_crianca: 1,
            id_conteudo: id_conteudo || null // ← NOVO: vincular a vídeo (opcional)
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
exports.deletarQuiz = async (req, res) => {
    try {
        const { id } = req.params;

        // Desabilitar temporariamente as verificações de foreign key
        await sequelize.query('PRAGMA foreign_keys = OFF');
        
        try {
            // Buscar quiz_id
            const [quiz] = await sequelize.query(
                `SELECT id_quiz FROM quiz WHERE id_missao = ?`,
                { replacements: [id] }
            );
            
            if (quiz.length > 0) {
                const quizId = quiz[0].id_quiz;
                
                // Deletar respostas
                await sequelize.query(`DELETE FROM resposta_usuario WHERE id_quiz = ?`, { replacements: [quizId] });
                
                // Deletar opções
                await sequelize.query(`DELETE FROM quiz_opcao WHERE id_quiz = ?`, { replacements: [quizId] });
                
                // Deletar quiz
                await sequelize.query(`DELETE FROM quiz WHERE id_quiz = ?`, { replacements: [quizId] });
            }
            
            // Deletar progresso
            await sequelize.query(`DELETE FROM progresso_missao WHERE id_missao = ?`, { replacements: [id] });
            
            // Desvincular conteúdo
            await sequelize.query(`UPDATE missao SET id_conteudo = NULL WHERE id_missao = ?`, { replacements: [id] });
            
            // Deletar missão
            await sequelize.query(`DELETE FROM missao WHERE id_missao = ?`, { replacements: [id] });
            
        } finally {
            // Reativar as verificações de foreign key
            await sequelize.query('PRAGMA foreign_keys = ON');
        }
        
        res.json({ mensagem: "Quiz deletado com sucesso!" });

    } catch (error) {
        console.error("Erro deletar quiz:", error);
        // Garantir que foreign keys sejam reativadas
        await sequelize.query('PRAGMA foreign_keys = ON');
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};

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

        // Mapear categoria
        let tipo;
        switch (categoria) {
            case 'Poupar': tipo = 'poupanca'; break;
            case 'Gastar': tipo = 'consumo'; break;
            case 'Investir': tipo = 'poupanca'; break;
            case 'Doar': tipo = 'solidariedade'; break;
            default: tipo = missao.tipo;
        }

        // Mapear dificuldade
        let nivelMinimo;
        switch (dificuldade) {
            case 'Fácil': nivelMinimo = 1; break;
            case 'Média': nivelMinimo = 2; break;
            case 'Difícil': nivelMinimo = 3; break;
            default: nivelMinimo = missao.nivel_minimo;
        }

        await missao.update({
            titulo: titulo || missao.titulo,
            descricao: explicacao || descricao || missao.descricao,
            tipo: tipo,  // ← Agora 'tipo' está definido
            xp_recompensa: pontosRecompensa !== undefined ? pontosRecompensa : missao.xp_recompensa,
            nivel_minimo: nivelMinimo  // ← Agora 'nivelMinimo' está definido
        }, { transaction });

        // Atualizar quiz
        const quiz = await Quiz.findOne({ where: { id_missao: id }, transaction });

        if (quiz) {
            const updates = {};
            if (pergunta) updates.pergunta = pergunta;
            
            if (Object.keys(updates).length > 0) {
                await quiz.update(updates, { transaction });
            }
        }

        // Atualizar opções se fornecidas
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

        // Verificar se LogAdmin existe, se não, apenas ignore
        if (db.LogAdmin) {
            await db.LogAdmin.create({
                id_admin: req.usuario.id,
                acao: "ATUALIZAR",
                entidade: "quiz",
                id_entidade: id
            }, { transaction });
        }

        await transaction.commit();
        res.json({ mensagem: "Quiz atualizado com sucesso!" });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Erro atualizar quiz:", error);
        res.status(500).json({ erro: "ERRO_INTERNO", mensagem: error.message });
    }
};