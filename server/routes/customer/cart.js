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

const handlers = require(path.resolve('.', './server/handlers/customer'));

router.post('/save', handlers.cart.save);
router.get('/load', handlers.cart.load);

module.exports = router;
