const Sequelize = require('sequelize');
const { sequelize } = require('./sequelize');

// Model for Google File data
exports.AsanaUser = sequelize.define('asana-users', {
    id: {
        type: Sequelize.STRING,
        primaryKey: true,
    },
    botId: {
        type: Sequelize.STRING,
    },
    rcUserId: {
        type: Sequelize.STRING,
    },
    rcDMGroupId: {
        type: Sequelize.STRING,
    },
    refreshToken: {
        type: Sequelize.STRING,
    },
    accessToken: {
        type: Sequelize.STRING(1000),
    },
    tokenExpiredAt: {
        type: Sequelize.DATE
    },
    userTaskListGid: {
        type: Sequelize.STRING,
    },
    workspaceName: {
      type: Sequelize.STRING
    },
    workspaceId: {
      type: Sequelize.STRING
    },
    taskDueReminderInterval: {
      type: Sequelize.STRING
    },
    timezoneOffset: {
      type: Sequelize.STRING
    }
});
