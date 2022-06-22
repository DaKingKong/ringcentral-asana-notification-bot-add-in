const { default: Bot } = require('ringcentral-chatbot-core/dist/models/Bot');
const { AsanaUser } = require('../src/models/asanaUserModel');
const { Subscription } = require('../src/models/subscriptionModel');
const request = require('supertest');
const { server } = require('../src/server.js');
const rcAPI = require('../src/lib/rcAPI');
const nock = require('nock');

const groupId = 'groupId';
const botId = 'botId';
const asanaUserId = 'asanaUserId';
const anotherAsanaUserId = 'anotherAsanaUserId';
const asanaUserEmail = 'asanaUserEmail';
const asanaUserName = 'asanaUserName';
const asanaAccessToken = 'asanaAccessToken';
const asanaUserTaskListGid = 'asanaUserTaskListGid';
const rcUserId = 'rcUserId';
const subId = 'subId';
const taskId = 'taskId';
const taskName = 'taskName';
const taskNote = 'taskNote';
const taskProjectName = 'taskProjectName';
const taskDueOn = 'taskDueOn';
const taskPermaLink = 'taskPermaLink';
const commentId = 'commentId';

const unknownSubId = 'unknownSubId';

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
        email: asanaUserEmail,
        accessToken: asanaAccessToken,
        name: asanaUserName,
        userTaskListGid: asanaUserTaskListGid,
        botId
    });
    await AsanaUser.create({
        id: anotherAsanaUserId,
        rcUserId,
        email: asanaUserEmail,
        name: asanaUserName,
        botId
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
    await AsanaUser.destroy({
        where: {
            id: anotherAsanaUserId
        }
    });
    await Subscription.destroy({
        where: {
            id: subId
        }
    });
    cardScope.done();
})

