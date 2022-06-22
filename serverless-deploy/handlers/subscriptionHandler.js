const { Subscription } = require('../models/subscriptionModel');
const { generate } = require('shortid');
const asana = require('asana');

async function subscribe(asanaUser, workspace, groupId, taskDueReminderInterval, timezoneOffset) {
    const subscriptionId = generate();
    const notificationCallbackUrl = `${process.env.RINGCENTRAL_CHATBOT_SERVER}/notification?subscriptionId=${subscriptionId}`;

    // Step.1: [INSERT]Create a new webhook subscription on 3rd party platform with their API. For most cases, you would want to define what resources/events you want to subscribe to as well.
    const asanaClient = asana.Client.create().useAccessToken(asanaUser.accessToken);
    // get target resource id for my user task list
    const taskList = await asanaClient.userTaskLists.findByUser("me", { workspace: workspace.gid });
    await asanaUser.update({
        userTaskListGid: taskList.gid
    });

    // Step.2: Get data from webhook creation response.
    // Here is a workaround to create a DB record before webhook is created on Asana, because Asana need send a handshake message before creating the webhook
    const subscription = await Subscription.create({
        id: subscriptionId,
        asanaUserId: asanaUser.id,
        workspaceName: workspace.name,
        workspaceId: workspace.gid,
        groupId,
        taskDueReminderInterval,
        timezoneOffset
    });

    const webhookResponse = await asanaClient.webhooks.create(
        taskList.gid,
        notificationCallbackUrl,
        {
            filters: [
                {
                    resource_type: 'story',
                    resource_subtype: 'comment_added'
                },
                {
                    resource_type: 'task',
                    action: 'added'
                },
                {
                    resource_type: 'task',
                    action: 'changed',
                    fields: ['due_on']
                }
            ]
        });

    // Step.3: Create new subscription in DB
    subscription.asanaWebhookId = webhookResponse.gid
    await subscription.save();

    return subscription;
}

async function unsubscribe(asanaUser, subscription) {
    try {
        const asanaClient = asana.Client.create().useAccessToken(asanaUser.accessToken);
        console.log('unsubscribing ', subscription.asanaWebhookId)
        await asanaClient.webhooks.deleteById(subscription.asanaWebhookId);
        await Subscription.destroy(
            {
                where: {
                    id: subscription.id
                }
            });
    }
    catch (e) {
        console.error(e);
    }
}

exports.subscribe = subscribe;
exports.unsubscribe = unsubscribe;