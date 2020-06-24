const xero = require('xero-node');
const xeroConfig = require(path.resolve('.', './config/xero/config.json'));
if (xeroConfig.privateKeyPath && !xeroConfig.privateKey) {
  xeroConfig.privateKey = fs.readFileSync(
    path.resolve('.', xeroConfig.privateKeyPath)
  );
}
const xeroClient = new xero.PrivateApplication(xeroConfig);

module.exports = { xeroClient };
