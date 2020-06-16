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

router.post('/save', (req, res) => {
  let cart = { ...req.body };
  const knex = require(path.resolve('.', './middleware/knex'));

  cart.items = cart.items.map(i => {
    i.product_description = '';
    return i;
  });

  let uid = Math.random()
    .toString()
    .split('.')[1];

  knex('customer_cart')
    .insert({
      uid,
      cart_json: JSON.stringify(cart),
    })
    .then(response => {
      res.send(JSON.stringify(uid));
    });
});

router.get('/load', (req, res) => {
  let uid = req.query.id;
  const knex = require(path.resolve('.', './middleware/knex'));

  knex('customer_cart')
    .where('uid', '=', uid)
    .then(rows => {
      let out = '{}';
      if (rows && rows.length) {
        out = rows[0].cart_json;
      }
      res.send(out);
    });
});

module.exports = router;
