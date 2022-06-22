const { getOAuthApp } = require('../lib/oauth');
const authorizationHandler = require('./authorizationHandler');
const cardBuilder = require('../lib/cardBuilder');
const rcAPI = require('../lib/rcAPI');

const { AsanaUser } = require('../models/asanaUserModel');
const { Subscription } = require('../models/subscriptionModel');

const botHandler = async event => {
    try {
        switch (event.type) {
            case 'BotJoinGroup':
                const { group: joinedGroup, bot: joinedBot } = event;
                await joinedBot.sendMessage(joinedGroup.id, { text: 'welcome' });
                break;
            case 'Message4Bot':
                const { text, group, bot: botForMessage, userId } = event;
                console.log(`=====incomingCommand.Message4Bot.${text}=====`);

                // Create/Find DM conversation to the RC user
                const createGroupResponse = await rcAPI.createConversation([userId], botForMessage.token.access_token);
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
                            await botForMessage.sendMessage(group.id, { text: 'Asana account already exists.' });
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
                            await authorizationHandler.unauthorize(existingAsanaUser);
                            await botForMessage.sendMessage(existingAsanaUser.rcDMGroupId, { text: 'successfully logged out.' });
                            await existingAsanaUser.destroy();
                        } else {
                            await botForMessage.sendMessage(group.id, { text: 'Cannot find Asana account.' });
                        }
                        break;
                    case 'config':
                        if (existingAsanaUser) {
                            const existingSubscription = await Subscription.findOne({
                                where: {
                                    asanaUserId: existingAsanaUser.id
                                }
                            });
                            const configCard = cardBuilder.configCard(botForMessage.id, existingSubscription);
                            await botForMessage.sendAdaptiveCard(createGroupResponse.id, configCard);
                        } else {
                            await botForMessage.sendMessage(group.id, { text: 'Cannot find Asana account.' });
                        }
                        break;
                }
        }
    }
    catch (e) {
        console.log(e);
    }
}

exports.botHandler = botHandler;