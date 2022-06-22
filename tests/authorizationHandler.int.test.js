const request = require('supertest');
const rcAPI = require('../src/lib/rcAPI');
const { server } = require('../src/server.js');
const { default: Bot } = require('ringcentral-chatbot-core/dist/models/Bot');
const { AsanaUser } = require('../src/models/asanaUserModel');
const { getOAuthApp } = require('../src/lib/oauth');
const nock = require('nock');
const { Subscription } = require('../src/models/subscriptionModel');

const groupId = 'groupId';
const botId = 'botId';
const asanaUserId = 'asanaUserId';
const asanaEmail = 'asanaEmail';
const asanaUserName = 'asanaUserName';
const asanaUserEmail = 'asanaUserEmail';
const asanaAccessToken = 'asanaAccessToken';
const asanaWebhookId = 'asanaWebhookId';
const asanaUserTaskListGid = 'asanaUserTaskListGid';
const rcUserId = 'rcUserId';
const newAsanaUserId = 'newAsanaUserId';
const newWorkspaceId = 'newWorkspaceId';
const newWorkspaceName = 'newWorkspaceName';

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
    await AsanaUser.create({
        id: asanaUserId,
        rcUserId,
        email: asanaEmail,
        name: asanaUserName,
        accessToken: asanaAccessToken,
        userTaskListGid: asanaUserTaskListGid,
        rcDMGroupId: groupId
    });
    await Bot.create({
        id: botId,
        token: {
            access_token: 'accessToken'
        }
    })
});

afterAll(async () => {
    await AsanaUser.destroy({
        where: {
            id: asanaUserId
        }
    });
    await Bot.destroy({
        where: {
            id: botId
        }
    });
    postScope.done();
    cardScope.done();
})

// Example tests
describe('oauthCallback', () => {
    describe('validations', () => {
        test('not botId - 404', async () => {
            // Arrange
            const callbackQueryString = 'state=rcUserId=rcUserId&code=authCode&scope=scope'

            // Act
            const res = await request(server).get(`/oauth-callback?${callbackQueryString}`);

            // Assert
            expect(res.status).toEqual(404);
            expect(res.text).toEqual('Bot not found');
        });

        test('not accessToken - 403', async () => {
            // Arrange
            getOAuthApp().code.getToken = jest.fn().mockReturnValue({
                accessToken: null
            })
            const callbackQueryString = 'state=botId=botId&rcUserId=rcUserId&code=authCode&scope=scope'

            // Act
            const res = await request(server).get(`/oauth-callback?${callbackQueryString}`);

            // Assert
            expect(res.status).toEqual(403);
            expect(res.text).toEqual('Params error');
        });
    });

    describe('authorization', () => {
        const accessToken = 'accessToken';
        const refreshToken = 'refreshToken';
        const expires = 'expires';
        test('existing account - return error message', async () => {
            // Arrange
            let requestBody = null;
            getOAuthApp().code.getToken = jest.fn().mockReturnValue({
                accessToken,
                refreshToken,
                expires
            })
            const callbackQueryString = 'state=botId=botId&rcUserId=rcUserId&code=authCode&scope=scope'

            const asanaGetUserScope = nock('https://app.asana.com')
                .get(`/api/1.0/users/me`)
                .once()
                .reply(200, {
                    data: {
                        gid: asanaUserId,
                        name: asanaUserName,
                        email: asanaUserEmail
                    }
                });
            postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });

            // Act
            const res = await request(server).get(`/oauth-callback?${callbackQueryString}`);

            // Assert
            expect(res.status).toEqual(200);
            expect(requestBody.text).toBe(`Asana account ${asanaUserEmail} already exists.`);

            // Clean up
            asanaGetUserScope.done();
        });

        test('new account - return successful message', async () => {
            // Arrange
            let postRequestBody = null;
            let cardRequestBody = null;
            getOAuthApp().code.getToken = jest.fn().mockReturnValue({
                accessToken,
                refreshToken,
                expires
            })
            const callbackQueryString = 'state=botId=botId&rcUserId=rcUserId&code=authCode&scope=scope'

            const asanaGetUserScope = nock('https://app.asana.com')
                .get(`/api/1.0/users/me`)
                .once()
                .reply(200, {
                    data: {
                        gid: newAsanaUserId,
                        name: asanaUserName,
                        email: asanaUserEmail
                    }
                });
            const asanaWorkspaceScope = nock('https://app.asana.com')
                .get(`/api/1.0/workspaces?limit=50`)
                .once()
                .reply(200, {
                    data: [{
                        gid: newWorkspaceId,
                        name: newWorkspaceName
                    }]
                });
            const asanaCreateWebhookScope = nock('https://app.asana.com')
                .post(`/api/1.0/webhooks`)
                .once()
                .reply(200, {
                    data: {
                        gid: asanaWebhookId
                    }
                });

            const asanaUseTaskListScope = nock('https://app.asana.com')
                .get(`/api/1.0/users/me/user_task_list?workspace=${newWorkspaceId}`)
                .once()
                .reply(200, {
                    data: {
                        gid: asanaUserTaskListGid
                    }
                });


            postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                postRequestBody = JSON.parse(reqBody);
            });
            cardScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                cardRequestBody = JSON.parse(reqBody);
            });

            // Act
            const res = await request(server).get(`/oauth-callback?${callbackQueryString}`);

            // Assert
            expect(res.status).toEqual(200);
            expect(postRequestBody.text).toBe("Successfully logged in.");
            expect(cardRequestBody.body[0].text).toBe('Config');

            // Clean up
            await AsanaUser.destroy({
                where: {
                    id: newAsanaUserId
                }
            })
            await Subscription.destroy({
                where: {
                    asanaUserId: newAsanaUserId
                }
            })
            asanaGetUserScope.done();
            asanaWorkspaceScope.done();
            asanaCreateWebhookScope.done();
            asanaUseTaskListScope.done();
        });
    });
});