require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');

const moment = require('moment');

const shopifyClient = require(path.resolve('.', './middleware/shopify'));
const cmApiClient = require(path.resolve('.', './middleware/cm'));

const Job = () => {
  console.log('Loyalty Program started');

  let offset = new moment();
  offset = offset.subtract(3, 'days');
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
      console.log('loyalty order count: ' + orders.length);
      return orders.reduce((promise, order) => {
        return promise
          .then(() => {
            if (parseFloat(order.total_price) > 500) {
              //trigger CM "Loyalty Program" email
              console.log('Loyalty Program email for order ' + order.name);
              return cmApiClient.transactional.sendSmartEmail({
                smartEmailID: 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
                To: order.email,
              });
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
