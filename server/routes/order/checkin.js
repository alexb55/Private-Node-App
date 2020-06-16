var express = require('express');
var router = express.Router();
const path = require('path');

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
const shopifyClient = require(path.resolve('.', './middleware/shopify'));

const cmConfig = require(path.resolve('.', './config/cm.json'));
var createsend = require('createsend-node');
var cmApiClient = new createsend(cmConfig);
const cmListIds = cmConfig.cmListIds;

router.post('/hook', (req, res) => {
  let order = { ...req.body };
  const knex = require(path.resolve('.', './middleware/knex'));

  knex('order_checkin')
    .where('order_id', '=', order.id.toString())
    .then(rows => {
      if (!rows || !rows.length) {
        if (
          order.tags.indexOf('XXXXXXXXXXXXXXXx') > -1
        ) {
          return knex('order_checkin').insert({
            order_id: order.id.toString(),
            email: order.email,
          });
        }
      }
      return Promise.resolve();
    })
    .then(response => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    });
});

module.exports = router;
