require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');

const moment = require('moment');

const { cmApiClient, cmConfig } = require(path.resolve('.', './middleware/cm'));
const cmListIds = cmConfig.cmListIds;
const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));

let schemaMattress = () => {
  const knex = require(path.resolve('.', './middleware/knex'));
  knex.schema.dropTableIfExists('mattress_sent').then(() => {
    return knex.schema.createTable('mattress_sent', table => {
      table.increments();
      table.string('email');
    });
  });
};

const Job = () => {
  //disable for now
  return this;

  console.log('Mattress email started');

  const knex = require(path.resolve('.', './middleware/knex'));

  let offset = new moment();
  offset = offset.subtract(15, 'days');
  let calculatedOffset = offset.format();
  let offset2 = moment(offset)
    .add(1, 'days')
    .format();

  shopifyClient.order
    .list({
      created_at_min: calculatedOffset,
      created_at_max: offset2,
      status: 'any',
    })
    .then(orders => {
      console.log('mattress order count: ' + orders.length);
      return orders.reduce((promise, order) => {
        return promise
          .then(() => {
            let orderedMattress = false;
            order.line_items.map(li => {
              if (li.sku && li.sku.toLowerCase().indexOf('mattress') > -1) {
                orderedMattress = true;
              }
            });
            if (!orderedMattress && parseFloat(order.total_price) > 500) {
              return knex('mattress_sent')
                .where('email', '=', order.email)
                .then(rows => {
                  if (rows && rows.length) {
                    return Promise.reject();
                  }
                  return Promise.resolve();
                })
                .then(r => {
                  //trigger CM "Mattress" email
                  console.log('Mattress email for order ' + order.name);
                  return cmApiClient.transactional.sendSmartEmail({
                    smartEmailID: 'XXXXXXXXXXXXXXXXXXXXXXXX',
                    To: order.email,
                  });
                })
                .then(r => {
                  return knex('mattress_sent').insert({ email: order.email });
                })
                .catch(err => Promise.resolve());
            }
            return Promise.resolve();
          })
          .catch(err =>
            console.log(
              'ERROR:',
              err.data ? err.data.Elements[0].ValidationErrors : err
            )
          )
          .then(response => {
            //console.log(response);
          });
      }, Promise.resolve([]));
    })
    .catch(err => {
      console.error(err);
    });
};

module.exports = Job;