describe('notificationHandler', () => {
    describe('validation', () => {
        test('asana hand shake check', async () => {
            // Arrange
            const postData = {
                events: null
            }

            // Act
            const res = await request(server).post('/notification').set('X-Hook-Secret', 'handshake_secret').send(postData);

            // Assert
            expect(res.status).toEqual(200);
            expect(res.get('x-hook-secret')).toEqual('handshake_secret');
        });
    });

    describe('notification events', () => {
        test('subscription not found - no notification', async () => {
            // Arrange
            const postData = {
                events: [
                    {
                        user: {
                            gid: asanaUserId
                        }
                    }
                ]
            }

            // Act
            const res = await request(server).post(`/notification?subscriptionId=${unknownSubId}`).set('X-Hook-Secret', 'handshake_secret').send(postData);

            // Assert
            expect(res.status).toEqual(200);
            expect(res.get('x-hook-secret')).toEqual('handshake_secret');
        });

        test('change from user self does - no notification', async () => {
            // Arrange
            const postData = {
                events: [
                    {
                        user: {
                            gid: asanaUserId
                        }
                    }
                ]
            }

            // Act
            const res = await request(server).post(`/notification?subscriptionId=${subId}`).set('X-Hook-Secret', 'handshake_secret').send(postData);

            // Assert
            expect(res.status).toEqual(200);
            expect(res.get('x-hook-secret')).toEqual('handshake_secret');
        });

        test('change from user self does - no notification', async () => {
            // Arrange
            const postData = {
                events: [
                    {
                        user: {
                            gid: asanaUserId
                        }
                    }
                ]
            }

            // Act
            const res = await request(server).post(`/notification?subscriptionId=${subId}`).set('X-Hook-Secret', 'handshake_secret').send(postData);

            // Assert
            expect(res.status).toEqual(200);
            expect(res.get('x-hook-secret')).toEqual('handshake_secret');
        });

        test('change from user self does - no notification', async () => {
            // Arrange
            const postData = {
                events: [
                    {
                        user: {
                            gid: asanaUserId
                        }
                    }
                ]
            }

            // Act
            const res = await request(server).post(`/notification?subscriptionId=${subId}`).set('X-Hook-Secret', 'handshake_secret').send(postData);

            // Assert
            expect(res.status).toEqual(200);
            expect(res.get('x-hook-secret')).toEqual('handshake_secret');
        });

        test('change from user self does - no notification', async () => {
            // Arrange
            const postData = {
                events: [
                    {
                        user: {
                            gid: asanaUserId
                        }
                    }
                ]
            }

            // Act
            const res = await request(server).post(`/notification?subscriptionId=${subId}`).set('X-Hook-Secret', 'handshake_secret').send(postData);

            // Assert
            expect(res.status).toEqual(200);
            expect(res.get('x-hook-secret')).toEqual('handshake_secret');
        });

        test('change from user self does - no notification', async () => {
            // Arrange
            const postData = {
                events: [
                    {
                        user: {
                            gid: asanaUserId
                        }
                    }
                ]
            }

            // Act
            const res = await request(server).post(`/notification?subscriptionId=${subId}`).set('X-Hook-Secret', 'handshake_secret').send(postData);

            // Assert
            expect(res.status).toEqual(200);
            expect(res.get('x-hook-secret')).toEqual('handshake_secret');
        });

        test('change from user self does - no notification', async () => {
            // Arrange
            const postData = {
                events: [
                    {
                        user: {
                            gid: asanaUserId
                        }
                    }
                ]
            }

            // Act
            const res = await request(server).post(`/notification?subscriptionId=${subId}`).set('X-Hook-Secret', 'handshake_secret').send(postData);

            // Assert
            expect(res.status).toEqual(200);
            expect(res.get('x-hook-secret')).toEqual('handshake_secret');
        });

        test('new task - new task notification', async () => {
            // Arrange
            let requestBody = null;
            const postData = {
                events: [
                    {
                        parent: {
                            gid: asanaUserTaskListGid
                        },
                        resource: {
                            gid: taskId,
                            resource_type: 'task'
                        },
                        action: 'added',
                        user: {
                            gid: anotherAsanaUserId
                        }
                    }
                ]
            }
            const asanaGetUserScope = nock('https://app.asana.com')
                .get(`/api/1.0/users/${anotherAsanaUserId}`)
                .once()
                .reply(200, {
                    data: {
                        gid: anotherAsanaUserId,
                        name: asanaUserName,
                        email: asanaUserEmail
                    }
                });
            const asanaGetTaskScope = nock('https://app.asana.com')
                .get(`/api/1.0/tasks/${taskId}`)
                .once()
                .reply(200, {
                    data: {
                        name: taskName,
                        notes: taskNote,
                        projects: [{
                            name: taskProjectName
                        }],
                        due_on: taskDueOn,
                        permalink_url: taskPermaLink
                    }
                });
            cardScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });


            // Act
            const res = await request(server).post(`/notification?subscriptionId=${subId}`).set('X-Hook-Secret', 'handshake_secret').send(postData);

            // Assert
            expect(res.status).toEqual(200);
            expect(res.get('x-hook-secret')).toEqual('handshake_secret');
            expect(requestBody.body[0].text).toBe('New Task');

            // Clean up
            asanaGetUserScope.done();
            asanaGetTaskScope.done();
        });

        test('new comment - new comment notification', async () => {
            // Arrange
            let requestBody = null;
            const postData = {
                events: [
                    {
                        parent: {
                            gid: taskId
                        },
                        resource: {
                            gid: commentId,
                            resource_type: 'story',
                            resource_subtype: 'comment_added'
                        },
                        action: 'added',
                        user: {
                            gid: anotherAsanaUserId
                        }
                    }
                ]
            }
            const asanaGetUserScope = nock('https://app.asana.com')
                .get(`/api/1.0/users/${anotherAsanaUserId}`)
                .once()
                .reply(200, {
                    data: {
                        gid: anotherAsanaUserId,
                        name: asanaUserName,
                        email: asanaUserEmail
                    }
                });
            const asanaGetTaskScope = nock('https://app.asana.com')
                .get(`/api/1.0/tasks/${taskId}`)
                .once()
                .reply(200, {
                    data: {
                        name: taskName,
                        notes: taskNote,
                        projects: [{
                            name: taskProjectName
                        }],
                        due_on: taskDueOn,
                        permalink_url: taskPermaLink
                    }
                });
                const asanaGetCommentScope = nock('https://app.asana.com')
                    .get(`/api/1.0/stories/${commentId}`)
                    .reply(200, {
                        data: {
                            text: ''
                        }
                    });
            cardScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });


            // Act
            const res = await request(server).post(`/notification?subscriptionId=${subId}`).set('X-Hook-Secret', 'handshake_secret').send(postData);

            // Assert
            expect(res.status).toEqual(200);
            expect(res.get('x-hook-secret')).toEqual('handshake_secret');
            expect(requestBody.body[0].text).toBe('New Comment');

            // Clean up
            asanaGetUserScope.done();
            asanaGetTaskScope.done();
            asanaGetCommentScope.done();
        });
    });

});