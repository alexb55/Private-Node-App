require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const rp = require('request-promise');

const crypto = require('crypto');

var moment = require('moment');

const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));

let gatherUpPrivateKey =
    'XXXXXXXXXXXX',
  gatherUpClientId = 'XXXXXXXXXX',
  gatherUpBusinessId = XXXXXX;

let generateHash = params => {
  let hash = gatherUpPrivateKey;
  for (let [key, value] of Object.entries(params)) {
    hash += key + value;
  }
  params.hash = crypto
    .createHash('sha256')
    .update(hash)
    .digest('hex');
  return params;
};

const Job = () => {
  console.log('GatherUp sync started', moment().format());

  const knex = require(path.resolve('.', './middleware/knex'));

  let offset = new moment();
  let offsetFrom = offset.subtract(30, 'days').format();
  let offsetTo = moment(offsetFrom)
    .add(1, 'days')
    .format();

  shopifyClient.order
    .list({
      status: 'closed',
      limit: 250,
      updated_at_min: offsetFrom,
      updated_at_max: offsetTo,
    })
    .then(orders => {
      let filteredOrders = orders.filter(
        order => parseFloat(order.total_price) > 50
      );
      console.log('filtered orders:', filteredOrders.length);
      filteredOrders.map(f => console.log(f.name));
      return filteredOrders.reduce((promise, filteredOrder) => {
        return promise.then(() => {
          return fetch('https://app.gatherup.com/api/customer/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(
              generateHash({
                businessId: gatherUpBusinessId,
                clientId: gatherUpClientId,
                customerEmail: filteredOrder.email,
                customerFirstName: filteredOrder.customer
                  ? filteredOrder.customer.first_name
                  : '',
                customerLastName: filteredOrder.customer
                  ? filteredOrder.customer.last_name
                  : '',
                sendFeedbackRequest: 1,
              })
            ),
          })
            .then(r => r.json())
            .then(data => {
              console.log(
                `GatherUp response for ${filteredOrder.email}:`,
                data
              );
            });
        });
      }, Promise.resolve());
    });
};

module.exports = Job;
