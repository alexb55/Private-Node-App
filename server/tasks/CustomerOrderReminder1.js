require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
//const rp = require('request-promise');
//const crypto = require('crypto');

const moment = require('moment');

const { cmApiClient, cmConfig } = require(path.resolve('.', './middleware/cm'));
const cmListIds = cmConfig.cmListIds;
const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));

//run each day
const Job = () => {
  let offset = new moment();
  offset = offset.subtract(180, 'days');
  let calculatedOffset = offset.format();
  let offset2 = moment(offset).add(1, 'days');

  shopifyClient.order
    .list({
      created_at_min: calculatedOffset,
      status: 'any',
      fulfillment_status: 'unfulfilled',
      limit: 250,
    })
    .then(orders => {
      console.log('order count: ' + orders.length);

      return orders.reduce((promise, order) => {
        return promise
          .then(() => {
            if (order.tags.indexOf('ESD:') > -1) {
              let esdRaw = order.tags
                  .split(',')
                  .filter(tag => tag.indexOf('ESD:') > -1)[0]
                  .split(' '),
                esd = moment()
                  .month(esdRaw[3])
                  .date(esdRaw[4]);

              if (esd.isBefore(moment(order.created_at))) {
                esd = esd.add(1, 'year');
              }
              let shipDateOffset = esd.diff(moment(order.created_at), 'days');
              let nowDateOffset = moment().diff(
                moment(order.created_at),
                'days'
              );

              if (
                shipDateOffset >= 20 &&
                (shipDateOffset - nowDateOffset * 2 == 0 ||
                  shipDateOffset - nowDateOffset * 2 == -1)
              ) {
                console.log(
                  `${order.name} : ${moment(
                    order.created_at
                  ).format()} : ${esd.format()} : ${shipDateOffset} : ${
                    nowDateOffset
                  }`
                );
                return cmApiClient.transactional.sendSmartEmail({
                  smartEmailID: 'XXXXXXXXXXXXXXXXX',
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
