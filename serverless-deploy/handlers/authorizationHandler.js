const { getOAuthApp, checkAndRefreshAccessToken, revokeToken } = require('../lib/oauth');
const Bot = require('ringcentral-chatbot-core/dist/models/Bot').default;
const asana = require('asana');
const { AsanaUser } = require('../models/asanaUserModel');
const rcAPI = require('../lib/rcAPI');
const subscriptionHandler = require('./subscriptionHandler');
const cardBuilder = require('../lib/cardBuilder');

async function oauthCallback(req, res) {
    const queryParams = new URLSearchParams(req.query.state)
    const botId = queryParams.get('botId');
    const rcUserId = queryParams.get('rcUserId');
    const oauthApp = getOAuthApp();
    const bot = await Bot.findByPk(botId);
    if (!bot) {
        console.error(`Bot not found with botId: ${botId}`);
        res.status(404);
        res.send('Bot not found');
        return;
    }

    const { accessToken, refreshToken, expires } = await oauthApp.code.getToken(req.url);
    if (!accessToken) {
        res.status(403);
        res.send('Params error');
        return;
    }

    console.log(`Receiving accessToken: ${accessToken} and refreshToken: ${refreshToken}`);
    try {
        // Step1: Get user info from 3rd party API call
        const asanaClient = asana.Client.create().useAccessToken(accessToken);
        const userInfo = await asanaClient.users.me();
        const userId = userInfo.gid;

        // Create/Find DM conversation to the RC user
        const createGroupResponse = await rcAPI.createConversation([rcUserId], bot.token.access_token);

        // Find if it's existing user in our database
        let asanaUser = await AsanaUser.findByPk(userId);
        // Step2: If user doesn't exist, we want to create a new one
        if (!asanaUser) {
            const workspacesResponse = await asanaClient.workspaces.findAll();
            asanaUser = await AsanaUser.create({
                id: userId,
                name: userInfo.name,
                email: userInfo.email,
                botId,
                rcUserId,
                accessToken: accessToken,
                refreshToken: refreshToken,
                tokenExpiredAt: expires,
                rcDMGroupId: createGroupResponse.id,
                workspaceName: workspacesResponse.data[0].name,
                workspaceId: workspacesResponse.data[0].gid,
                taskDueReminderInterval: 'off',
                timezoneOffset: '0'
            });

            await subscriptionHandler.subscribe(asanaUser, workspacesResponse.data[0], asanaUser.rcDMGroupId);

            await bot.sendMessage(asanaUser.rcDMGroupId, { text: `Successfully logged in.` });

            const configCard = cardBuilder.configCard(bot.id, asanaUser);
            await bot.sendAdaptiveCard(asanaUser.rcDMGroupId, configCard);
        }
        else {
            await bot.sendMessage(asanaUser.rcDMGroupId, { text: `Asana account ${userInfo.email} already exists.` });
        }
    } catch (e) {
        console.error(e);
        res.status(500);
        res.send('Internal error.');
    }
    res.status(200);
    res.send('<!doctype><html><body>Successfully authorized. Please close this page.<script>window.close()</script></body></html>')
};

async function unauthorize(asanaUser) {
    await checkAndRefreshAccessToken(asanaUser);
    await subscriptionHandler.unsubscribeAll(asanaUser);
    await revokeToken(asanaUser);
}


exports.oauthCallback = oauthCallback;
exports.unauthorize = unauthorize;