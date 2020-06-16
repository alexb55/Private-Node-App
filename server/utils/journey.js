const path = require('path');
var moment = require('moment');

module.exports = {
  updateCustomer: customer => {
    const knex = require(path.resolve('.', './middleware/knex'));
    return knex('journey')
      .where({ email: customer.email })
      .then(rows => {
        if (rows.length) {
          let existingCustomer = rows[0];

          //one time set
          if (customer.utma_user_id && !existingCustomer.utma_user_id) {
            existingCustomer.utma_user_id = customer.utma_user_id;
          }

          if (customer.source) {
            customer.source.split(';').map(item => {
              if (
                !existingCustomer.source ||
                existingCustomer.source.indexOf(item) == -1
              ) {
                if (existingCustomer.source) {
                  existingCustomer.source += `;`;
                } else {
                  existingCustomer.source = '';
                }
                existingCustomer.source += `${item}`;
              }
            });
          }

          //one time set
          if (customer.source_details && !existingCustomer.source_details) {
            existingCustomer.source_details = customer.source_details;
          }

          //one time set
          if (customer.cost && !existingCustomer.cost) {
            existingCustomer.cost = customer.cost;
          }

          if (
            customer.email_activity &&
            existingCustomer.email_activity.indexOf(customer.email_activity) ==
              -1
          ) {
            customer.email_activity.split(',').map(item => {
              if (existingCustomer.email_activity) {
                existingCustomer.email_activity += `,`;
              }
              existingCustomer.email_activity += `${item}`;
            });
          }

          if (customer.order_name) {
            if (existingCustomer.order_name) {
              existingCustomer.order_name += `,`;
            } else {
              existingCustomer.order_name = '';
            }
            existingCustomer.order_name += `${customer.order_name}`;
            existingCustomer.last_order_name = `${customer.order_name}`;
          }

          //every time set
          if (customer.net_sales) {
            existingCustomer.net_sales =
              existingCustomer.net_sales + customer.net_sales;
          }

          if (customer.lead_source) {
            customer.lead_source.split(',').map(item => {
              if (
                !existingCustomer.lead_source ||
                existingCustomer.lead_source.indexOf(item) == -1
              ) {
                if (existingCustomer.lead_source) {
                  existingCustomer.lead_source += `,`;
                } else {
                  existingCustomer.lead_source = '';
                }
                existingCustomer.lead_source += `${item}`;
              }
            });
          }

          //one time set
          if (customer.gclid && !existingCustomer.gclid) {
            existingCustomer.gclid = customer.gclid;
          }

          //one time set
          if (customer.referrer_email && !existingCustomer.referrer_email) {
            existingCustomer.referrer_email = customer.referrer_email;
          }

          //every time set
          if (customer.samplekit_email_sent) {
            existingCustomer.samplekit_email_sent =
              customer.samplekit_email_sent;
          }

          //every time set
          if (customer.ip_address) {
            existingCustomer.ip_address = customer.ip_address;
          }

          return knex('journey')
            .where({ id: existingCustomer.id })
            .update(existingCustomer);
        }

        customer.created_at = moment.utc().unix();

        return knex('journey').insert(customer);
      })
      .then(() => {
        return knex('journey').where({ email: customer.email });
      })
      .then(rows => {
        return Promise.resolve(rows.length ? rows[0] : null);
      });
  },

  addOrderNameColumn: () => {
    const knex = require(path.resolve('.', './middleware/knex'));
    return knex.schema.table('journey', table => {
      table.string('order_name');
    });
  },

  addLastOrderNameColumn: () => {
    const knex = require(path.resolve('.', './middleware/knex'));
    return knex.schema.table('journey', table => {
      table.string('last_order_name');
    });
  },
};
