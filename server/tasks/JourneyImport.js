require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const rp = require('request-promise');

var moment = require('moment');

const shopifyClient = require(path.resolve('.', './middleware/shopify'));

const knex = require(path.resolve('.', './middleware/knex'));

const Job = () => {
  let subscribers = [];
  let key = 0;

  knex.schema
    .dropTableIfExists('journey')
    .then(() => {
      return knex.schema.createTable('journey', table => {
        table.increments();
        table.timestamp('created_at');
        table.string('email');
        table.string('utma_user_id');
        table.string('source');
        table.string('source_details');
        table.float('cost');
        table.string('email_activity');
        table.float('net_sales');
        table.string('lead_source');
        table.string('gclid');
        table.string('referrer_email');
        table.string('samplekit_email_sent');
        table.string('ip_address');
      });
    })
    .then(() => {
      return rp('XXXXXXXXXXXXXXXXXX');
    })
    .then(response => {
      subscribers = JSON.parse(response);
      console.log('subscribers count: ' + subscribers.length);

      //subscribers = subscribers.slice(0, 200);
      //console.log(subscribers);

      return subscribers.reduce((promise, subscriber) => {
        return promise
          .then(() => {
            key++;
            if (key % 100 == 0) {
              console.log('Import # ' + key);
            }
            //console.log('Importing: ' + subscriber.subscriber_email);
            let data = {
              created_at: moment.utc(subscriber.created_at).unix(),
              email: subscriber.subscriber_email,
              utma_user_id: subscriber.utma_user_id,
              source: subscriber.customer_source,
              source_details: subscriber.customer_source_details,
              cost: subscriber.customer_cost,
              email_activity: subscriber.customer_email_activity,
              net_sales: subscriber.customer_net_sales,
              lead_source: subscriber.customer_lead_source,
              gclid: subscriber.customer_gclid,
              referrer_email: subscriber.referrer_email,
              samplekit_email_sent: subscriber.samplekit_email_sent,
              ip_address: subscriber.customer_ip_address,
            };
            return knex('journey').insert(data);
          })
          .catch(err => console.log(err));
      }, Promise.resolve([]));
    })
    .catch(err => {
      console.log(err);
    })
    .then(() => knex.destroy());
};

module.exports = Job;
