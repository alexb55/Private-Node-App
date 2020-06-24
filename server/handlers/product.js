const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));

var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws.json');
var s3 = new AWS.S3();

const s3Bucket = 'XXXXXXXXXXX';
const s3Dir = 'XXXXXXXXXXX/';

module.exports = {

  product: {

    list: (req, res) => {
      let avbParams = ['ids', 'collection_id', 'page', 'limit'];
      let params = {};

      avbParams.forEach(param => {
        if (req.query[param]) {
          params[param] = req.query[param];
        }
      });

      let out = {};

      shopifyClient.product
        .count(params)
        .then(result => {
          out.total = result;
          return shopifyClient.product.list(params);
        })
        .then(items => {
          out.products = items;
          res.send(JSON.stringify(out));
        });
    },

    sorted_xxx: (req, res) => {
      let avbParams = ['collection_id', 'page', 'limit'];
      let params = {};

      avbParams.forEach(param => {
        if (req.query[param]) {
          params[param] = req.query[param];
        }
      });

      let out = {};

      fetch(
        `XXXXXXXXXXX${
          params.collection_id
        }&_cd=XXXXXXXXXXX`,
        { referrerPolicy: 'no-referrer-when-downgrade', credentials: 'include' }
      )
        .then(response => response.json())
        .then(result => {
          console.log(result);
          out.filters = result.tags;

          let from = params.limit * (params.page - 1);
          let to = from + params.limit;

          let filteredProducts = result.products.filter(p => true);

          out.total = filteredProducts.length;
          out.products = filteredProducts.slice(from, to);

          res.send(JSON.stringify(out));
        });
    },

    customizer_xxx: (req, res) => {
      let params = {
        metafield: {
          owner_id: req.query.product_id,
          owner_resource: 'product',
        },
      };

      let out = {};

      shopifyClient.metafield.list(params).then(items => {
        items.filter(item => item.namespace == 'XXXXXXXXXXX').forEach(item => {
          out[item.key] = JSON.parse(item.value);
        });
        res.send(JSON.stringify(out));
      });
    },

    price_xxx: (req, res) => {
      let params = {
        metafield: {
          owner_id: req.query.product_id,
          owner_resource: 'product',
        },
      };

      let customizerConfig = {},
        finalPrice = 0;

      shopifyClient.product
        .list({ ids: req.query.product_id })
        .then(products => {
          if (products && products.length) {
            finalPrice = parseFloat(products[0].variants[0].price) * 100;
          }
          return shopifyClient.metafield.list(params);
        })
        .then(items => {
          items.filter(item => item.namespace == 'XXXXXXXXXXX').forEach(item => {
            customizerConfig[item.key] = JSON.parse(item.value);
          });

          if (customizerConfig.options && customizerConfig.options.length) {
            return customizerConfig.options.reduce((promise, option) => {
              let optionMultiplier = 1;
              if (
                customizerConfig.variantAttributes &&
                Object.keys(customizerConfig.variantAttributes).length
              ) {
                optionMultiplier =
                  parseFloat(
                    customizerConfig.variantAttributes[
                      Object.keys(customizerConfig.variantAttributes)[0]
                    ][option.pricing_attribute]
                  ) || 1;
              }
              return promise.then(() => {
                if (option.values_source) {
                  return fetch(
                    `XXXXXXXXXXX?collection_id=${
                      option.values_source
                    }`
                  )
                    .then(response => response.json())
                    .then(result => {
                      if (result.products && result.products.length) {
                        finalPrice =
                          finalPrice +
                          parseFloat(result.products[0].price) * optionMultiplier;
                      }
                    });
                }
                return Promise.resolve();
              });
            }, Promise.resolve([]));
          }
          return Promise.resolve();
        })
        .catch(err => console.error(err))
        .then(() => {
          res.send(JSON.stringify({ price: finalPrice }));
        });
    },

    swapimages: (req, res) => {
      const listAllKeys = (params, out = []) =>
        new Promise((resolve, reject) => {
          s3
            .listObjectsV2(params)
            .promise()
            .then(({ Contents, IsTruncated, NextContinuationToken }) => {
              out.push(...Contents);
              !IsTruncated
                ? resolve(out)
                : resolve(
                    listAllKeys(
                      Object.assign(params, {
                        ContinuationToken: NextContinuationToken,
                      }),
                      out
                    )
                  );
            })
            .catch(reject);
        });

      listAllKeys({
        Bucket: s3Bucket,
        Prefix: s3Dir,
      }).then(s3List => {
        let out = '';
        s3List.map(item => (out += `${item.Key.replace(s3Dir, '')}<br/>`));
        res.send(out);
      });
    },

    customcollections: (req, res) => {
      shopifyClient.customCollection.list({ limit: 250 }).then(collections => {
        res.send(JSON.stringify(collections));
      });
    },

  },

  modifications: {

    save: (req, res) => {
      let data = {
        product_id: req.body.product_id.toString(),
        items: req.body.items.map(i => {
          return i.slice(0, 3);
        }),
      };

      const knex = require(path.resolve('.', './middleware/knex'));

      shopifyClient.productVariant
        .list('XXXXXXXXXX')
        .then(variants => {
          let newPrices = data.items
            .map(item => item[1])
            .filter(
              itemPrice =>
                itemPrice > 0 &&
                !variants.filter(v => parseFloat(v.price) == parseFloat(itemPrice))
                  .length
            );
          if (newPrices.length) {
            return newPrices.reduce((promise, newPrice) => {
              return promise.then(() => {
                return shopifyClient.productVariant.create('XXXXXXXXXX', {
                  option1: newPrice,
                  price: parseFloat(newPrice),
                  inventory_management: null,
                });
              });
            }, Promise.resolve());
          }
          return Promise.resolve();
        })
        .then(() => {
          return knex('modifications')
            .where('product_id', '=', data.product_id)
            .update({ items: JSON.stringify(data.items) });
        })
        .then(item => {
          if (!item) {
            return knex('modifications').insert(data);
          }
          return Promise.resolve();
        })
        .then(() => {
          return res.send(JSON.stringify(data));
        });
    },

    getModification: (req, res) => {
      let out = [];
      if (req.query.product_id) {
        const knex = require(path.resolve('.', './middleware/knex'));
        knex('modifications')
          .where('product_id', '=', req.query.product_id)
          .then(items => {
            if (items && items.length) {
              out = JSON.parse(items[0].items) || [];
            }
            return Promise.resolve();
          })
          .then(() => {
            res.send(
              JSON.stringify(
                out.sort((a, b) => {
                  if (parseInt(a[2]) < parseInt(b[2])) return -1;
                  if (parseInt(a[2]) > parseInt(b[2])) return 1;
                  return 0;
                })
              )
            );
          });
      } else {
        res.send(JSON.stringify(out));
      }
    },

    getAll: (req, res) => {
      let out = [];
      const knex = require(path.resolve('.', './middleware/knex'));
      knex('modifications')
        .then(items => {
          out = items;
          return Promise.resolve();
        })
        .then(() => {
          res.send(JSON.stringify(out));
        });
    },

  },

};
