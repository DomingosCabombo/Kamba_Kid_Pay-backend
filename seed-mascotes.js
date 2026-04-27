const Mascote = require("./src/models/Mascote");
const sequelize = require("./src/config/database");

const mascotes = [
  {
    nome: 'Kamba Azul',
    tagline: 'O mascote original!',
    descricao: 'O teu companheiro clássico, sempre animado para te ajudar a aprender!',
    tipo: 'Robô Espacial',
    emoji: '🤖',
    bg_color: '#DBEAFE',
    preco: 0,
    msg_correct: JSON.stringify(['Isso mesmo! Tu és incrível! ⭐', 'Acertaste! Tens muito talento! 🎉', 'Fantástico! Continua assim! 🚀']),
    msg_wrong: JSON.stringify(['Quase lá! Tenta outra vez! 💪', 'Não desistas! Tu consegues! 🌟', 'Aprende com o erro e vai em frente! 🤗']),
    msg_greeting: JSON.stringify(['Olá! Estou aqui para te ajudar! 😊', 'Hoje vais aprender coisas incríveis! 🎓', 'Vamos estudar juntos? 📚']),
    msg_drag: JSON.stringify(['Arrasta com cuidado! 😄', 'Qual é a resposta certa? 🤔', 'Pensa bem antes de arrastar! 🧠']),
    ordem: 1
  },
  {
    nome: 'Kamba Verde',
    tagline: 'Cheio de energia!',
    descricao: 'O guerreiro da natureza que adora tanto poupar dinheiro como o planeta!',
    tipo: 'Explorador Verde',
    emoji: '🦕',
    bg_color: '#DCFCE7',
    preco: 180,
    msg_correct: JSON.stringify(['RAWR! Que resposta incrível! 🦕', 'Sim! O dinosauro aprova! 🌿', 'Parabéns! Voa mais alto! 🦅']),
    msg_wrong: JSON.stringify(['ROAR! Quase! Tenta de novo! 🦕', 'O dinossauro não desiste, e tu também não! 💚', 'É assim que se aprende! 🌱']),
    msg_greeting: JSON.stringify(['ROAR! Pronto para aventura? 🦕', 'O Kamba Verde te saúda! 🌿', 'Hoje somos exploradores do saber! 🗺️']),
    msg_drag: JSON.stringify(['ROAR! Arrasta para a área certa! 🦕', 'O dinossauro está a observar! 👀', 'Mostra-me a tua sabedoria! 🧠']),
    ordem: 2
  },
  {
    nome: 'Kamba Rosa',
    tagline: 'Super fofa!',
    descricao: 'A princesa do aprendizado que transforma cada lição numa festa!',
    tipo: 'Unicórnio Mágico',
    emoji: '🦄',
    bg_color: '#FCE7F3',
    preco: 200,
    msg_correct: JSON.stringify(['Xiiii que bonito! Acertaste! ✨', 'A magia da aprendizagem! 🌈', 'Lindíssimo! Tu és brilhante! 💖']),
    msg_wrong: JSON.stringify(['Aiiiii quase! Nada de desistir! 🦄', 'Ups! Mas tu vais conseguir! 🌸', 'Até os unicórnios erram às vezes! 🌷']),
    msg_greeting: JSON.stringify(['Olá linda/o! Hoje aprendemos! 🦄', 'A festa do aprendizado começa! 🎊', 'Pronta/o para voar? 🌈']),
    msg_drag: JSON.stringify(['Arrasta com magia! ✨', 'Qual a moeda encantada? 🪄', 'A magia da resposta certa! 💫']),
    ordem: 3
  },
  {
    nome: 'Nutty Laranja',
    tagline: 'Esquilosamente esperto!',
    descricao: 'O esquilo ninja que guarda poupanças tão bem quanto as nozes!',
    tipo: 'Esquilo Ninja',
    emoji: 'Squirrel',
    bg_color: '#FED7AA',
    preco: 250,
    msg_correct: JSON.stringify(['NUT-CRACKER! Resposta correcta! 🐿️', 'Sou tão bom em guardar nozes quanto tu em saber! 🌰', 'ESQUILO APROVA! Bravo! 🐿️✨']),
    msg_wrong: JSON.stringify(['Ó querido... Quase! 🐿️', 'Nenhum esquilo desiste de uma noz! 💪', 'The nuts não param aqui! Tenta de novo! 🌰']),
    msg_greeting: JSON.stringify(['NUT-HELLO! Hora de aprender! 🐿️', 'O esquilo mais esperto chegou! 🌰', 'Hoje guardamos conhecimento! 🧠']),
    msg_drag: JSON.stringify(['Arrasta como um esquilo ágil! 🐿️', 'Guarda a resposta certa! 🌰', 'O esquilo fareja a resposta! 👃']),
    emoji: '🐿️',
    ordem: 4
  },
  {
    nome: 'Captain Koin',
    tagline: 'Herói das Finanças!',
    descricao: 'O super-herói das poupanças que protege o teu dinheiro!',
    tipo: 'Super Herói',
    emoji: '🦸',
    bg_color: '#FEF3C7',
    preco: 350,
    msg_correct: JSON.stringify(['SUPER RESPOSTA! O herói aprova! 🦸', 'Com grandes poderes, grandes respostas! ⚡', 'KOIN POWER! Incrível! 💰']),
    msg_wrong: JSON.stringify(['Até super-heróis erram! Tenta de novo! 🦸', 'O Koin acredita em ti! 💪⚡', 'Todo herói precisa de treino! 🌟']),
    msg_greeting: JSON.stringify(['O Captain Koin chegou! 🦸⚡', 'KOIN POWER activado! Hora de aprender! 💰', 'O guardião do teu dinheiro está aqui! 🛡️']),
    msg_drag: JSON.stringify(['KOIN POWER! Arrasta com força! 🦸', 'Usa o teu super-poder! ⚡', 'O herói espera a tua resposta! 💰']),
    ordem: 5
  },
  {
    nome: 'Luna Cósmica',
    tagline: 'Vinda das estrelas!',
    descricao: 'A astronauta das finanças que explora o universo do conhecimento!',
    tipo: 'Astronauta Cósmica',
    emoji: '👩‍🚀',
    bg_color: '#EDE9FE',
    preco: 400,
    msg_correct: JSON.stringify(['Houston, temos uma resposta correcta! 🚀', 'Missão cumprida! Tu és um astronauta do saber! ⭐', 'LAUNCH! Fantástico! 🌙']),
    msg_wrong: JSON.stringify(['Missão incompleta... Mas continua! 🚀', 'Os astronautas também aprendem com os erros! 🌙', 'Recalculando a rota! Tenta de novo! 🛸']),
    msg_greeting: JSON.stringify(['Houston, temos uma criança brilhante! 🚀', 'Missão de aprendizado: INICIADA! ⭐', 'Pronta/o para explorar o universo? 🌙']),
    msg_drag: JSON.stringify(['Arrasta com a precisão de um astronauta! 🚀', 'No espaço a gravidade é diferente... usa bem! 🌙', 'Missão: encontrar a resposta certa! ⭐']),
    ordem: 6
  }
];

async function seed() {
  try {
    await sequelize.sync();
    for (const m of mascotes) {
      await Mascote.findOrCreate({
        where: { nome: m.nome },
        defaults: m
      });
    }
    console.log("Mascotes semeados com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Erro ao semear mascotes:", error);
    process.exit(1);
  }
}

seed();
