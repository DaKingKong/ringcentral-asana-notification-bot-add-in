const { getOAuthApp } = require('../lib/oauth');
const cardBuilder = require('../lib/cardBuilder');
const rcAPI = require('../lib/rcAPI');

const { AsanaUser } = require('../models/asanaUserModel');
const { RcUser } = require('../models/rcUserModel');

const HELPER_TEXT =
    'Hi there, this is **Asana Bot**.\n\n' +
    'Log in with your Asana Account to receive notifications on **New Assign Task**, **New Comments** and **Task Due Reminder**. Here are my commands:\n' +
    '1. `login`: **Login** with your Asana Account\n' +
    '2. `logout`: **Logout** your Asana Account and **clear all** subscriptions created by it\n' +
    '3. `config`: **Show** current config settings\n' +
    '4. `help`: **Show** this help message'


const botHandler = async event => {
    try {
        switch (event.type) {
            case 'BotJoinGroup':
                const { group: joinedGroup, bot: joinedBot } = event;
                await joinedBot.sendMessage(joinedGroup.id, { text: HELPER_TEXT });
                break;
            case 'Message4Bot':
                const { text, group, bot: botForMessage, userId } = event;
                // Create/Find DM conversation to the RC user
                const createGroupResponse = await rcAPI.createConversation([userId], botForMessage.token.access_token);
                const rcUser = await RcUser.findByPk(userId);
                if (!rcUser) {
                    await RcUser.create({
                        id: userId,
                        rcDMGroupId: createGroupResponse.id
                    })
                }
                const existingAsanaUser = await AsanaUser.findOne({
                    where: {
                        rcUserId: userId
                    }
                });

                switch (text.toLowerCase()) {
                    case 'hello':
                        await botForMessage.sendMessage(group.id, { text: 'hello' });
                        break;
                    case 'login':
                        if (existingAsanaUser) {
                            await botForMessage.sendMessage(group.id, { text: 'You have already logged in.' });
                        }
                        else {
                            const oauthApp = getOAuthApp();
                            const authLink = `${oauthApp.code.getUri({
                                state: `botId=${botForMessage.id}&rcUserId=${userId}`
                            })}`;
                            const authCard = cardBuilder.authCard(authLink);
                            await botForMessage.sendAdaptiveCard(createGroupResponse.id, authCard);
                        }
                        break;
                    case 'logout':
                        if (existingAsanaUser) {
                            const unAuthCard = cardBuilder.unAuthCard(botForMessage.id, 'Logging out will remove all existing Asana event subscriptions.');
                            await botForMessage.sendAdaptiveCard(createGroupResponse.id, unAuthCard);
                        } else {
                            await botForMessage.sendMessage(group.id, { text: 'Asana account not found. Please type `login` to authorize your account.' });
                        }
                        break;
                    case 'config':
                        if (existingAsanaUser) {
                            const configCard = cardBuilder.configCard(botForMessage.id, existingAsanaUser);
                            await botForMessage.sendAdaptiveCard(createGroupResponse.id, configCard);
                        } else {
                            await botForMessage.sendMessage(group.id, { text: 'Asana account not found. Please type `login` to authorize your account.' });
                        }
                        break;
                    case 'help':
                    default:
                        await botForMessage.sendMessage(group.id, { text: HELPER_TEXT });
                        break;
                }
        }
    }
    catch (e) {
        console.log(e?.status);
        console.log(e?.message);
    }
}

exports.botHandler = botHandler;