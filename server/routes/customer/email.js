var express = require('express'),
  router = express.Router();

const path = require('path');
var fs = require('fs');
var ejs = require('ejs');

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

const customizerUtils = require(path.resolve('.', './server/utils/customizer'));

const shopifyClient = require(path.resolve('.', './middleware/shopify'));

const cmConfig = require(path.resolve('.', './config/cm.json'));
var createsend = require('createsend-node');
var cmApiClient = new createsend(cmConfig);
const cmListIds = cmConfig.cmListIds;

router.post('/tradexxx', (req, res) => {
  const { company, website, name, email, comments } = req.body;
  const __gaUserId = req.body.__gaUserId;

  const recaptcha = req.body['g-recaptcha-response'],
    secret = 'XXXXXXXXXXXXXXXXXXXXXXx';

  let subscriberInfo = {
    EmailAddress: email,
    CustomFields: [{ Key: 'XXXXXXXXXXXX', Value: 'XXXXXXXXXXXXXXXXXX' }],
    Resubscribe: true,
    RestartSubscriptionBasedAutoresponders: true,
  };

  fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${
      secret
    }&response=${recaptcha}`,
    {
      method: 'POST',
    }
  )
    .then(response => response.json())
    .then(json => {
      if (json.success) {
        return Promise.resolve();
      }
      return Promise.reject({
        message: 'Captcha is not valid, please try again.',
      });
    })
    .then(() => {
      return journey.updateCustomer({
        email,
        lead_source: 'XXXXXXXXX',
        utma_user_id: __gaUserId,
      });
    })
    .then(p => {
      return cmApiClient.transactional.sendSmartEmail({
        smartEmailID: 'XXXXXXXXXXXXXXXXXXXXXx',
        To: ['XXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX'],
        Data: {
          company,
          website,
          name,
          email,
          comments,
        },
      });
    })
    .then(r => {
      return cmApiClient.subscribers
        .addSubscriber(cmListIds['workflows'], subscriberInfo)
        .then(r => {
          return cmApiClient.subscribers.addSubscriber(
            cmListIds['nl'],
            subscriberInfo
          );
        });
    })
    .then(response => {
      return shopifyClient.customer.search({ query: `email:${email}` });
    })
    .then(customers => {
      if (!customers.length) {
        let first_name = name.split(' ')[0];
        let last_name = name.replace(first_name, '', name);
        return shopifyClient.customer.create({
          email,
          first_name,
          last_name,
          send_email_welcome: false,
          tags: 'Trade',
        });
      }
      return Promise.resolve(customers[0]);
    })
    .catch(err => {
      console.error('Trade form error: ', err);
      return Promise.resolve({});
    })
    .then(response => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    })
    .catch(err => {
      console.error('Trade form error send CM email: ', err);
      res.send(
        JSON.stringify({
          error: '1',
          message: err.message
            ? err.message
            : 'error processing your request, please try later.',
        })
      );
    });
});

router.post('/contactxxx', (req, res) => {
  const { name, email, interest, comment } = req.body;
  const __gaUserId = req.body.__gaUserId;

  const recaptcha = req.body['g-recaptcha-response'],
    secret = 'XXXXXXXXXXXXXXXXXXXXXXX';

  let emailsList = {
    general: 'XXXXXXXXXXXXX',
    sales_question: 'XXXXXXXXXXXXX',
    existing_orders: 'XXXXXXXXXXXXX',
    press: 'XXXXXXXXXXXXX',
  };
  let addToEmail = emailsList[interest];
  let transEmails = {
    general: 'XXXXXXXXXXXXX',
    existing_orders: 'XXXXXXXXXXXXX',
    press: 'XXXXXXXXXXXXX',
  };

  fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${
      secret
    }&response=${recaptcha}`,
    {
      method: 'POST',
    }
  )
    .then(response => response.json())
    .then(json => {
      if (json.success) {
        return Promise.resolve();
      }
      return Promise.reject({
        message: 'Captcha is not valid, please try again.',
      });
    })
    .then(() => {
      return journey.updateCustomer({
        email,
        lead_source: 'Email Contact',
        utma_user_id: __gaUserId,
      });
    })
    .then(customer => {
      return cmApiClient.transactional.sendSmartEmail({
        smartEmailID: 'XXXXXXXXXXXXX',
        To: addToEmail,
        Data: {
          name,
          email,
          interest,
          comment,
        },
      });
    })
    .then(r => {
      if (transEmails[interest]) {
        return cmApiClient.transactional.sendSmartEmail({
          smartEmailID: transEmails[interest],
          To: email,
          Data: {
            name,
            email,
            interest,
            comment,
          },
        });
      }
      return Promise.resolve();
    })
    .then(r => {
      let subscriberInfo = {
        EmailAddress: email,
        CustomFields: [{ Key: 'XXXXXXXXXXXXX', Value: 'XXXXXXXXXXXXX' }],
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
    .then(response => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    })
    .catch(err => {
      res.send(
        JSON.stringify({
          error: '1',
          message: err.message
            ? err.message
            : 'error processing your request, please try later.',
        })
      );
    });
});

router.post('/designxxx', (req, res) => {
  const { name, email, details, photos } = req.body;
  const __gaUserId = req.body.__gaUserId;

  const recaptcha = req.body['g-recaptcha-response'],
    secret = 'XXXXXXXXXXXXX';

  fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${
      secret
    }&response=${recaptcha}`,
    {
      method: 'POST',
    }
  )
    .then(response => response.json())
    .then(json => {
      if (json.success) {
        return Promise.resolve();
      }
      return Promise.reject({
        message: 'Captcha is not valid, please try again.',
      });
    })
    .then(() => {
      return journey.updateCustomer({
        email,
        lead_source: 'Design Help',
        utma_user_id: __gaUserId,
      });
    })
    .then(response => {
      let images = [];
      Object.keys(photos).forEach(key => {
        images.push(
          `<img src="https://s3-us-west-1.amazonaws.com/XXXXXXXXXXXXX/${
            photos[key]
          }" />`
        );
      });
      return cmApiClient.transactional.sendSmartEmail({
        smartEmailID: 'XXXXXXXXXXXXX',
        To: ['XXXXXXXXXXXXX', 'XXXXXXXXXXXXX'],
        Data: {
          name,
          email,
          details,
          images: images.join('<br/><br/><br/>'),
        },
      });
    })
    .then(r => {
      let subscriberInfo = {
        EmailAddress: email,
        CustomFields: [{ Key: 'XXXXXXXXXXXXX', Value: 'XXXXXXXXXXXXX' }],
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
    .then(response => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    })
    .catch(err => {
      res.send(
        JSON.stringify({
          error: '1',
          message: err.message
            ? err.message
            : 'error processing your request, please try later.',
        })
      );
    });
});

