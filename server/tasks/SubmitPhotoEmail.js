require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');

const moment = require('moment');

const { cmApiClient, cmConfig } = require(path.resolve('.', './middleware/cm'));
const cmListIds = cmConfig.cmListIds;
const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));

//run each day
const Job = () => {
  let offset = new moment();
  offset = offset.subtract(21, 'days');
  let calculatedOffset = offset.format();
  let offset2 = moment(offset).add(1, 'days');

  shopifyClient.order
    .list({
      updated_at_min: calculatedOffset,
      status: 'any',
      fulfillment_status: 'shipped',
    })
    .then(orders => {
      console.log('order count: ' + orders.length);

      return orders.reduce((promise, order) => {
        return promise
          .then(() => {
            if (order.fulfillments) {
              let fulfillments = order.fulfillments.filter(fulfillment =>
                moment(fulfillment.created_at).isBetween(offset, offset2)
              );
              if (fulfillments.length) {
                //trigger CM "Submit Photo" email
                //todo: change URL in CM
                return cmApiClient.transactional.sendSmartEmail({
                  smartEmailID: 'XXXXXXXXXXXXXXXXXXXXXXXXXXX',
                  To: order.email,
                  Data: {
                    order_code: order.id,
                  },
                });
              }
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
