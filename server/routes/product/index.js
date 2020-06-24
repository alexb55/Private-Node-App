var express = require('express'),
  router = express.Router();
const path = require('path');

const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const handlers = require(path.resolve('.', './server/handlers/product'));

router.get('/list', handlers.product.list);
router.get('/sorted_xxx', handlers.product.sorted_xxx);
router.get('/customizer_xxx', handlers.product.customizer_xxx);
router.get('/price_xxx', handlers.product.price_xxx);
router.get('/swapimages', handlers.product.swapimages);
router.get('/customcollections', handlers.product.customcollections);

module.exports = router;
