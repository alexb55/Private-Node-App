var express = require('express');
var router = express.Router();
const path = require('path');

const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const shopifyClient = require(path.resolve('.', './middleware/shopify'));

var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws.json');
var s3 = new AWS.S3();

const s3Bucket = 'XXXXXXXXXXX';
const s3Dir = 'XXXXXXXXXXX/';

router.get('/list', (req, res) => {
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
});

router.get('/sorted_xxx', (req, res) => {
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
});

router.get('/customizer_xxx', (req, res) => {
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
});

router.get('/price_xxx', (req, res) => {
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
});

router.get('/swapimages', (req, res) => {
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
});

router.get('/customcollections', (req, res) => {
  shopifyClient.customCollection.list({ limit: 250 }).then(collections => {
    res.send(JSON.stringify(collections));
  });
});

module.exports = router;
