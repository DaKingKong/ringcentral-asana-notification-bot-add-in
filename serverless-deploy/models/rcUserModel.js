const Sequelize = require('sequelize');
const { sequelize } = require('./sequelize');

// Model for Google File data
exports.RcUser = sequelize.define('rc-users', {
  id: {
    type: Sequelize.STRING,
    primaryKey: true,
  },
  rcDMGroupId: {
    type: Sequelize.STRING,
  },
  isReceiveAnnouncement: {
    type: Sequelize.BOOLEAN
  }
});
