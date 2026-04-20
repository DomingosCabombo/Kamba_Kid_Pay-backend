const sequelize = require('./src/config/database');
(async () => {
    try {
        console.log("Adicionando coluna id_conteudo à tabela missao...");
        await sequelize.query("ALTER TABLE missao ADD COLUMN id_conteudo INTEGER REFERENCES conteudo(id_conteudo)");
        console.log("Ok!");
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(0); // Ignorar se já existe
    }
})();