router.post('/samplexxx', (req, res) => {
  const {
    name,
    email,
    street,
    apt,
    city,
    state,
    zip,
    sendme,
    comments,
    page_url,
  } = req.body;
  const __gaUserId = req.body.__gaUserId;

  let psm = sendme.join(', ');

  let bodyHtml = 'XXXXXXXXXXXXXXXXXX';

  let subscriberInfo = {
    EmailAddress: email,
    CustomFields: [
      { Key: 'XXXXXXXXXXXXX', Value: 'XXXXXXXXXXXXX' },
    ],
    Resubscribe: true,
    RestartSubscriptionBasedAutoresponders: true,
  };

  cmApiClient.transactional
    .sendSmartEmail({
      smartEmailID: 'XXXXXXXXXXXXX',
      To: [
        'XXXXXXXXXXXXX',
        'XXXXXXXXXXXXX',
        'XXXXXXXXXXXXX',
      ],
      Data: {
        name,
        body_html: bodyHtml,
      },
    })
    .then(response => {
      return cmApiClient.transactional.sendSmartEmail({
        smartEmailID: 'XXXXXXXXXXXXX',
        To: email,
        Data: {},
      });
    })
    .then(r => {
      return cmApiClient.subscribers.addSubscriber(
        cmListIds['workflows'],
        subscriberInfo
      );
    })
    .then(r => {
      return cmApiClient.subscribers.addSubscriber(
        cmListIds['nl'],
        subscriberInfo
      );
    })
    .then(() => {
      return journey.updateCustomer({
        email,
        lead_source: 'XXXXXXXXXXXXX',
        utma_user_id: __gaUserId,
      });
    })
    .then(response => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    })
    .catch(err => {
      res.send(
        JSON.stringify({
          error: '1',
          message: err.message
            ? err.message
            : 'error processing your request, please try later.',
        })
      );
    });
});

let tempNewOrderNames = [];

