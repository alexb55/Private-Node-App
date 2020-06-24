//todo: MIGRATE TO async/await

require('isomorphic-fetch');
require('dotenv').config();

const fs = require('fs');
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const path = require('path');
const logger = require('morgan');

//todo fix in git
const {
  SHOPIFY_APP_KEY,
  SHOPIFY_APP_HOST,
  SHOPIFY_APP_SECRET,
  NODE_ENV,
} = process.env;

global.isDevelopment = NODE_ENV !== 'production';
global.shopDomain = global.isDevelopment ? 'dev' : 'prod';

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(
  session({
    store: global.isDevelopment
      ? undefined
      : new RedisStore({
          client: require('redis').createClient(process.env.REDIS_URL),
        }),
    secret: SHOPIFY_APP_SECRET,
    resave: true,
    saveUninitialized: false,
  })
);

// Run webpack hot reloading in dev
if (global.isDevelopment) {
  const webpack = require('webpack');
  const webpackMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const config = require('../config/webpack.config.js');

  const compiler = webpack(config);
  const middleware = webpackMiddleware(compiler, {
    hot: false,
    inline: true,
    publicPath: config.output.publicPath,
    contentBase: 'src',
    stats: {
      colors: true,
      hash: false,
      timings: true,
      chunks: false,
      chunkModules: false,
      modules: false,
    },
  });

  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));
} else {
  const staticPath = path.resolve(__dirname, '../assets');
  app.use('/assets', express.static(staticPath));
}

const snippetsPath = path.resolve(__dirname, '../snippets');
app.use('/snippets', express.static(snippetsPath));

[
  'cm',
  'vendor',
  'review',
  'xero',
  'customer/email',
  'customer/journey',
  'customer/cart',
  'order',
  'order/checkin',
  'metafield',
  'product',
  'product/modifications',
  'app/reviews',
  'app/vendors',
  'app/productmods',
  'app/journey',
  'app/customizer',
].map(r => app.use(`/${r}`, require(`./routes/${r}`)));

// Error Handlers
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((error, request, response, next) => {
  response.locals.message = error.message;
  response.locals.error = request.app.get('env') === 'development' ? error : {};

  console.log(error);

  response.status(error.status || 500);
  response.render('error');
});

module.exports = app;
