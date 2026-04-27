const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("🛠️ Atualizando banco de dados...");

db.serialize(() => {
  // Adicionar motivo_rejeicao
  db.run("ALTER TABLE tarefas ADD COLUMN motivo_rejeicao TEXT;", (err) => {
    if (err) {
      if (err.message.includes("duplicate column name")) {
        console.log("✅ Coluna motivo_rejeicao já existe.");
      } else {
        console.error("❌ Erro ao adicionar motivo_rejeicao:", err.message);
      }
    } else {
      console.log("✅ Coluna motivo_rejeicao adicionada.");
    }
  });

  // Adicionar data_limite
  db.run("ALTER TABLE tarefas ADD COLUMN data_limite DATETIME;", (err) => {
    if (err) {
      if (err.message.includes("duplicate column name")) {
        console.log("✅ Coluna data_limite já existe.");
      } else {
        console.error("❌ Erro ao adicionar data_limite:", err.message);
      }
    } else {
      console.log("✅ Coluna data_limite adicionada.");
    }
  });

  db.close();
});
