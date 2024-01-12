const { Subscription } = require('../models/subscriptionModel');
const { generate } = require('shortid');
const asana = require('asana');
const { AsanaUser } = require('../models/asanaUserModel');

async function subscribe(asanaUser, workspace, groupId) {
    const subscriptionId = generate();
    const notificationCallbackUrl = `${process.env.RINGCENTRAL_CHATBOT_SERVER}/notification?subscriptionId=${subscriptionId}`;

    // Step.1: [INSERT]Create a new webhook subscription on 3rd party platform with their API. For most cases, you would want to define what resources/events you want to subscribe to as well.
    const asanaClient = asana.Client.create().useAccessToken(asanaUser.accessToken);
    // get target resource id for my user task list
    const taskList = await asanaClient.userTaskLists.findByUser("me", { workspace: workspace.gid });
    await AsanaUser.update(
        {
            userTaskListGid: taskList.gid
        },
        {
            where: 
            {
                id: asanaUser.id
            }
        }
    )

    // Step.2: Get data from webhook creation response.
    // Here is a workaround to create a DB record before webhook is created on Asana,
    // because Asana need send a handshake message before creating the webhook
    const subscription = await Subscription.create({
        id: subscriptionId,
        asanaUserId: asanaUser.id,
        groupId
    });

    const webhookResponse = await asanaClient.webhooks.create(
        workspace.gid,
        notificationCallbackUrl,
        {
            filters:
                [
                    {
                        resource_type: "project",
                        action: "added",
                    },
                    // Checked 2022.6.23, there's no notification for removing project event 
                    {
                        resource_type: "project",
                        action: "removed",
                    }
                ]
        });

    // Step.3: Create new workspace subscription in DB
    subscription.asanaWebhookId = webhookResponse.gid
    await subscription.save();

    // Step.4: Create project subscriptions under workspace
    const projectsResponse = await asanaClient.projects.findByWorkspace(workspace.gid);
    for (const project of projectsResponse.data) {
        if (project.resource_type !== 'project') {
            continue;
        }
        await subscribeToProject(asanaUser, project.gid, groupId);
    }
}

async function subscribeToProject(asanaUser, projectGid, groupId) {
    const subscriptionId = generate();
    const notificationCallbackUrl = `${process.env.RINGCENTRAL_CHATBOT_SERVER}/notification?subscriptionId=${subscriptionId}`;

    const asanaClient = asana.Client.create().useAccessToken(asanaUser.accessToken);
    const webhookResponse = await asanaClient.webhooks.create(
        projectGid,
        notificationCallbackUrl,
        {
            filters:
                [
                    {
                        resource_type: 'story',
                        resource_subtype: 'comment_added'
                    },
                    {
                        resource_type: 'task',
                        action: 'added'
                    }
                    // ,{
                    //     resource_type: 'task',
                    //     action: 'changed',
                    //     fields: ['due_on']
                    // }
                ]
        });
    const subscription = await Subscription.create({
        id: subscriptionId,
        asanaWebhookId: webhookResponse.gid,
        asanaUserId: asanaUser.id,
        groupId
    });
    return subscription;
}

async function unsubscribeAll(asanaUser) {
    try {
        const asanaClient = asana.Client.create().useAccessToken(asanaUser.accessToken);
        const userSubscriptions = await Subscription.findAll({
            where: {
                asanaUserId: asanaUser.id
            }
        });
        for (const subscription of userSubscriptions) {
            console.log('unsubscribing ', subscription.asanaWebhookId)
            await asanaClient.webhooks.deleteById(subscription.asanaWebhookId);
            await Subscription.destroy(
                {
                    where: {
                        id: subscription.id
                    }
                });
        }
    }
    catch (e) {
        console.error(e);
    }
}

exports.subscribe = subscribe;
exports.unsubscribeAll = unsubscribeAll;