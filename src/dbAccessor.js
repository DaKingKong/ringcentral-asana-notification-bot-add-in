// require('dotenv').config();
const { sequelize } = require('./models/sequelize');
const { default: Bot } = require('ringcentral-chatbot-core/dist/models/Bot');

async function executeQuery(input) {
    try {
        if (input.Query) {
            console.log(input.dbQuery);
            const result = await sequelize.query(input.dbQuery);
            console.log(JSON.stringify(result, null, 2));
        }
        if (input.ensureWebhook) {
            const bots = await Bot.findAll();
            for (const bot of bots) {
                await bot.ensureWebHook();
            }
        }
    }
    catch (e) {
        console.error(e.message);
    }
}

exports.app = executeQuery;