router.post('/placexxx', (req, res) => {
  let order = { ...req.body };

  console.log(`Place order ${order.name}`);

  if (tempNewOrderNames.indexOf(order.name) > -1) {
    console.log(`SKIPPING: Place order ${order.name}. It already processed.`);
    res.send(JSON.stringify({ error: '0', message: 'success.' }));
    return;
  }
  tempNewOrderNames.push(order.name);
  console.log(`Temp OrderNames: ${tempNewOrderNames.join(',')}`);

  shopifyClient.product
    .list({
      ids: order.line_items
        .filter(li => li.product_id)
        .map(li => li.product_id)
        .join(','),
    })
    .catch(err => {
      console.error(`PLACE ORDER ERROR: ${order.name}`);
      console.error(err);
    })
    .then(products => {
      if (products && products.length) {
        order.line_items = order.line_items.map(li => {
          let product = products.filter(p => p.id == li.product_id);
          if (product.length) {
            try {
              li.product_image = product[0].images[0].src.replace(
                /\.(?=[^.]*$)/,
                '_96x96.'
              );
            } catch (err) {}
            li.product_url = `XXXXXXXXXXXXX/${
              product[0].handle
            }`;
          }
          return li;
        });
      }
      return Promise.resolve();
    })
    .then(() => {
      order.line_items = customizerUtils.processCustomizerOptions(
        order.line_items
      );

      let orderDiscount = parseFloat(order.total_discounts);
      order.line_items = order.line_items.map(li => {
        li.properties.map(lip => {
          if (lip.name.toLowerCase().trim() == 'XXXXXXXXXXXXX') {
            li.compare_at_price = lip.value;
          }
        });
        if (li.compare_at_price) {
          orderDiscount +=
            parseFloat(li.compare_at_price) - parseFloat(li.price);
        }
        return li;
      });
      order.total_discounts = orderDiscount;

      order.subtotal_adjusted =
        parseFloat(order.subtotal_price) + order.total_discounts;

      let order_items_html = '',
        order_shipping_html = '',
        order_billing_html = '';

      try {
        order_items_html = ejs.render(
          fs.readFileSync(
            path.resolve('.', './server/views/email/items.ejs'),
            'utf-8'
          ),
          { order }
        );
      } catch (err) {}

      try {
        order_shipping_html = ejs.render(
          fs.readFileSync(
            path.resolve('.', './server/views/email/address.ejs'),
            'utf-8'
          ),
          { address: order.shipping_address }
        );
        if (order.shipping_lines && order.shipping_lines.length) {
          order_shipping_html += `<br/><strong>Shipping method:</strong><br/>${
            order.shipping_lines[0].title
          }<br/>$${order.shipping_lines[0].price}`;
        }
      } catch (err) {}

      try {
        order_billing_html = ejs.render(
          fs.readFileSync(
            path.resolve('.', './server/views/email/address.ejs'),
            'utf-8'
          ),
          { address: order.billing_address }
        );
      } catch (err) {}

      order.increment_id = order.name;
      order.bill_to = order_billing_html;
      order.customer_name = '';
      if (order.customer) {
        order.customer_name = `${order.customer.first_name} ${
          order.customer.last_name
        }`;
      }

      let trackorder_link =
        '<a href="https://XXXXXXXXXXXXX"><b>Order Status</b></a>';

      let cmEmailId = 'XXXXXXXXXXXXX';
      if (parseFloat(order.subtotal_price) < 25) {
        cmEmailId = 'XXXXXXXXXXXXX';
      }

      let recipients = [
        order.email,
        'XXXXXXXXXXXXX',
        'XXXXXXXXXXXXX',
      ];

      return cmApiClient.transactional.sendSmartEmail({
        smartEmailID: cmEmailId,
        To: recipients,
        Data: {
          order_data: order,
          order_items_html,
          order_shipping_html,
          order_billing_html,
          trackorder_link,
        },
      });
    })
    .catch(err => {
      console.error(err);
    })
    .then(response => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    });
});

