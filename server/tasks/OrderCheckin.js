require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');

const moment = require('moment');

const { cmApiClient, cmConfig } = require(path.resolve('.', './middleware/cm'));
const cmListIds = cmConfig.cmListIds;
const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));

const Job = () => {
  console.log('Order Checkin started');
  const knex = require(path.resolve('.', './middleware/knex'));

  let offset = new moment();
  offset = offset.subtract(8, 'days');
  let from = offset.format();
  let to = moment(offset)
    .add(1, 'days')
    .format();

  //console.log(from, to);
  knex('order_checkin')
    .where('updated_at', '>=', from)
    .where('updated_at', '<', to)
    .then(rows => {
      console.log('row count: ' + rows.length);
      if (!rows.length) {
        return Promise.resolve();
      }
      return rows.reduce((promise, row) => {
        /*
        if (row.id <= 5) {
          return Promise.resolve();
        }*/
        return promise
          .then(() => {
            console.log('Order Checkin email for order ' + row.order_id);
            return cmApiClient.transactional.sendSmartEmail({
              smartEmailID: 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
              To: row.email,
            });
            return Promise.resolve();
          })
          .catch(err =>
            console.log(
              'ERROR:',
              err.data ? err.data.Elements[0].ValidationErrors : err
            )
          );
      }, Promise.resolve([]));
    })
    .then(r => {
      console.log('Order Checkin Done.');
      return Promise.resolve();
    })
    .catch(e => console.log(e));
};

module.exports = Job;
