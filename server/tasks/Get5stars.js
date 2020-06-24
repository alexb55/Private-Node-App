require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const rp = require('request-promise');
const crypto = require('crypto');

const moment = require('moment');

const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));

function sortObject(object) {
  var sortedObj = {},
    keys = Object.keys(object);

  keys.sort(function(key1, key2) {
    (key1 = key1.toLowerCase()), (key2 = key2.toLowerCase());
    if (key1 < key2) return -1;
    if (key1 > key2) return 1;
    return 0;
  });

  for (var index in keys) {
    var key = keys[index];
    if (typeof object[key] == 'object' && !(object[key] instanceof Array)) {
      sortedObj[key] = sortObject(object[key]);
    } else {
      sortedObj[key] = object[key];
    }
  }

  return sortedObj;
}

const GFS = {
  privateKey:
    'XXXXXXXXXXXXXX',
  clientId: 'XXXXXXXXXXX',
  businessId: XXXXX,
  sign: params => {
    let out = GFS.privateKey;
    let sortedParams = sortObject(params);
    Object.keys(sortedParams).map(key => {
      out += `${key}${sortedParams[key]}`;
    });
    return crypto
      .createHash('sha256')
      .update(out)
      .digest('hex');
  },
};

//run each day
const Job = () => {
  let offset = new moment();
  offset = offset.subtract(31, 'days');
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
                //trigger Get5stars
                if (!order.customer) {
                  return Promise.reject('No customer, skipping.');
                }
                let customer = order.customer;
                let params = {
                  businessId: GFS.businessId,
                  clientId: GFS.clientId,
                  customerEmail: customer.email,
                  customerFirstName: customer.first_name,
                  customerLastName: customer.last_name,
                  sendFeedbackRequest: 1,
                };
                params.hash = GFS.sign(params);
                //console.log(params);
                let options = {
                  method: 'POST',
                  uri: 'https://getfivestars.com/api/customer/create',
                  body: params,
                  timeout: 30000,
                  json: true,
                };
                return rp(options);
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