router.post('/newxxx', (req, res) => {
  let customer = { ...req.body };

  let customer_data = {
    //name: `${customer.first_name} ${customer.last_name}`,
    name: '',
    email: customer.email,
    password: 'hidden for security reasons',
  };
  if (customer.first_name) {
    customer_data.name = `${customer.first_name}`.trim();
  }
  if (customer.last_name) {
    customer_data.name = `${customer_data.name} ${customer.last_name}`.trim();
  }

  let lead_source = 'XXXXXXXXXXXXX';
  if (customer.tags.indexOf('XXXXXXXXXXXXX -') > -1) {
    lead_source += ',XXXXXXXXXXXXX';
  }

  let lastOrder = null;

  journey
    .updateCustomer({
      email: customer.email,
      lead_source,
    })
    .then(() => {
      if (customer.last_order_id) {
        return shopifyClient.order
          .list({
            ids: customer.last_order_id,
            status: 'any',
          })
          .catch(err =>
            console.log(
              `New acc email error loading order for ${customer.email}: ${err}`
            )
          )
          .then(orders => {
            lastOrder = orders[0];
            return Promise.resolve();
          });
      }
      return Promise.resolve();
    })
    .then(() => {
      if (lastOrder && lastOrder.checkout_id == null) {
        return Promise.resolve();
      }
      return cmApiClient.transactional.sendSmartEmail({
        smartEmailID: 'XXXXXXXXXXXXX',
        To: [
          customer_data.email,
        ],
        Data: {
          customer_data,
        },
      });
    })
    .then(() => {
      if (customer.tags.indexOf('XXXXXXXXXXXXX -') > -1) {
        let subscriberInfo = {
          EmailAddress: customer.email,
          CustomFields: [{ Key: 'XXXXXXXXXXXXX', Value: 'XXXXXXXXXXXXX' }],
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
      }
      return Promise.resolve();
    })
    .catch(err => {
      console.error(err);
    })
    .then(() => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    });
});

router.post('/updatexxx', (req, res) => {
  let order = { ...req.body };
  console.log(`Update order ${order.name}`);

  shopifyClient.product
    .list({
      ids: order.line_items
        .filter(li => li.product_id)
        .map(li => li.product_id)
        .join(','),
    })
    .catch(err => {
      console.error(`UPDATE ORDER ERROR: ${order.name}`);
      console.error(err);
    })
    .then(products => {
      if (products && products.length) {
        order.line_items = order.line_items.map(li => {
          let product = products.filter(p => p.id == li.product_id);
          if (product.length) {
            try {
              li.product_image = product[0].images[0].src.replace(
                /\.(?=[^.]*$)/,
                '_96x96_crop_center.'
              );
            } catch (err) {}
            li.product_url = `XXXXXXXXXXXXX/${
              product[0].handle
            }`;
          }
          return li;
        });
      }
      return Promise.resolve();
    })
    .then(() => {
      order.line_items = customizerUtils.processCustomizerOptions(
        order.line_items
      );

      let orderDiscount = parseFloat(order.total_discounts);
      order.line_items = order.line_items.map(li => {
        li.properties.map(lip => {
          if (lip.name.toLowerCase().trim() == 'XXXXXXXXXXXXX') {
            li.compare_at_price = lip.value;
          }
        });
        if (li.compare_at_price) {
          orderDiscount +=
            parseFloat(li.compare_at_price) - parseFloat(li.price);
        }
        return li;
      });
      order.total_discounts = orderDiscount;

      order.subtotal_adjusted =
        parseFloat(order.subtotal_price) + parseFloat(order.total_discounts);

      let order_items_html = ejs.render(
        fs.readFileSync(
          path.resolve('.', './server/views/email/items.ejs'),
          'utf-8'
        ),
        { order }
      );

      order.increment_id = order.name;
      order.customer_name = '';
      if (order.customer) {
        order.customer_name = `${order.customer.first_name} ${
          order.customer.last_name
        }`;
      }

      let status_label = order.tags.split('S:');
      if (status_label.length > 1) {
        status_label = status_label[1].split(',')[0].trim();
      } else {
        status_label = ``;
      }
      order.status_label = status_label;

      let esd = order.tags.split('ESD:');
      if (esd.length > 1) {
        esd = esd[1].split(',')[0].trim();
      } else {
        esd = ``;
      }
      order.esd = esd;

      if (
        (order.status_label.indexOf('XXXXXXXXXXXXX') > -1 ||
          !order.status_label) &&
        !order.esd
      ) {
        return Promise.resolve([]);
      }

      let comment = '';

      let trackorder_link =
        '<a href="https://XXXXXXXXXXXXX"><b>Order Status</b></a>';

      let customerEmail = order.email;
      if (!customerEmail) {
        let extracted = order.note.match(
          /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi
        );
        if (extracted && extracted.length) {
          customerEmail = extracted[0];
        }
      }

      if (!customerEmail) {
        return Promise.reject(new Error('No Customer Email.'));
      }

      return cmApiClient.transactional.sendSmartEmail({
        smartEmailID: 'XXXXXXXXXXXXX',
        To: [
          customerEmail,
        ],
        Data: {
          order_data: order,
          order_items_html,
          comment,
          trackorder_link,
        },
      });
    })
    .catch(err => {
      console.error(err);
    })
    .then(response => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    });
});

module.exports = router;
