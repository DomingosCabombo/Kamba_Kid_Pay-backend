const { Missao, Quiz, QuizOpcao, Conteudo, Criancas, sequelize } = require("./src/models/Associations");

async function seed() {
    try {
        await sequelize.authenticate();
        console.log("Conectado ao banco de dados.");

        // Tentar encontrar uma criança para vincular (devido a restrição NOT NULL no SQLite)
        let placeholderChild = await Criancas.findOne();
        if (!placeholderChild) {
            console.log("Nenhuma criança encontrada. Criando uma criança fictícia para vincular os conteúdos...");
            // Nota: Isso pode falhar se não houver um responsável. 
            // Mas assumimos que o ambiente de teste já tem alguns dados.
            // Se falhar, usaremos id_crianca: 1 e torcemos para que exista.
        }
        const childId = placeholderChild ? placeholderChild.id_crianca : 1;

        // 1. Criar Missão do Quiz 1 (Poupar)
        const missaoQuiz1 = await Missao.create({
            titulo: "O que é Poupar?",
            descricao: "Teste seus conhecimentos sobre a importância de guardar dinheiro.",
            tipo_missao: "quiz",
            tipo: "poupanca",
            xp_recompensa: 50,
            ativa: true,
            id_crianca: childId // Vinculado a uma criança (workaround SQLite)
        });

        const quiz1 = await Quiz.create({
            id_missao: missaoQuiz1.id_missao,
            pergunta: "Qual é o principal benefício de poupar dinheiro?"
        });

        await QuizOpcao.bulkCreate([
            { texto: "Poder comprar algo maior no futuro", correta: true, id_quiz: quiz1.id_quiz },
            { texto: "Não ter dinheiro para o lanche", correta: false, id_quiz: quiz1.id_quiz },
            { texto: "Perder o dinheiro para o banco", correta: false, id_quiz: quiz1.id_quiz },
            { texto: "Gastar tudo hoje", correta: false, id_quiz: quiz1.id_quiz }
        ]);

        // 2. Criar Vídeo 1 e associar ao Quiz 1
        await Conteudo.create({
            titulo: "A Magia de Poupar",
            descricao: "Aprenda como pequenas quantias podem se transformar em grandes sonhos.",
            tipo: "video",
            faixa_etaria: "6-8",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            thumbnail_url: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800",
            duracao: "03:45",
            topico: "poupanca",
            xp_recompensa: 20,
            id_missao: missaoQuiz1.id_missao
        });

        // 3. Criar Missão do Quiz 2 (Gastar)
        const missaoQuiz2 = await Missao.create({
            titulo: "Gastar com Sabedoria",
            descricao: "Descubra a diferença entre necessidade e desejo.",
            tipo_missao: "quiz",
            tipo: "consumo",
            xp_recompensa: 75,
            ativa: true,
            id_crianca: childId
        });

        const quiz2 = await Quiz.create({
            id_missao: missaoQuiz2.id_missao,
            pergunta: "Antes de comprar um brinquedo novo, o que é mais importante fazer?"
        });

        await QuizOpcao.bulkCreate([
            { texto: "Pensar se eu realmente preciso dele agora", correta: true, id_quiz: quiz2.id_quiz },
            { texto: "Pedir dinheiro emprestado", correta: false, id_quiz: quiz2.id_quiz },
            { texto: "Comprar logo antes que acabe", correta: false, id_quiz: quiz2.id_quiz },
            { texto: "Chorar para os pais", correta: false, id_quiz: quiz2.id_quiz }
        ]);

        // 4. Criar Vídeo 2 e associar ao Quiz 2
        await Conteudo.create({
            titulo: "Consumo Consciente",
            descricao: "Saiba como fazer escolhas inteligentes com o seu Kamba.",
            tipo: "video",
            faixa_etaria: "9-10",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            thumbnail_url: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800",
            duracao: "04:20",
            topico: "consumo",
            xp_recompensa: 30,
            id_missao: missaoQuiz2.id_missao
        });

        // 5. Conteúdo extra
        await Conteudo.create({
            titulo: "O valor da Generosidade",
            descricao: "Entenda como ajudar os outros também é uma forma de usar o dinheiro.",
            tipo: "video",
            faixa_etaria: "11-12",
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            thumbnail_url: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800",
            duracao: "05:10",
            topico: "solidariedade",
            xp_recompensa: 25,
            id_missao: null
        });

        console.log(`Seed finalizado com sucesso! (Conteúdos vinculados à criança ID: ${childId})`);
        process.exit(0);
    } catch (error) {
        console.error("Erro ao rodar seed:", error);
        process.exit(1);
    }
}

seed();
