var express = require('express'),
  router = express.Router();
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

const handlers = require(path.resolve('.', './server/handlers/metafield'));

router.get('/product/:id.:ns.:key', handlers.getForProduct);
router.get('/:ns.:key', handlers.getMetafield);
router.post('/save', handlers.save);

module.exports = router;
