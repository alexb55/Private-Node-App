const path = require('path');

const ShopifyAPIClient = require('shopify-api-node');
const shopifyAppConfig = require(path.resolve('.', './config/shopifyapp'));
const shopifyClient = new ShopifyAPIClient(shopifyAppConfig);

module.exports = shopifyClient;
