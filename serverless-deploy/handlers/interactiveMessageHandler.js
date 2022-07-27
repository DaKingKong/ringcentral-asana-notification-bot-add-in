const crypto = require('crypto');
const Bot = require('ringcentral-chatbot-core/dist/models/Bot').default;
const { AsanaUser } = require('../models/asanaUserModel')
const authorizationHandler = require('./authorizationHandler');
const subscriptionHandler = require('./subscriptionHandler');
const { checkAndRefreshAccessToken } = require('../lib/oauth');
const asana = require('asana');
const cardBuilder = require('../lib/cardBuilder');
const dialogBuilder = require('../lib/dialogBuilder');
const { Subscription } = require('../models/subscriptionModel');

const receivedUuids = [];

async function interactiveMessages(req, res) {
    try {
        // Shared secret can be found on RingCentral developer portal, under your app Settings
        const SHARED_SECRET = process.env.RINGCENTRAL_SHARED_SECRET;
        if (SHARED_SECRET) {
            const signature = req.get('X-Glip-Signature', 'sha1=');
            const encryptedBody =
                crypto.createHmac('sha1', SHARED_SECRET).update(JSON.stringify(req.body)).digest('hex');
            if (encryptedBody !== signature) {
                res.status(401).send();
                return;
            }
        }
        const body = req.body;
        if (receivedUuids.includes(req.body.uuid)) {
            res.status(200);
            res.json({
                result: 'OK',
            });
            return;
        }
        else {
            receivedUuids.push(req.body.uuid);
        }
        if (process.env.NODE_ENV !== 'test') {
            console.log(`Incoming interactive message: ${JSON.stringify(body, null, 2)}`);
        }
        if (!body.data || !body.user || !body.data.botId) {
            res.status(400);
            res.send('Params error');
            return;
        }
        const { botId } = body.data;
        const bot = await Bot.findByPk(botId);
        if (!bot) {
            console.error(`Bot not found with id: ${botId}`);
            res.status(400);
            res.send('Bot not found');
            return;
        }
        const groupId = body.conversation.id;
        const rcUserId = body.user.extId;
        const cardId = req.body.card.id;

        const asanaUser = await AsanaUser.findOne({
            where: {
                rcUserId
            }
        });

        if (!asanaUser) {
            await bot.sendMessage(groupId, { text: `Asana account not found. Please use command \`login\` to login.` });
            res.status(200);
            res.json('OK')
            return;
        }

        await checkAndRefreshAccessToken(asanaUser);
        const client = asana.Client.create().useAccessToken(asanaUser.accessToken);

        let dialogResponse = {
            type: "dialog",
            dialog: null
        };

        switch (body.data.actionType) {
            case 'logout':
                await authorizationHandler.unauthorize(asanaUser);
                await bot.sendMessage(groupId, { text: 'successfully logged out.' });
                await asanaUser.destroy();
                break;
            case 'configEdit':
                const workspacesResponse = await client.workspaces.findAll();
                const editConfigCard = cardBuilder.editConfigCard(bot.id, workspacesResponse.data, asanaUser);
                const editConfigDialog = dialogBuilder.getCardDialog({
                    title: 'Edit Config',
                    size: null,
                    iconURL: null,
                    card: editConfigCard
                });
                dialogResponse.dialog = editConfigDialog;
                break;
            case 'submitConfig':
                const newTimezoneOffset = body.data.timezoneOffset;
                const newTaskDueReminderInterval = body.data.taskDueReminderInterval;
                const newWorkspaceId = body.data.workspace;
                if (newWorkspaceId == asanaUser.workspaceId) {
                    await asanaUser.update({
                        timezoneOffset: newTimezoneOffset,
                        taskDueReminderInterval: newTaskDueReminderInterval
                    });
                    await bot.updateAdaptiveCard(cardId, cardBuilder.configCard(bot.id, asanaUser));
                }
                else {
                    await subscriptionHandler.unsubscribeAll(asanaUser);
                    const newWorkspacesResponse = await client.workspaces.findAll();
                    const newWorkspace = newWorkspacesResponse.data.find(w => w.gid == newWorkspaceId);
                    await subscriptionHandler.subscribe(asanaUser, newWorkspace, groupId);
                    await asanaUser.update({
                        workspaceName: newWorkspace.name,
                        workspaceId: newWorkspace.gid,
                        taskDueReminderInterval: newTaskDueReminderInterval,
                        timezoneOffset: newTimezoneOffset
                    })
                    await bot.updateAdaptiveCard(cardId, cardBuilder.configCard(bot.id, asanaUser));
                }
                break;
            case 'replyComment':
                let reply = body.data.reply;
                const taskId = body.data.taskId;
                const mentionCollaborators = body.data.mentionCollaborators;
                const mentionCommenter = body.data.mentionCommenter;
                if (mentionCollaborators == 'true') {
                    const task = await client.tasks.findById(taskId);
                    for (const collaborator of task.followers) {
                        const collaboratorTaskListId = await getUserTaskListIdFromUserId(client, collaborator.gid);
                        reply = `https://app.asana.com/0/${collaboratorTaskListId}/list ` + reply;
                    }

                    if (mentionCommenter == 'true' && !task.followers.some(f => f.gid == body.data.commenterId)) {
                        const commenterTaskListId = await getUserTaskListIdFromUserId(client, body.data.commenterId);
                        reply = `https://app.asana.com/0/${commenterTaskListId}/list ` + reply;
                    }
                }
                else if (mentionCommenter == 'true') {
                    const commenterTaskListId = await getUserTaskListIdFromUserId(client, body.data.commenterId);
                    reply = `https://app.asana.com/0/${commenterTaskListId}/list ` + reply;
                }
                await client.stories.createOnTask(taskId, { text: reply });
                await bot.sendMessage(groupId, { text: 'Comment replied.' });
                break;
        }
        res.status(200);
        dialogResponse.dialog ? res.send(dialogResponse) : res.send('OK');
    }
    catch (e) {
        console.error(e);
        res.status(200);
        res.send('OK');
    }

}

async function getUserTaskListIdFromUserId(asanaClient, userId) {
    const workspaceMembership = await asanaClient.workspaceMemberships.getWorkspaceMembershipsForUser(userId);
    const workspaceMembershipFullInfo = await asanaClient.workspaceMemberships.getWorkspaceMembership(workspaceMembership.data[0].gid);
    const userTaskListId = workspaceMembershipFullInfo.user_task_list.gid;
    return userTaskListId;
}

exports.interactiveMessages = interactiveMessages;