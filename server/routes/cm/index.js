var express = require('express'),
  router = express.Router();
const path = require('path');

/*
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});
*/

const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const handlers = require(path.resolve('.', './server/handlers/cm'));

router.get('/subscriber/test', handlers.test);
router.post('/subscriber/add', handlers.add);
router.post('/subscriber/updateSegments', handlers.updateSegments);

module.exports = router;
