const Responsavel = require('./src/models/Responsavel');
(async () => {
    try {
        const u = await Responsavel.findOne();
        console.log(JSON.stringify(u, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
