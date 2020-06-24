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

const handlers = require(path.resolve('.', './server/handlers/vendor'));

router.get('/list', handlers.list);
router.post('/placeorder', handlers.placeorder);

module.exports = router;
