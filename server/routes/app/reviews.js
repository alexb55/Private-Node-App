var express = require('express'),
  router = express.Router();

const RouterConfig = require(path.resolve('.', './middleware/appauth'));

let rc = new RouterConfig({
  router,
  title: 'Reviews',
  path: 'managereviews',
  apiKey: 'XXXXXXXXXXX',
  apiSecret: 'XXXXXXXXXXXX',
  scopes: 'XXXXXXX',
});

module.exports = rc.getRouter();
