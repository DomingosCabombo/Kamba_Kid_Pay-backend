const sequelize = require('./src/config/database');
(async () => {
    try {
        console.log("Corrigindo tabela missao (tornando id_crianca NULLABLE)...");
        
        // 1. Desativar foreign keys temporariamente
        await sequelize.query("PRAGMA foreign_keys = OFF");
        
        await sequelize.transaction(async (t) => {
            // 2. Criar a nova tabela (id_crianca sem NOT NULL)
            // Vou pegar a definição exata das colunas
            await sequelize.query(`
                CREATE TABLE missao_new (
                    id_missao INTEGER PRIMARY KEY AUTOINCREMENT,
                    titulo VARCHAR(255) NOT NULL,
                    descricao TEXT NOT NULL,
                    tipo_missao TEXT NOT NULL,
                    xp_recompensa INTEGER NOT NULL DEFAULT 0,
                    recompensa_financeira DECIMAL(10,2) DEFAULT 0,
                    id_responsavel INTEGER REFERENCES responsavel(id_responsavel),
                    nivel_minimo INTEGER DEFAULT 1,
                    ativa TINYINT(1) DEFAULT 1,
                    tipo TEXT DEFAULT 'poupanca',
                    objetivo_valor DECIMAL(10,2) DEFAULT 0,
                    progresso_atual DECIMAL(10,2) DEFAULT 0,
                    icone VARCHAR(255) DEFAULT '🎯',
                    id_crianca INTEGER REFERENCES crianca(id_crianca), -- Sem NOT NULL aqui
                    concluida TINYINT(1) DEFAULT 0,
                    id_conteudo INTEGER REFERENCES conteudo(id_conteudo),
                    createdAt DATETIME NOT NULL,
                    updatedAt DATETIME NOT NULL
                )
            `, { transaction: t });

            // 3. Copiar dados
            await sequelize.query(`
                INSERT INTO missao_new (
                    id_missao, titulo, descricao, tipo_missao, xp_recompensa, 
                    recompensa_financeira, id_responsavel, nivel_minimo, ativa, 
                    tipo, objetivo_valor, progresso_atual, icone, id_crianca, 
                    concluida, createdAt, updatedAt
                )
                SELECT 
                    id_missao, titulo, descricao, tipo_missao, xp_recompensa, 
                    recompensa_financeira, id_responsavel, nivel_minimo, ativa, 
                    tipo, objetivo_valor, progresso_atual, icone, id_crianca, 
                    concluida, createdAt, updatedAt
                FROM missao
            `, { transaction: t });

            // 4. Remover antiga e renomear nova
            await sequelize.query("DROP TABLE missao", { transaction: t });
            await sequelize.query("ALTER TABLE missao_new RENAME TO missao", { transaction: t });
        });

        await sequelize.query("PRAGMA foreign_keys = ON");
        console.log("Sucesso!");
        process.exit(0);
    } catch (e) {
        console.error("Erro na migração:", e);
        process.exit(1);
    }
})();
