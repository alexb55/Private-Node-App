var express = require('express');
var router = express.Router();
const path = require('path');

const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const shopifyClient = require(path.resolve('.', './middleware/shopify'));

router.post('/save', (req, res) => {
  let data = {
    product_id: req.body.product_id.toString(),
    items: req.body.items.map(i => {
      return i.slice(0, 3);
    }),
  };

  const knex = require(path.resolve('.', './middleware/knex'));

  shopifyClient.productVariant
    .list('XXXXXXXXXX')
    .then(variants => {
      let newPrices = data.items
        .map(item => item[1])
        .filter(
          itemPrice =>
            itemPrice > 0 &&
            !variants.filter(v => parseFloat(v.price) == parseFloat(itemPrice))
              .length
        );
      if (newPrices.length) {
        return newPrices.reduce((promise, newPrice) => {
          return promise.then(() => {
            return shopifyClient.productVariant.create('XXXXXXXXXX', {
              option1: newPrice,
              price: parseFloat(newPrice),
              inventory_management: null,
            });
          });
        }, Promise.resolve());
      }
      return Promise.resolve();
    })
    .then(() => {
      return knex('modifications')
        .where('product_id', '=', data.product_id)
        .update({ items: JSON.stringify(data.items) });
    })
    .then(item => {
      if (!item) {
        return knex('modifications').insert(data);
      }
      return Promise.resolve();
    })
    .then(() => {
      return res.send(JSON.stringify(data));
    });
});

router.get('/get', (req, res) => {
  let out = [];
  if (req.query.product_id) {
    const knex = require(path.resolve('.', './middleware/knex'));
    knex('modifications')
      .where('product_id', '=', req.query.product_id)
      .then(items => {
        if (items && items.length) {
          out = JSON.parse(items[0].items) || [];
        }
        return Promise.resolve();
      })
      .then(() => {
        res.send(
          JSON.stringify(
            out.sort((a, b) => {
              if (parseInt(a[2]) < parseInt(b[2])) return -1;
              if (parseInt(a[2]) > parseInt(b[2])) return 1;
              return 0;
            })
          )
        );
      });
  } else {
    res.send(JSON.stringify(out));
  }
});

router.get('/all', (req, res) => {
  let out = [];
  const knex = require(path.resolve('.', './middleware/knex'));
  knex('modifications')
    .then(items => {
      out = items;
      return Promise.resolve();
    })
    .then(() => {
      res.send(JSON.stringify(out));
    });
});

module.exports = router;
