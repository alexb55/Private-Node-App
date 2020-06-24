var express = require('express'),
  router = express.Router();
const path = require('path');

const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const handlers = require(path.resolve('.', './server/handlers/review'));

router.get('/list', handlers.list);
router.post('/add', handlers.add);
router.post('/toggleHome', handlers.toggleHome);
router.post('/update', handlers.update);

module.exports = router;
