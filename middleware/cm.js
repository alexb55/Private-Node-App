const path = require('path');

const cmConfig = require(path.resolve('.', './config/cm.json'));
var createsend = require('createsend-node');
const cmApiClient = new createsend(cmConfig);

module.exports = cmApiClient;
