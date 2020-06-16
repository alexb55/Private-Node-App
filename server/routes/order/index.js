var express = require('express');
var router = express.Router();
const path = require('path');
var os = require('os');

const bodyParser = require('body-parser');
router.use(bodyParser.json({ limit: '50mb' }));
router.use(
  bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000,
  })
);

const journey = require(path.resolve('.', './server/utils/journey'));

const moment = require('moment');

const shopifyClient = require(path.resolve('.', './middleware/shopify'));

const cmConfig = require(path.resolve('.', './config/cm.json'));
var createsend = require('createsend-node');
var cmApiClient = new createsend(cmConfig);
const cmListIds = cmConfig.cmListIds;

router.get('/search', (req, res) => {
  const knex = require(path.resolve('.', './middleware/knex'));

  let order = {};
  let products = [];
  shopifyClient.order
    .list({ name: req.query.name, status: 'any' })
    .then(orders => {
      if (
        orders.length &&
        orders[0].email.toLowerCase() == req.query.email.toLowerCase()
      ) {
        order = orders[0];
        return shopifyClient.product.list({
          ids: order.line_items
            .filter(li => li.product_id)
            .map(li => li.product_id)
            .join(','),
        });
        //return Promise.resolve([]);
      }
      return Promise.reject();
    })
    .then(shopifyProducts => {
      products = shopifyProducts;
      return knex('order_item').whereIn(
        'line_item_id',
        order.line_items.map(li => li.id.toString())
      );
    })
    .then(knexItems => {
      if (products && products.length) {
        order.line_items = order.line_items.map(li => {
          let product = products.filter(p => p.id == li.product_id);
          if (product.length) {
            li.product_data = product[0];
          }
          dbItem = knexItems.filter(i => i.line_item_id == li.id.toString());
          if (dbItem.length) {
            li.est_ship_date = dbItem[0].est_ship_date;
          }
          return li;
        });
      }
      return Promise.resolve([]);
    })
    .catch(err => {
      console.error(err);
    })
    .then(() => {
      res.send(JSON.stringify(order));
    });
});

router.get('/list', (req, res) => {
  let params = { status: 'any', limit: 250 };
  if (req.query.ids) {
    params.ids = req.query.ids;
  }

  const { start, end } = req.query;

  const knex = require(path.resolve('.', './middleware/knex'));

  let orders = {};

  shopifyClient.order
    .list(params)
    .then(shopifyOrders => {
      orders = shopifyOrders;
      let query = knex('order_item');
      return query;
    })
    .then(items => {
      //console.log(items);
      orders = orders
        .map(order => {
          order.line_items = order.line_items.map(li => {
            dbItem = items.filter(i => i.line_item_id == li.id.toString());
            if (dbItem.length) {
              li.est_ship_date = dbItem[0].est_ship_date;
            }
            return li;
          });
          return order;
        })
        .filter(order => {
          if (start || end) {
            let lineItems = order.line_items.filter(li => {
              let result = false;
              if (li.est_ship_date) {
                if (start && end) {
                  if (li.est_ship_date >= start && li.est_ship_date <= end) {
                    result = true;
                  }
                } else if (start && li.est_ship_date >= start) {
                  result = true;
                } else if (end && li.est_ship_date <= end) {
                  result = true;
                }
              }
              //console.log(li.est_ship_date, result);
              return result;
            });
            if (!lineItems.length) {
              return false;
            }
          }
          return true;
        });
      res.send(JSON.stringify(orders));
    });
});

router.get('/:orderId', (req, res) => {
  shopifyClient.order
    .list({ ids: req.params.orderId, status: 'any' })
    .then(orders => {
      let order = {};
      if (orders.length) {
        order = orders[0];
      }
      res.send(JSON.stringify(order));
    });
});

router.post('/saveestshipdate', (req, res) => {
  let data = {
    line_item_id: req.body.line_item_id.toString(),
    est_ship_date: req.body.est_ship_date.toString(),
  };

  const knex = require(path.resolve('.', './middleware/knex'));

  knex('order_item')
    .where('line_item_id', '=', data.line_item_id)
    .update(data)
    .then(item => {
      if (!item) {
        return knex('order_item').insert(data);
      }
      return Promise.resolve();
    })
    .then(() => {
      return res.send(JSON.stringify(data));
    });
});

