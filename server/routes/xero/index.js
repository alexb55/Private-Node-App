var express = require('express'),
  router = express.Router();
const path = require('path');

const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const handlers = require(path.resolve('.', './server/handlers/xero'));

router.get('/test', handlers.test);
router.post('/placeorder', handlers.placeorder);
router.post('/createpurchaseorders', handlers.createpurchaseorders);

module.exports = router;
