const { default: Bot } = require('ringcentral-chatbot-core/dist/models/Bot');
const { AsanaUser } = require('../src/models/asanaUserModel');
const { Subscription } = require('../src/models/subscriptionModel');
const authorizationHandler = require('../src/handlers/authorizationHandler');
const request = require('supertest');
const { server } = require('../src/server.js');
const rcAPI = require('../src/lib/rcAPI');
const nock = require('nock');
const { generate } = require('shortid');

const groupId = 'groupId';
const botId = 'botId';
const asanaUserId = 'asanaUserId';
const asanaUserEmail = 'asanaUserEmail';
const asanaUserName = 'asanaUserName';
const asanaAccessToken = 'asanaAccessToken';
const asanaWebhookId = 'asanaWebhookId';
const asanaUserTaskListGid = 'asanaUserTaskListGid';
const rcUserId = 'rcUserId';
const subId = 'subId';
const cardId = 'cardId';
const workspaceId = 'workspaceId';
const newWorkspaceId = 'newWorkspaceId';
const workspaceName = 'workspaceName';
const newWorkspaceName = 'newWorkspaceName';
const timezoneOffset = 'timezoneOffset';
const newTimezoneOffset = 'newTimezoneOffset';
const taskDueReminderInterval = 'taskDueReminderInterval';
const newTaskDueReminderInterval = 'newTaskDueReminderInterval';

const unknownBotId = 'unknownBotId';
const unknownRcUserId = 'unknownRcUserId';

const postScope = nock(process.env.RINGCENTRAL_SERVER)
    .persist()
    .post(`/restapi/v1.0/glip/groups/${groupId}/posts`)
    .reply(200, 'OK');
const updateCardScope = nock(process.env.RINGCENTRAL_SERVER)
    .persist()
    .put(`/restapi/v1.0/glip/adaptive-cards/${cardId}`)
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
        name: asanaUserName,
        accessToken: asanaAccessToken,
        userTaskListGid: asanaUserTaskListGid,
        workspaceId,
        workspaceName,
        timezoneOffset,
        taskDueReminderInterval,
    });
    await Subscription.create({
        id: subId,
        asanaUserId,
        groupId,
        asanaWebhookId
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
})

