const { default: Bot } = require('ringcentral-chatbot-core/dist/models/Bot');
const { AsanaUser } = require('../src/models/asanaUserModel');
const { Subscription } = require('../src/models/subscriptionModel');
jest.setTimeout(30000);

beforeAll(async () => {
  await Bot.sync();
  await AsanaUser.sync();
  await Subscription.sync();
});
