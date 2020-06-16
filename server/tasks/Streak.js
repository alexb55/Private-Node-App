require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const rp = require('request-promise');

var moment = require('moment');

const shopifyClient = require(path.resolve('.', './middleware/shopify'));

const cmConfig = require(path.resolve('.', './config/cm.json'));
var createsend = require('createsend-node');
var cmApiClient = new createsend(cmConfig);
const cmListIds = cmConfig.cmListIds;

const journey = require(path.resolve('.', './server/utils/journey'));

var streakapi = require('streakapi');
var streak = new streakapi.Streak('XXXXXXXXXXXXXXXXXXXXXXXx');

let schemaStreak = () => {
  const knex = require(path.resolve('.', './middleware/knex'));
  knex.schema.dropTableIfExists('streak').then(() => {
    return knex.schema.createTable('streak', table => {
      table.increments();
      table.string('email');
      table.string('lead_origin');
      table.string('ordered_samples');
    });
  });
};

const Job = () => {
  console.log('Streak sync started', moment().format());

  const knex = require(path.resolve('.', './middleware/knex'));

  let stemPipeline =
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

  let LEAD_ORIGIN = 'XXXX',
    ORDERED_SAMPLES = 'XXXX',
    customFields = [],
    streakEmails = [],
    addedEmails = [],
    deletedEmails = [];

  //streak.Pipelines.getOne(stemPipeline)
  streak.Pipelines.getBoxes(stemPipeline)
    .then(response => {
      response.map(box => {
        box.emailAddresses.map(email => {
          if (streakEmails.indexOf(email) == -1) {
            streakEmails.push(email);
          }
        });
      });
      if (!streakEmails.length) {
        return Promise.reject('Unable to load emails from Streak!');
      }
      return knex('streak');
    })
    .then(rows => {
      let systemEmails = rows.map(row => row.email);
      console.log(
        `Emails in Streak = ${streakEmails.length}`,
        `Emails in System = ${systemEmails.length}`
      );
      addedEmails = streakEmails.filter(
        item => systemEmails.indexOf(item) == -1
      );
      deletedEmails = systemEmails.filter(
        item => streakEmails.indexOf(item) == -1
      );
      console.log(
        `Added = ${addedEmails.length}`,
        `Deleted = ${deletedEmails.length}`
      );
      return Promise.resolve();
    })
    .then(r => {
      console.log('Sync added emails...');
      return addedEmails.reduce((promise, addedEmail) => {
        let subscriberInfo = {
          EmailAddress: addedEmail,
          CustomFields: [{ Key: 'InStreak', Value: '1' }],
          Resubscribe: true,
          RestartSubscriptionBasedAutoresponders: true,
        };
        return promise.then(() => {
          return cmApiClient.subscribers
            .addSubscriber(cmListIds['workflows'], subscriberInfo)
            .catch(err => {
              console.log(`Error sync added email: ${addedEmail}: ${err}`);
            });
        });
      }, Promise.resolve());
    })
    .then(r => {
      console.log('Done');
      console.log('Sync deleted emails...');
      return deletedEmails.reduce((promise, deletedEmail) => {
        let subscriberInfo = {
          EmailAddress: deletedEmail,
          CustomFields: [{ Key: 'InStreak', Value: '0' }],
          Resubscribe: true,
          RestartSubscriptionBasedAutoresponders: true,
        };
        return promise.then(() => {
          return cmApiClient.subscribers
            .addSubscriber(cmListIds['workflows'], subscriberInfo)
            .catch(err => {
              console.log(`Error sync deleted email: ${deletedEmail}: ${err}`);
            });
        });
      }, Promise.resolve());
    })
    .then(r => {
      console.log('Done');
      console.log('Save emails in system...');
      return knex('streak').del();
    })
    .then(r => {
      return streakEmails.reduce((promise, streakEmail) => {
        return promise.then(() => {
          return knex('streak').insert({ email: streakEmail });
        });
      }, Promise.resolve());
    })
    .then(r => {
      console.log('Streak Done.');
      return Promise.resolve();
    })
    .catch(e => console.log(e)); //.then(() => knex.destroy());
};

module.exports = Job;
