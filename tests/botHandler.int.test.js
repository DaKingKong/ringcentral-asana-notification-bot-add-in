const { default: Bot } = require('ringcentral-chatbot-core/dist/models/Bot');
const { botHandler } = require('../src/handlers/botHandler');
const { AsanaUser } = require('../src/models/asanaUserModel');
const { Subscription } = require('../src/models/subscriptionModel');
const rcAPI = require('../src/lib/rcAPI');
const nock = require('nock');

const groupId = 'groupId';
const botId = 'botId';
const asanaUserId = 'asanaUserId';
const asanaEmail = 'asanaEmail';
const asanaUserName = 'asanaUserName';
const rcUserId = 'rcUserId';
const subId = 'subId';

const unknownRcUserId = 'unknownRcUserId';

const postScope = nock(process.env.RINGCENTRAL_SERVER)
    .persist()
    .post(`/restapi/v1.0/glip/groups/${groupId}/posts`)
    .reply(200, 'OK');
const cardScope = nock(process.env.RINGCENTRAL_SERVER)
    .persist()
    .post(`/restapi/v1.0/glip/chats/${groupId}/adaptive-cards`)
    .reply(200, 'OK');

beforeAll(async () => {
    rcAPI.createConversation = jest.fn().mockReturnValue({
        id: "groupId"
    });
    await Bot.create({
        id: botId,
        token: {
            access_token: 'accessToken'
        }
    })
    await AsanaUser.create({
        id: asanaUserId,
        rcUserId,
        email: asanaEmail,
        name: asanaUserName
    });
    await Subscription.create({
        id: subId,
        asanaUserId,
        groupId
    })
});

afterAll(async () => {
    await Bot.destroy({
        where: {
            id: botId
        }
    });
    await AsanaUser.destroy({
        where: {
            id: asanaUserId
        }
    });
    await Subscription.destroy({
        where: {
            id: subId
        }
    });
    postScope.done();
    cardScope.done();
})

describe('botHandler', () => {

    describe('bot join group', () => {
        test('show welcome message', async () => {
            // Arrange
            let requestBody = null;
            const bot = await Bot.findByPk(botId);
            const event = {
                type: "BotJoinGroup",
                userId: unknownRcUserId,
                bot,
                group: {
                    id: "groupId"
                }
            }
            postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });

            // Act
            await botHandler(event);

            // Assert
            expect(requestBody.text).not.toBeNull();
        });
    });

    describe('@bot hello & help', () => {
        test('return hello message', async () => {
            // Arrange
            let requestBody = null;
            const bot = await Bot.findByPk(botId);
            const event = {
                type: "Message4Bot",
                text: "hello",
                userId: rcUserId,
                bot,
                group: {
                    id: "groupId"
                }
            }
            postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });

            // Act
            await botHandler(event);

            // Assert
            expect(requestBody.text).not.toBeNull();
        });

        test('return help message', async () => {
            // Arrange
            let requestBody = null;
            const bot = await Bot.findByPk(botId);
            const event = {
                type: "Message4Bot",
                text: "help",
                userId: rcUserId,
                bot,
                group: {
                    id: "groupId",
                    members: [
                        1,
                        2
                    ]
                }
            }
            postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });

            // Act
            await botHandler(event);

            // Assert
            expect(requestBody.text).not.toBeNull();
        });
    });

    describe('@bot login', () => {
        test('existing Asana Account - error message', async () => {
            // Arrange
            let requestBody = null;
            const bot = await Bot.findByPk(botId);
            const event = {
                type: "Message4Bot",
                text: "login",
                userId: rcUserId,
                bot,
                group: {
                    id: "groupId"
                }
            }
            postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });

            // Act
            await botHandler(event);

            // Assert
            expect(requestBody.text).toBe("You have already logged in.");
        });

        test('no Asana Account - auth card', async () => {
            // Arrange
            let requestBody = null;
            const bot = await Bot.findByPk(botId);
            const event = {
                type: "Message4Bot",
                text: "login",
                userId: unknownRcUserId,
                bot,
                group: {
                    id: "groupId"
                }
            }
            cardScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });

            // Act
            await botHandler(event);

            // Assert
            expect(requestBody.type).toBe('AdaptiveCard');
            expect(requestBody.body[0].text).toBe('Asana Login');
        });
    });

    describe('@bot logout', () => {
        test('no Asana Account - error message', async () => {
            // Arrange
            let requestBody = null;
            const bot = await Bot.findByPk(botId);
            const event = {
                type: "Message4Bot",
                text: "logout",
                userId: unknownRcUserId,
                bot,
                group: {
                    id: "groupId"
                }
            }
            postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });

            // Act
            await botHandler(event);

            // Assert
            expect(requestBody.text).toBe("Asana account not found. Please type `login` to authorize your account.");
        });

        test('has Asana Account - logout card', async () => {
            // Arrange
            let requestBody = null;
            const bot = await Bot.findByPk(botId);
            const event = {
                type: "Message4Bot",
                text: "logout",
                userId: rcUserId,
                bot,
                group: {
                    id: "groupId"
                }
            }
            cardScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });

            // Act
            await botHandler(event);

            // Assert
            expect(requestBody.type).toBe('AdaptiveCard');
            expect(requestBody.body[0].text).toBe('Asana Logout');
        });
    });

    describe('@bot config', () => {
        test('no Asana Account - error message', async () => {
            // Arrange
            let requestBody = null;
            const bot = await Bot.findByPk(botId);
            const event = {
                type: "Message4Bot",
                text: "config",
                userId: unknownRcUserId,
                bot,
                group: {
                    id: "groupId"
                }
            }
            postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });

            // Act
            await botHandler(event);

            // Assert
            expect(requestBody.text).toBe("Asana account not found. Please type `login` to authorize your account.");
        });

        test('has Asana Account - config card', async () => {
            // Arrange
            let requestBody = null;
            const bot = await Bot.findByPk(botId);
            const event = {
                type: "Message4Bot",
                text: "config",
                userId: rcUserId,
                bot,
                group: {
                    id: "groupId"
                }
            }
            cardScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });

            // Act
            await botHandler(event);

            // Assert
            expect(requestBody.type).toBe('AdaptiveCard');
            expect(requestBody.body[0].text).toBe('Config');
        });
    });
});