router.post('/place', (req, res) => {
  let order = { ...req.body };

  let leadSource = 'XXXXXXXXXXXXXXX';

  let customFields = [];

  shopifyClient.order
    .update(order.id, {
      id: order.id,
      tags: `${order.tags}${order.tags.length ? `,` : ``}XXXXXXXXXXXXXXXXXXXXXXX`,
    })
    .then(() => {

      return journey.updateCustomer({
        email: order.email,
        net_sales: parseFloat(order.subtotal_price),
        order_name: order.name,
        lead_source: leadSource,
      });
    })
    .then(r => {
      customFields.push({ Key: 'XXXXXXXXXXXX', Value: 'XXXXXXXXXXXX' });
      customFields.push({ Key: 'XXXXXXXXXXXX', Value: 'XXXXXXXXXXXX' });
      if (parseFloat(order.total_price) > 50) {
        customFields.push({ Key: 'XXXXXXXXXXXX', Value: '1' });
        customFields.push({
          Key: 'XXXXXXXXXXXX',
          Value: moment(order.created_at).format('YYYY/MM/DD'),
        });
      }
      customFields.push({
        Key: 'XXXXXXXXXXXX',
        Value: parseInt(order.total_price),
      });
      if (customFields.length) {
        let subscriberInfo = {
          EmailAddress: order.email,
          CustomFields: customFields,
          Resubscribe: true,
          RestartSubscriptionBasedAutoresponders: true,
        };
        return cmApiClient.subscribers
          .addSubscriber(cmListIds['workflows'], subscriberInfo)
          .then(r => {
            //if (leadSource.toLowerCase().indexOf('samples') > -1) {
            return cmApiClient.subscribers.addSubscriber(
              cmListIds['nl'],
              subscriberInfo
            );
            //}
            return Promise.resolve();
          });
      }
      return Promise.resolve();
    })
    .then(response => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    });
});

router.post('/swatches', (req, res) => {
  let quote = { ...req.body };

  const __gaUserId = quote.__gaUserId;

  if (quote.orderPopular) {
    quote.items = [
      {
        productId: 'XXXXXXXXXXXX',
      },
    ];
  }

  if (!quote.items.length) {
    res.send(JSON.stringify({}));
    return;
  }

  let order = {
    email: quote.address.email,
    send_receipt: false,
    send_fulfillment_receipt: false,
    customer: {
      first_name: quote.address.firstname,
      last_name: quote.address.lastname,
      email: quote.address.email,
      send_email_welcome: false,
      tags: quote.tradeInterested ? 'XXXXXXXXXXXX' : '',
    },
    shipping_address: {
      first_name: quote.address.firstname,
      last_name: quote.address.lastname,
      address1:
        quote.address.address +
        (quote.address.suite ? `, ${quote.address.suite}` : ''),
      //phone: quote.address.phone,
      city: quote.address.city,
      province: quote.address.state,
      country: 'United States',
      zip: quote.address.zip,
    },
    line_items: [],
    //note: notes,
  };

  order.billing_address = order.shipping_address;

  let createdOrder = {};

  shopifyClient.product
    .list({
      ids: quote.items.map(i => i.productId).join(','),
      limit: quote.items.length,
    })
    .then(products => {
      products.map(i => {
        if (
          quote.items
            .map(i => i.productId)
            .join(',')
            .indexOf(i.id) > -1
        ) {
          order.line_items.push({
            variant_id: i.variants[0].id,
            quantity: 1,
          });
        }
      });
      return shopifyClient.order.create(order);
    })
    .then(response => {
      createdOrder = response;
      let subscriberInfo = {
        EmailAddress: quote.address.email,
        CustomFields: [{ Key: 'XXXXXXXXXXXX', Value: 'XXXXXXXXXXXX' }],
        Resubscribe: true,
        RestartSubscriptionBasedAutoresponders: true,
      };
      return cmApiClient.subscribers
        .addSubscriber(cmListIds['workflows'], subscriberInfo)
        .then(r => {
          return cmApiClient.subscribers.addSubscriber(
            cmListIds['nl'],
            subscriberInfo
          );
        });
    })
    .catch(err => Promise.resolve())
    .then(() => {
      let bodyHtml = 'XXXXXXXXXXXX';
      return cmApiClient.transactional.sendSmartEmail({
        smartEmailID: 'XXXXXXXXXXXX',
        To: [
          'XXXXXXXXXXXX',
          'XXXXXXXXXXXX',
          'XXXXXXXXXXXX',
        ],
        Data: {
          name: `${quote.address.firstname} ${quote.address.lastname}`,
          body_html: bodyHtml,
        },
      });
    })
    .catch(err => Promise.resolve())
    .then(() => {
      return journey.updateCustomer({
        email: quote.address.email,
        lead_source: 'XXXXXXXXXXXX',
        utma_user_id: __gaUserId,
      });
    })
    .then(r => {
      res.send(JSON.stringify(createdOrder));
    });
});

router.post('/swatchesnotes', (req, res) => {
  let quote = { ...req.body.quote };
  let order = { ...req.body.order };

  let notes = '';
  notes += `XXXXXXXXXXXX: ${
    quote.tradeInterested ? 'Yes' : 'No'
  }${os.EOL}${os.EOL}`;
  notes += `XXXXXXXXXXXX: ${quote.designStyle.join(', ')}${os.EOL}${os.EOL}`;
  notes += `XXXXXXXXXXXX: ${quote.shoppingFor.join(', ')}${os.EOL}${os.EOL}`;

  shopifyClient.order
    .update(order.id, {
      id: order.id,
      note: notes,
    })
    .then(response => {
      res.send(JSON.stringify(response));
    });
});

module.exports = router;
