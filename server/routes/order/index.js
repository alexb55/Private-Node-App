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

const handlers = require(path.resolve('.', './server/handlers/order'));

router.get('/search', handlers.order.search);
router.get('/list', handlers.order.list);
router.get('/:orderId', handlers.order.getOrder);
router.post('/saveestshipdate', handlers.order.saveestshipdate);
router.post('/place', handlers.order.place);
router.post('/swatches', handlers.order.swatches);
router.post('/swatchesnotes', handlers.order.swatchesnotes);

module.exports = router;
