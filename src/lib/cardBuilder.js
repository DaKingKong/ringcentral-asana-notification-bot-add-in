const { Template } = require('adaptivecards-templating');

const authCardTemplateJson = require('../adaptiveCardPayloads/authCard.json');
const unAuthCardTemplateJson = require('../adaptiveCardPayloads/unAuthCard.json');
const configCardTemplateJson = require('../adaptiveCardPayloads/configCard.json');
const editConfigCardTemplateJson = require('../adaptiveCardPayloads/editConfigCard.json');
const newTaskAssignedCardTemplateJson = require('../adaptiveCardPayloads/newTaskAssignedCard.json');
const taskDueChangeCardTemplateJson = require('../adaptiveCardPayloads/taskDueChangeCard.json');
const taskDueReminderCardTemplateJson = require('../adaptiveCardPayloads/taskDueReminderCard.json');
const newCommentCardTemplateJson = require('../adaptiveCardPayloads/newCommentCard.json');

function authCard(authLink, additionalInfoText) {
    const template = new Template(authCardTemplateJson);
    const cardData = {
        link: authLink,
        additionalInfoText,
        showAdditionalInfo: additionalInfoText != null
    }
    const card = template.expand({
        $root: cardData
    });
    return card;
}

function unAuthCard(botId, additionalInfoText) {
    const template = new Template(unAuthCardTemplateJson);
    const cardData = {
        botId,
        additionalInfoText,
        showAdditionalInfo: additionalInfoText != null
    }
    const card = template.expand({
        $root: cardData
    });
    return card;
}

function configCard(botId, asanaUser) {
    const template = new Template(configCardTemplateJson);
    const timezoneNumber = Number(asanaUser.timezoneOffset);
    const timezoneText = `${timezoneNumber >= 0 ? '+' : ''}${timezoneNumber.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}:00`
    let taskDueReminderIntervalText = '';
    switch (asanaUser.taskDueReminderInterval) {
        case 'off':
            taskDueReminderIntervalText = 'OFF';
            break;
        case '1':
            taskDueReminderIntervalText = '1 business day ahead';
            break;
        default:
            taskDueReminderIntervalText = `${asanaUser.taskDueReminderInterval} business days ahead`;
            break;
    }
    const cardData = {
        botId,
        workspaceName: asanaUser.workspaceName,
        taskDueReminderInterval: taskDueReminderIntervalText,
        timezoneOffset: timezoneText
    }
    const card = template.expand({
        $root: cardData
    });
    return card;
}

function editConfigCard(botId, workspaces, asanaUser) {
    const template = new Template(editConfigCardTemplateJson);
    const workspaceDataPairs = workspaces.map(w => {
        return {
            title: w.name,
            value: w.gid
        }
    });
    const cardData = {
        botId,
        workspaceDataPairs,
        workspaceId: asanaUser.workspaceId,
        taskDueReminderInterval: asanaUser.taskDueReminderInterval,
        timezoneOffset: asanaUser.timezoneOffset
    }
    const card = template.expand({
        $root: cardData
    });
    return card;
}

function newTaskAssignedCard(taskName, taskDescription, projectNames, taskDueDate, userName, userEmail, taskLink, customFields) {
    const template = new Template(newTaskAssignedCardTemplateJson);
    const cardData = {
        taskName,
        taskDescription: taskDescription ?? 'N/A',
        projectNames: projectNames ?? 'N/A',
        taskDueDate: taskDueDate ?? 'N/A',
        userName,
        userEmail,
        taskLink,
        customFields
    }
    const card = template.expand({
        $root: cardData
    });
    return card;
}

// function taskDueDateChangeCard(taskName, taskDescription, projectNames, taskDueDate, userName, userEmail, taskLink) {
//     const template = new Template(taskDueChangeCardTemplateJson);
//     const cardData = {
//         taskName,
//         taskDescription,
//         projectNames,
//         taskDueDate,
//         userName,
//         userEmail,
//         taskLink
//     }
//     const card = template.expand({
//         $root: cardData
//     });
//     return card;
// }


function taskDueReminderCard(taskDueReminderInterval, tasks) {
    const template = new Template(taskDueReminderCardTemplateJson);
    const cardData = {
        taskDueReminderInterval,
        tasks
    }
    const card = template.expand({
        $root: cardData
    });
    return card;
}

function newCommentCard(botId, taskName, taskLink, comment, userName, userEmail, taskId, commenterId) {
    const template = new Template(newCommentCardTemplateJson);
    const cardData = {
        botId,
        taskName,
        taskLink,
        comment,
        userName,
        userEmail,
        taskId,
        commenterId
    }
    const card = template.expand({
        $root: cardData
    });
    return card;
}


exports.authCard = authCard;
exports.unAuthCard = unAuthCard;
exports.configCard = configCard;
exports.editConfigCard = editConfigCard;
exports.newTaskAssignedCard = newTaskAssignedCard;
// exports.taskDueDateChangeCard = taskDueDateChangeCard;
exports.taskDueReminderCard = taskDueReminderCard;
exports.newCommentCard = newCommentCard;