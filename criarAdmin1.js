const bcrypt = require("bcrypt");
const sequelize = require("../Kamba Kid Pay/src/config/database");
const Admin = require("../Kamba Kid Pay/src/models/Admin");

async function criarAdmin() {
    try {
        await sequelize.sync();
        
        const senhaHash = await bcrypt.hash("admin123", 10);
        
        const [admin, created] = await Admin.findOrCreate({
            where: { email: "admin@kambakidpay.com" },
            defaults: {
                nome: "Super Admin",
                email: "admin@kambakidpay.com",
                senha: senhaHash,
                tipo: "super_admin",
                ativo: true
            }
        });
        
        if (created) {
            console.log("✅ Admin criado com sucesso!");
            console.log("📧 Email: admin@kambakidpay.com");
            console.log("🔑 Senha: admin123");
        } else {
            console.log("⚠️ Admin já existe!");
        }
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Erro:", error);
        process.exit(1);
    }
}

criarAdmin();
