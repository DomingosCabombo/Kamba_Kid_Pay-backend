require("dotenv").config();
const app = require("./src/app");
const sequelize = require("./src/config/database");

require("./src/models/Associations"); 

sequelize.sync()
    .then(() => {
        console.log("Banco de dados sincronizado");
        app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
            console.log(`Servidor rodando em http://localhost:${process.env.PORT || 3000}`);
        });
    })
    .catch(err => {
        console.error("Erro ao sincronizar banco:", err);
    });