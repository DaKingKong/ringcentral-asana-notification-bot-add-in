// require('dotenv').config();
const asana = require('asana');
const cardBuilder = require('./lib/cardBuilder');
const Bot = require('ringcentral-chatbot-core/dist/models/Bot').default;
const { AsanaUser } = require('./models/asanaUserModel')
const { Subscription } = require('./models/subscriptionModel');
const { checkAndRefreshAccessToken } = require('./lib/oauth');
const Op = require('sequelize').Op;
const moment = require('moment');

const MAX_TASK_DESC_LENGTH = 200;

async function triggerDueTaskReminder() {
    const date = new Date();
    const utcDate = moment(date).utc();
    const subscriptions = await Subscription.findAll({
        where: {
            taskDueReminderInterval: {
                [Op.ne]: 'off'
            }
        }
    });
    for (const sub of subscriptions) {
        console.log(`checking subscription: ${sub.id}`);
        const userLocalHour = utcDate.get('hour') + Number(sub.timezoneOffset);
        // trigger time is 8am in the morning, for user's timezone
        if (userLocalHour == 8 || userLocalHour == 32) {
            const asanaUser = await AsanaUser.findByPk(sub.asanaUserId);
            await checkAndRefreshAccessToken(asanaUser);
            const asanaClient = asana.Client.create({ "defaultHeaders": { "Asana-Enable": "new_user_task_lists" } }).useAccessToken(asanaUser.accessToken);
            const tasksResponse = await asanaClient.userTaskLists.tasks(asanaUser.userTaskListGid);
            const tasks = [];
            for (const taskData of tasksResponse.data) {
                const task = await asanaClient.tasks.findById(taskData.gid);
                if (task.due_on) {
                    const utcDateToTrigger = reduceBusinessDays(moment.utc(task.due_on), Number(sub.taskDueReminderInterval)).add(userLocalHour - Number(sub.timezoneOffset), 'hours');
                    if (utcDate.diff(utcDateToTrigger, 'hours') == 0) {
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
                                    value: customField.display_value
                                });
                            }
                        }
                        const taskDueDate = task.due_on;
                        const taskLink = task.permalink_url;
                        tasks.push({
                            taskName,
                            taskDescription,
                            projectNames,
                            taskDueDate,
                            customFields,
                            taskLink
                        })
                    }
                }
            }
            const taskDueReminderCard = cardBuilder.taskDueReminderCard(sub.taskDueReminderInterval, tasks);
            const bot = await Bot.findByPk(asanaUser.botId);
            await bot.sendAdaptiveCard(asanaUser.rcDMGroupId, taskDueReminderCard);
        }
    }
}

function reduceBusinessDays(originalDate, numDaysToReduce) {
    const Sunday = 0;
    const Saturday = 6;
    let daysRemaining = numDaysToReduce;

    const newDate = originalDate.clone();

    while (daysRemaining > 0) {
        newDate.add(-1, 'days');
        if (newDate.day() !== Sunday && newDate.day() !== Saturday) {
            daysRemaining--;
        }
    }

    return newDate;
}

// For local manual testing
// triggerDueTaskReminder();

exports.app = triggerDueTaskReminder;