describe('interactiveMessageHandler', () => {
    describe('validations', () => {
        test('no body.data - 400 error', async () => {
            // Arrange
            const postData = {
                data: null,
                uuid: generate()
            }

            // Act
            const res = await request(server).post('/interactive-messages').send(postData);

            // Assert
            expect(res.status).toEqual(400);
            expect(res.text).toEqual('Params error');
        });

        test('no body.user - 400 error', async () => {
            // Arrange
            const postData = {
                data: {},
                user: null,
                uuid: generate()
            }

            // Act
            const res = await request(server).post('/interactive-messages').send(postData);

            // Assert
            expect(res.status).toEqual(400);
            expect(res.text).toEqual('Params error');
        });

        test('no body.data - 400 error', async () => {
            // Arrange
            const postData = {
                data: {
                    botId: null
                },
                user: {},
                uuid: generate()
            }

            // Act
            const res = await request(server).post('/interactive-messages').send(postData)

            // Assert
            expect(res.status).toEqual(400);
            expect(res.text).toEqual('Params error');
        });

        test('unknown bot id - 400 error', async () => {
            // Arrange
            const postData = {
                data: {
                    botId: unknownBotId
                },
                user: {},
                uuid: generate()
            }

            // Act
            const res = await request(server).post('/interactive-messages').send(postData)

            // Assert
            expect(res.status).toEqual(400);
            expect(res.text).toEqual('Bot not found');
        });

        test('no Asana Account - return error message', async () => {
            // Arrange
            let requestBody = null;
            const postData = {
                data: {
                    botId
                },
                user: {
                    extId: unknownRcUserId
                },
                conversation: {
                    id: groupId
                },
                card: {
                    id: cardId
                },
                uuid: generate()
            }
            postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                requestBody = JSON.parse(reqBody);
            });

            // Act
            const res = await request(server).post('/interactive-messages').send(postData)

            // Assert
            expect(res.status).toEqual(200);
            expect(requestBody.text).toBe("Asana account not found. Please use command \`login\` to login.");
        });
    });

    describe('submissions', () => {
        describe('Logout', () => {
            test('logout - return unAuth card', async () => {
                // Arrange
                let requestBody = null;
                authorizationHandler.unauthorize = jest.fn().mockReturnValue({})
                const postData = {
                    data: {
                        botId,
                        actionType: 'logout'
                    },
                    user: {
                        extId: rcUserId
                    },
                    conversation: {
                        id: groupId
                    },
                    card: {
                        id: cardId
                    },
                    uuid: generate()
                }
                postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                    requestBody = JSON.parse(reqBody);
                });

                // Act
                const res = await request(server).post('/interactive-messages').send(postData)

                // Assert
                expect(res.status).toEqual(200);
                expect(requestBody.text).toBe('successfully logged out.');
                const loggedOutAsanaUser = await AsanaUser.findByPk(asanaUserId);
                expect(loggedOutAsanaUser).toBe(null);

                // Clean up
                await AsanaUser.create({
                    id: asanaUserId,
                    rcUserId,
                    email: asanaUserEmail,
                    name: asanaUserName,
                    accessToken: asanaAccessToken,
                    userTaskListGid: asanaUserTaskListGid,
                    workspaceId,
                    workspaceName,
                    timezoneOffset,
                    taskDueReminderInterval
                });
            });
        });

        describe('Edit Config Dialog', () => {
            test('return the card in dialog', async () => {
                // Arrange
                const postData = {
                    data: {
                        botId,
                        actionType: 'configEdit'
                    },
                    user: {
                        extId: rcUserId
                    },
                    conversation: {
                        id: groupId
                    },
                    card: {
                        id: cardId
                    },
                    uuid: generate()
                }
                const asanaWorkspaceScope = nock('https://app.asana.com')
                    .get(`/api/1.0/workspaces?limit=50`)
                    .once()
                    .reply(200, {
                        data: []
                    });

                // Act
                const res = await request(server).post('/interactive-messages').send(postData)

                // Assert
                expect(res.status).toEqual(200);

                expect(JSON.parse(res.text).type).toBe('dialog');
                expect(JSON.parse(res.text).dialog.card.type).toBe('AdaptiveCard');

                // Clean up
                asanaWorkspaceScope.done();
            });
        });

        describe('Submit Config', () => {
            test('same workspace - update other data', async () => {
                // Arrange
                let requestBody = null;
                const postData = {
                    data: {
                        botId,
                        actionType: 'submitConfig',
                        timezoneOffset: newTimezoneOffset,
                        taskDueReminderInterval: newTaskDueReminderInterval,
                        workspace: workspaceId
                    },
                    user: {
                        extId: rcUserId
                    },
                    conversation: {
                        id: groupId
                    },
                    card: {
                        id: cardId
                    },
                    uuid: generate()
                }
                updateCardScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                    requestBody = JSON.parse(reqBody);
                });

                // Act
                const res = await request(server).post('/interactive-messages').send(postData)
                // Assert
                const updatedAsanaUser = await AsanaUser.findByPk(asanaUserId);
                expect(res.status).toEqual(200);
                expect(updatedAsanaUser.timezoneOffset).toBe(newTimezoneOffset);
                expect(updatedAsanaUser.taskDueReminderInterval).toBe(newTaskDueReminderInterval);
                expect(requestBody.type).toBe('AdaptiveCard');
                expect(requestBody.body[0].text).toBe('Config');

                // Clean up
                await updatedAsanaUser.update({
                    timezoneOffset,
                    taskDueReminderInterval
                })
            });

            test('different workspace - remove old subscription and create a new subscription', async () => {
                // Arrange
                let requestBody = null;
                const postData = {
                    data: {
                        botId,
                        actionType: 'submitConfig',
                        timezoneOffset: newTimezoneOffset,
                        taskDueReminderInterval: newTaskDueReminderInterval,
                        workspace: newWorkspaceId
                    },
                    user: {
                        extId: rcUserId
                    },
                    conversation: {
                        id: groupId
                    },
                    card: {
                        id: cardId
                    },
                    uuid: generate()
                }
                updateCardScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                    requestBody = JSON.parse(reqBody);
                });
                const asanaDeleteWebhookScope = nock('https://app.asana.com')
                    .delete(`/api/1.0/webhooks/${asanaWebhookId}`)
                    .once()
                    .reply(200, {
                        data: null
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
                const asanaProjectScope = nock('https://app.asana.com')
                    .get(`/api/1.0/workspaces/${newWorkspaceId}/projects?limit=50`)
                    .once()
                    .reply(200, {
                        data: []
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

                // Act
                const res = await request(server).post('/interactive-messages').send(postData)

                // Assert
                const updatedAsanaUser = await AsanaUser.findByPk(asanaUserId);
                expect(res.status).toEqual(200);
                expect(updatedAsanaUser.timezoneOffset).toBe(newTimezoneOffset);
                expect(updatedAsanaUser.taskDueReminderInterval).toBe(newTaskDueReminderInterval);
                expect(requestBody.type).toBe('AdaptiveCard');
                expect(requestBody.body[0].text).toBe('Config');

                // Clean up
                asanaWorkspaceScope.done();
                asanaDeleteWebhookScope.done();
                asanaProjectScope.done();
                asanaCreateWebhookScope.done();
                asanaUseTaskListScope.done();
            });
        });

        describe('Reply Comment', () => {
            const replyMessage = 'reply';
            const taskId = 'taskId';
            const commenterId = 'commenterId';
            const followerGid = 'followerGid';
            const collaboratorTaskListId = 'collaboratorTaskListId';
            test('simple reply, no mention', async () => {
                // Arrange
                let requestBody = null;
                let commentRequestBody = null;
                const postData = {
                    data: {
                        botId,
                        actionType: 'replyComment',
                        reply: replyMessage,
                        taskId,
                        mentionCollaborators: 'false',
                        mentionCommenter: 'false'
                    },
                    user: {
                        extId: rcUserId
                    },
                    conversation: {
                        id: groupId
                    },
                    card: {
                        id: cardId
                    },
                    uuid: generate()
                }
                const asanaCreateCommentScope = nock('https://app.asana.com')
                    .post(`/api/1.0/tasks/${taskId}/stories`)
                    .reply(200, {
                        data: null
                    });
                asanaCreateCommentScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                    commentRequestBody = JSON.parse(reqBody);
                });
                postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                    requestBody = JSON.parse(reqBody);
                });
                // Act
                const res = await request(server).post('/interactive-messages').send(postData)

                // Assert
                expect(res.status).toEqual(200);
                expect(commentRequestBody.data.text).toBe(replyMessage);
                expect(requestBody.text).toBe("Comment replied.");

                // Clean up
                asanaCreateCommentScope.done();
            });
            test('simple reply, mention collaborators', async () => {
                // Arrange
                let requestBody = null;
                let commentRequestBody = null;
                const postData = {
                    data: {
                        botId,
                        actionType: 'replyComment',
                        reply: replyMessage,
                        taskId,
                        mentionCollaborators: 'true',
                        mentionCommenter: 'false'
                    },
                    user: {
                        extId: rcUserId
                    },
                    conversation: {
                        id: groupId
                    },
                    card: {
                        id: cardId
                    },
                    uuid: generate()
                }
                postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                    requestBody = JSON.parse(reqBody);
                });
                const asanaCreateCommentScope = nock('https://app.asana.com')
                    .post(`/api/1.0/tasks/${taskId}/stories`)
                    .reply(200, {
                        data: null
                    });
                asanaCreateCommentScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                    commentRequestBody = JSON.parse(reqBody);
                })

                const asanaGetTaskScope = nock('https://app.asana.com')
                    .get(`/api/1.0/tasks/${taskId}`)
                    .once()
                    .reply(200, {
                        data: {
                            followers: [{
                                gid: followerGid
                            }]
                        }
                    });
                const asanaWorkspaceMembershipScope = nock('https://app.asana.com')
                    .get(`/api/1.0/workspace_memberships/membershipId`)
                    .once()
                    .reply(200, {
                        data: {
                            user_task_list: {
                                gid: collaboratorTaskListId
                            }
                        }
                    });
                const asanaWorkspaceMembershipsByUserIdScope = nock('https://app.asana.com')
                    .get(`/api/1.0/users/${followerGid}/workspace_memberships?limit=50`)
                    .once()
                    .reply(200, {
                        data: [
                            {
                                gid: 'membershipId'
                            }
                        ]
                    });

                // Act
                const res = await request(server).post('/interactive-messages').send(postData)

                // Assert
                expect(res.status).toEqual(200);
                expect(requestBody.text).toBe("Comment replied.");
                expect(commentRequestBody.data.text).toBe(`https://app.asana.com/0/${collaboratorTaskListId}/list ${replyMessage}`);

                // Clean up
                asanaGetTaskScope.done();
                asanaWorkspaceMembershipScope.done();
                asanaWorkspaceMembershipsByUserIdScope.done();
                asanaCreateCommentScope.done();
            });
            test('simple reply, mention commenter not collaborator', async () => {
                // Arrange
                let requestBody = null;
                let commentRequestBody = null;
                const postData = {
                    data: {
                        botId,
                        actionType: 'replyComment',
                        reply: replyMessage,
                        taskId,
                        mentionCollaborators: 'false',
                        mentionCommenter: 'true',
                        commenterId
                    },
                    user: {
                        extId: rcUserId
                    },
                    conversation: {
                        id: groupId
                    },
                    card: {
                        id: cardId
                    },
                    uuid: generate()
                }
                postScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                    requestBody = JSON.parse(reqBody);
                });
                const asanaCreateCommentScope = nock('https://app.asana.com')
                    .post(`/api/1.0/tasks/${taskId}/stories`)
                    .reply(200, {
                        data: null
                    });
                asanaCreateCommentScope.once('request', ({ headers: requestHeaders }, interceptor, reqBody) => {
                    commentRequestBody = JSON.parse(reqBody);
                })

                const asanaWorkspaceMembershipScope = nock('https://app.asana.com')
                    .get(`/api/1.0/workspace_memberships/membershipId`)
                    .once()
                    .reply(200, {
                        data: {
                            user_task_list: {
                                gid: collaboratorTaskListId
                            }
                        }
                    });
                const asanaWorkspaceMembershipsByUserIdScope = nock('https://app.asana.com')
                    .get(`/api/1.0/users/${commenterId}/workspace_memberships?limit=50`)
                    .once()
                    .reply(200, {
                        data: [
                            {
                                gid: 'membershipId'
                            }
                        ]
                    });

                // Act
                const res = await request(server).post('/interactive-messages').send(postData)

                // Assert
                expect(res.status).toEqual(200);
                expect(requestBody.text).toBe("Comment replied.");
                expect(commentRequestBody.data.text).toBe(`https://app.asana.com/0/${collaboratorTaskListId}/list ${replyMessage}`);

                // Clean up
                asanaWorkspaceMembershipScope.done();
                asanaWorkspaceMembershipsByUserIdScope.done();
                asanaCreateCommentScope.done();
            });
        });
    });

})