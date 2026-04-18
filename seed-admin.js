const bcrypt = require("bcrypt");
const sequelize = require("./src/config/database");
const Admin = require("./src/models/Admin");

async function seedAdmin() {
  try {
    // Verificar se a tabela existe / sincronizar
    await sequelize.authenticate();
    console.log("Conectado ao banco de dados SQLite.");

    const usersToSeed = [
      { email: "admin", nome: "Admin Demo" },
      { email: "admin@kambakidpay.com", nome: "Super Admin" }
    ];

    for (const u of usersToSeed) {
      const [admin, created] = await Admin.findOrCreate({
        where: { email: u.email },
        defaults: {
          nome: u.nome,
          email: u.email,
          senha: await bcrypt.hash("admin123", 10),
          tipo: "super_admin",
          ativo: true
        }
      });

      if (created) {
        console.log(`✅ Admin ${u.email} criado com sucesso!`);
      } else {
        console.log(`⚠️ Admin ${u.email} já existe!`);
      }
    }

  } catch (error) {
    console.error("❌ Erro ao criar admin:", error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

seedAdmin();
