const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));

module.exports = {

  getForProduct: (req, res) => {
    shopifyClient.metafield
      .list({
        metafield: {
          owner_resource: 'product',
          owner_id: req.params.id,
          //namespace: req.params.ns,
          //key: req.params.key,
        },
      })
      .then(metafields => {
        metafields = metafields.filter(m => {
          return m.namespace == req.params.ns && m.key == req.params.key;
        });
        let metafield = {};
        if (metafields.length) {
          metafield = JSON.parse(metafields[0].value);
        }
        res.send(JSON.stringify(metafield));
      });
  },

  getMetafield: (req, res) => {
    shopifyClient.metafield
      .list({ namespace: req.params.ns, key: req.params.key })
      .then(metafields => {
        let metafield = {};
        if (metafields.length) {
          metafield = JSON.parse(metafields[0].value);
        }
        res.send(JSON.stringify(metafield));
      });
  },

  save: (req, res) => {
    let metafield = { ...req.body.metafield };
    shopifyClient.metafield
      .create(metafield)
      .catch(err => console.error(err))
      .then(metafield => {
        res.send(JSON.stringify(metafield));
      });
  },

};
