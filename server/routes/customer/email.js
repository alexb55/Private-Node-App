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

router.post('/tradexxx', handlers.email.tradexxx);
router.post('/contactxxx', handlers.email.contactxxx);
router.post('/designxxx', handlers.email.designxxx);
router.post('/samplexxx', handlers.email.samplexxx);
router.post('/placexxx', handlers.email.placexxx);
router.post('/newxxx', handlers.email.newxxx);
router.post('/updatexxx', handlers.email.updatexxx);

module.exports = router;
