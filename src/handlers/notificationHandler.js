const { Subscription } = require('../models/subscriptionModel');
const { AsanaUser } = require('../models/asanaUserModel');
const { checkAndRefreshAccessToken } = require('../lib/oauth');
const cardBuilder = require('../lib/cardBuilder');
const Bot = require('ringcentral-chatbot-core/dist/models/Bot').default;
const asana = require('asana');

const MAX_TASK_DESC_LENGTH = 200;

async function notification(req, res) {
    try {
        const { query, body } = req;
        await sendNotification(query, body);
    }
    catch (e) {
        console.error(e);
    }
    // required by Asana for handshake (https://developers.asana.com/docs/webhooks)
    if (req.headers['x-hook-secret']) {
        res.header('X-Hook-Secret', req.headers['x-hook-secret']);
    }

    res.status(200);
    res.json({
        result: 'OK',
    });
}

async function sendNotification(query, body) {
    // Identify which user or subscription is relevant, normally by 3rd party webhook id or user id. 
    const subscriptionId = query.subscriptionId;
    const subscription = await Subscription.findByPk(subscriptionId);
    console.log(`Receiving notification: ${JSON.stringify(body)}`)

    if (!subscription) {
        return;
    }

    const incomingEvents = body.events;
    if (incomingEvents) {
        const asanaUserId = subscription.asanaUserId;
        const asanaUser = await AsanaUser.findByPk(asanaUserId.toString());
        const bot = await Bot.findByPk(asanaUser.botId);
        // check token refresh condition
        await checkAndRefreshAccessToken(asanaUser);
        const client = asana.Client.create({ "defaultHeaders": { "Asana-Enable": "new_user_task_lists" } }).useAccessToken(asanaUser.accessToken);
        for (const event of incomingEvents) {
            // changes from user self doesn't generate a notification
            if (event.user && event.user.gid == asanaUser.id) {
                continue;
            }
            const byUser = await client.users.findById(event.user.gid);
            // task -> resource.gid == taskId; comment -> parent.gid == taskId
            const task = await client.tasks.findById(event.resource.resource_type == 'task' ? event.resource.gid : event.parent.gid);
            console.log(`Target Task:\n${JSON.stringify(task, null, 2)}`);
            const taskName = task.name;
            const taskDescription = task.notes.length > MAX_TASK_DESC_LENGTH ?
                task.notes.substring(0, MAX_TASK_DESC_LENGTH) + '...' :
                task.notes;
            const projectNames = task.projects.map(p => p.name).toString();
            let customFields = [];
            if (task.custom_fields) {
                for (const customField of task.custom_fields) {
                    customFields.push({
                        title: customField.name,
                        value: customField.display_value ?? 'Null'
                    });
                }
            }
            const taskDueDate = task.due_on;
            const username = byUser.name;
            const userEmail = byUser.email;
            const taskLink = task.permalink_url;
            if (event.resource.resource_type == 'task') {
                // get task info
                // case.1: New Task assigned to me: get user_task_list and only under that parent    
                if (event.parent && event.parent.gid == asanaUser.userTaskListGid) {
                    if (event.action == 'added') {
                        const newTaskAssignedCard = cardBuilder.newTaskAssignedCard(taskName, taskDescription, projectNames, taskDueDate, username, userEmail, taskLink, customFields);
                        await bot.sendAdaptiveCard(subscription.groupId, newTaskAssignedCard);
                    }
                }
                // COMMENTED: unconfirmed use case

                // case.2: My Task due change
                // else if (event.change && event.change.field == 'due_on') {
                //     const taskDueDateChangeCard = cardBuilder.taskDueDateChangeCard(taskName, taskDescription, projectNames, taskDueDate, username, userEmail, taskLink);
                //     await bot.sendAdaptiveCard(subscription.groupId, taskDueDateChangeCard);
                // }
            }
            // case.3: New Comment under My Task (except my own comment)
            else if (event.resource.resource_type == 'story' && event.resource.resource_subtype == 'comment_added') {
                // get comment info   
                const commentStory = await client.stories.findById(event.resource.gid);

                // COMMENTED: trying to replace mention user string back to it, from user task list link

                // let commentWithMentions = commentStory.text;
                // const mentionRegex = new RegExp('https://app.asana.com/0/(.{1,20})/list', 'g');
                // const userTaskListIds = commentStory.text.matchAll(mentionRegex);
                // for (const userTaskListId of userTaskListIds) {
                //     console.log(userTaskListId[1])
                //     const userTaskList = await client.userTaskLists.findById(userTaskListId[1]);
                //     commentWithMentions = commentWithMentions.replace(`https://app.asana.com/0/${userTaskListId[1]}/list`, `@${userTaskList.owner.name}`);
                // }
                const newCommentCard = cardBuilder.newCommentCard(bot.id, taskName, taskLink, commentStory.text, username, userEmail, task.gid, event.user.gid);
                await bot.sendAdaptiveCard(subscription.groupId, newCommentCard);
            }
        }
    }
}

exports.notification = notification;