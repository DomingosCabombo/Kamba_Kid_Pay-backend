const sequelize = require('./src/config/database');
(async () => {
    try {
        const [results] = await sequelize.query("PRAGMA table_info(missao)");
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
