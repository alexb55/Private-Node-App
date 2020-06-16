require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const rp = require('request-promise');

var moment = require('moment');

const shopifyClient = require(path.resolve('.', './middleware/shopify'));
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
const viewId = 'XXXXXXXX';

let getReports = async function(reports) {
  await jwt.authorize();
  let request = {
    headers: { 'Content-Type': 'application/json' },
    auth: jwt,
    resource: reports,
  };
  return await reporting.reports.batchGet(request);
};

let getRequestBasic = user_id => {
  return {
    reportRequests: [
      {
        viewId,
        dateRanges: [{ startDate: '200daysAgo', endDate: 'today' }],
        metrics: [{ expression: 'ga:sessions' }],
        dimensions: [
          //{ name: 'ga:dimension1' },
          { name: 'ga:sourceMedium' },
          { name: 'ga:campaign' },
          { name: 'ga:adGroup' },
          { name: 'ga:keyword' },
          { name: 'ga:adContent' },
          { name: 'ga:nthMinute' },
        ],
        dimensionFilterClauses: [
          {
            filters: [
              {
                dimensionName: 'ga:dimension1',
                operator: 'EXACT',
                expressions: [user_id],
              },
            ],
          },
        ],
        orderBys: [{ fieldName: 'ga:nthMinute', sortOrder: 'ASCENDING' }],
      },
    ],
  };
};

let getRequestCPC = (user_id, cpcFilters) => {
  let filters = cpcFilters.map(cpcItem => {
    return {
      dimensionName: `ga:${cpcItem.key}`,
      operator: 'EXACT',
      expressions: [cpcItem.value],
    };
  });
  return {
    reportRequests: [
      {
        viewId,
        dateRanges: [{ startDate: '1daysAgo', endDate: 'today' }],
        metrics: [{ expression: 'ga:sessions' }, { expression: 'ga:CPC' }],
        dimensions: [
          { name: 'ga:campaign' },
          { name: 'ga:adGroup' },
          { name: 'ga:keyword' },
          { name: 'ga:adContent' },
        ],
        dimensionFilterClauses: [
          {
            filters,
          },
        ],
      },
    ],
  };
};

const Job = () => {
  let offset = new moment();
  offset = offset.subtract(2, 'days').unix();

  console.log('GA sync started', moment().format());

  const knex = require(path.resolve('.', './middleware/knex'));

  knex('journey')
    .whereRaw('utma_user_id <> ""')
    .andWhere('created_at', '>', offset)
    //.limit(30)
    .orderBy('id')
    .then(rows => {
      return rows.reduce((promise, row) => {
        return promise.then(() => {
          let source = [];
          let sourceDetails = [];
          let cpcFilters = [];
          let cpcFilterNames = [
            '',
            'campaign',
            'adGroup',
            'keyword',
            'adContent',
          ];
          return (
            getReports(getRequestBasic(row.utma_user_id))
              .then(gaResponse => {
                if (gaResponse.data.reports.length) {
                  let data = gaResponse.data.reports[0].data.rows;
                  if (data) {
                    data.map(item => {
                      let cols = item.dimensions;
                      if (source.indexOf(cols[0]) == -1) {
                        source.push(cols[0]);
                      }
                      let sdLine = `${cols[1]} / ${cols[2]} / ${cols[3]} / ${
                        cols[4]
                      }`;
                      if (sourceDetails.indexOf(sdLine) == -1) {
                        sourceDetails.push(sdLine);
                      }
                      if (!cpcFilters.length) {
                        cols.map((item, i) => {
                          if (i > 0 && i < 5 && item.indexOf('(no') == -1) {
                            cpcFilters.push({
                              key: cpcFilterNames[i],
                              value: item,
                            });
                          }
                        });
                      }
                    });
                  }
                }
                return Promise.resolve();
              })
              .then(() => {
                console.log(`update customer ${row.email}`);
                return journey.updateCustomer({
                  email: row.email,
                  source: source.join(';'),
                  source_details: sourceDetails.join(';'),
                });
              })
          );
        });
      }, Promise.resolve());
    })
    /*
    .then(response => {
      console.log(JSON.stringify(response.data.reports[0].data));
    })
    */
    .catch(e => console.log(e));
};

module.exports = Job;
