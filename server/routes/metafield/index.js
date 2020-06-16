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

const shopifyClient = require(path.resolve('.', './middleware/shopify'));

router.get('/product/:id.:ns.:key', (req, res) => {
  shopifyClient.metafield
    .list({
      metafield: {
        owner_resource: 'product',
        owner_id: req.params.id,
        //namespace: req.params.ns,
        //key: req.params.key,
      },
    })
    .then(metafields => {
      metafields = metafields.filter(m => {
        return m.namespace == req.params.ns && m.key == req.params.key;
      });
      let metafield = {};
      if (metafields.length) {
        metafield = JSON.parse(metafields[0].value);
      }
      res.send(JSON.stringify(metafield));
    });
});

router.get('/:ns.:key', (req, res) => {
  shopifyClient.metafield
    .list({ namespace: req.params.ns, key: req.params.key })
    .then(metafields => {
      let metafield = {};
      if (metafields.length) {
        metafield = JSON.parse(metafields[0].value);
      }
      res.send(JSON.stringify(metafield));
    });
});

router.post('/save', (req, res) => {
  let metafield = { ...req.body.metafield };
  shopifyClient.metafield
    .create(metafield)
    .catch(err => console.error(err))
    .then(metafield => {
      res.send(JSON.stringify(metafield));
    });
});

module.exports = router;
