require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const rp = require('request-promise');

var moment = require('moment');

const shopifyClient = require(path.resolve('.', './middleware/shopify'));
const knex = require(path.resolve('.', './middleware/knex'));
const journey = require(path.resolve('.', './server/utils/journey'));

const { google } = require('googleapis');
const service_account = require(path.resolve('.', './config/ga.json'));
const reporting = google.analyticsreporting('v4');
let jwt = new google.auth.JWT(
  service_account.client_email,
  null,
  service_account.private_key,
  ['https://www.googleapis.com/auth/analytics.readonly']
);
const viewId = 'XXXXXXX';

let getReports = async function(reports) {
  await jwt.authorize();
  let request = {
    headers: { 'Content-Type': 'application/json' },
    auth: jwt,
    resource: reports,
  };
  return await reporting.reports.batchGet(request);
};

let getRequestBasic = () => {
  return {
    reportRequests: [
      {
        viewId,
        dateRanges: [{ startDate: '60daysAgo', endDate: 'today' }],
        metrics: [{ expression: 'ga:goal7Completions' }],
        dimensions: [
          { name: 'ga:dimension1' },
          { name: 'ga:minute' },
          { name: 'ga:dateHourMinute' },
        ],
        metricFilterClauses: [
          {
            filters: [
              {
                metricName: 'ga:goal7Completions',
                operator: 'GREATER_THAN',
                comparisonValue: '0',
              },
            ],
          },
        ],
        orderBys: [{ fieldName: 'ga:dateHourMinute', sortOrder: 'ASCENDING' }],
      },
    ],
  };
};

const Job = () => {
  let offset = new moment();
  offset = offset.subtract(100, 'days').unix();

  let journeyRows = [];

  knex('journey')
    .where('lead_source', 'like', `%Newsletter%`)
    .andWhere('created_at', '>', offset)
    .orderBy('id')
    .then(rows => {
      journeyRows = rows;
      return getReports(getRequestBasic());
    })
    .then(response => {
      let gaRows = response.data.reports[0].data.rows;
      return gaRows.reduce((promise, row) => {
        return promise.then(() => {
          let data = row.dimensions;
          //console.log(data);
          let gaTime =
            parseInt(
              moment(data[2].slice(0, 8) + 'T' + data[2].slice(8)).unix()
            ) +
            7 * 60 * 60;
          //console.log(gaTime);
          //console.log('possibleCustomer: ');
          let possibleCustomer = journeyRows.filter(
            r => Math.abs(r.created_at - gaTime) < 100
          );
          if (possibleCustomer.length && !possibleCustomer.utma_user_id) {
            //console.log(possibleCustomer[0]);
            return journey.updateCustomer({
              email: possibleCustomer[0].email,
              utma_user_id: data[0],
            });
          }
          return Promise.resolve();
        });
      }, Promise.resolve());
    })
    .catch(e => console.log(e))
    .then(() => knex.destroy());
};

module.exports = Job;
