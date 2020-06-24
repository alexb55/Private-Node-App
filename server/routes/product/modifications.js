var express = require('express'),
  router = express.Router();
const path = require('path');

const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const handlers = require(path.resolve('.', './server/handlers/product'));

router.post('/save', handlers.modifications.save);
router.get('/get', handlers.modifications.getModification);
router.get('/all', handlers.modifications.getAll);

module.exports = router;
