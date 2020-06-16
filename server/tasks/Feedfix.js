require('dotenv').config();
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const rp = require('request-promise');

var parser = require('fast-xml-parser');
var j2xParser = new parser.j2xParser({
  format: true,
  attrNodeName: 'attr',
  attributeNamePrefix: '',
  ignoreAttributes: false,
  ignoreNameSpace: false,
});
//
const shopifyClient = require(path.resolve('.', './middleware/shopify'));
shopifyClient.on('callGraphqlLimits', limits => console.log(limits));

const Job = () => {
  const customizerInfoQuery = (skus = [], cursor = '') => {
    return `{
    productVariants(first:100${
      skus.length ? `, query:"${skus.join(' OR ')}"` : ``
    }${cursor ? `, after:"${cursor}"` : ``}) {
      edges {
        cursor
        node {
          id,
          sku,
          product {
            id,
            metafields(namespace:"customizer", first:2) {
              edges {
                node {
                  key,
                  value,
                }
              }
            },
          },
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }`;
  };

  const listAllVariants = (productSkus, cursor, out = []) =>
    new Promise((resolve, reject) => {
      //prevent throttling
      setTimeout(() => {
        shopifyClient
          .graphql(customizerInfoQuery(productSkus, cursor))
          .then(customizerInfoResult => {
            out = out.concat(
              customizerInfoResult.productVariants.edges.slice(0)
            );
            console.log('list all variants:', out.length);
            !customizerInfoResult.productVariants.pageInfo.hasNextPage
              ? resolve(out)
              : resolve(
                  listAllVariants(
                    productSkus,
                    customizerInfoResult.productVariants.edges.pop().cursor,
                    out
                  )
                );
          })
          .catch(reject);
      }, 3000);
    });

  let xmlProducts = {},
    customizerInfo = {},
    cheapestPrices = {};

  // get xml
  fetch(
    'XXXXXXXXXXXXXXXXXXXXXXXX.xml'
  )
    .then(r => r.text())
    .then(r => {
      xmlProducts = parser.parse(r, {
        attrNodeName: 'attr',
        attributeNamePrefix: '',
        ignoreAttributes: false,
        ignoreNameSpace: false,
      });
      let productSkus = xmlProducts.rss.channel.item.map(p => p['g:id']); //.slice(0, 20);
      console.log('xml products:', productSkus.length);

      //load all customizer data from metafields
      return listAllVariants(productSkus);
    })
    .then(allVariants => {
      customizerInfo = allVariants;

      // get valuesSource (collection IDs)
      let valuesSource = [];
      customizerInfo.map(edge => {
        edge.node.product.metafields.edges.map(metafieldEdge => {
          if (metafieldEdge.node.key != 'options') {
            return;
          }
          JSON.parse(metafieldEdge.node.value).map(v => {
            if (
              v.values_source &&
              valuesSource.indexOf(v.values_source) == -1
            ) {
              valuesSource.push(v.values_source);
            }
          });
        });
      });

      // get first Items by default sort in each collection)
      let cheapestItems = [];
      return valuesSource
        .reduce((promise, collection_id) => {
          return promise
            .then(() => {
              return shopifyClient.collection
                .products(collection_id, { limit: 1 })
                .then(items => {
                  cheapestItems.push({
                    id: collection_id,
                    item: items[0],
                  });
                })
                .then(r => {
                  // prevent throttling
                  return new Promise(resolve => setTimeout(resolve, 1000));
                });
            })
            .catch(err => console.log(err));
        }, Promise.resolve([]))
        .then(() => {
          // we have to load prices, because in step above Shopify doesn't provide them
          return shopifyClient.product.list({
            ids: cheapestItems.map(i => i.item.id).join(','),
          });
        })
        .then(items => {
          items.map(i => {
            let collectionId = false;
            cheapestItems.map(chObject => {
              if (chObject.item.id == i.id) {
                collectionId = chObject.id;
              }
            });
            if (collectionId) {
              cheapestPrices[collectionId] = {
                price: parseFloat(i.variants[0].price),
                compare_at_price:
                  parseFloat(i.variants[0].compare_at_price) || 0,
              };
            }
          });
          console.log('cheapestPrices', cheapestPrices);
        });
    })
    .then(() => {
      // adjust prices based on customizer info
      xmlProducts.rss.channel.item = xmlProducts.rss.channel.item.map(item => {
        let price = parseFloat(item['g:price']);
        (salePrice = parseFloat(item['g:sale_price'])),
          (customizerPrice = 0),
          (customizerCAP = 0),
          (variantSku = item['g:id']);

        item['g:id'] = item['g:id'].slice(0, 50);

        customizerInfo.map(edge => {
          if (edge.node.sku == variantSku) {
            item['g:id'] = `shopify_US_${edge.node.product.id
              .split('/')
              .pop()}_${edge.node.id.split('/').pop()}`;
          }

          let customizerData = {
            options: [],
            variantAttributes: {},
          };

          if (
            edge.node.sku == variantSku &&
            edge.node.product.metafields.edges.length
          ) {
            edge.node.product.metafields.edges.map(metafieldEdge => {
              customizerData[metafieldEdge.node.key] = JSON.parse(
                metafieldEdge.node.value
              );
            });

            customizerData.options.map(option => {
              let optionPrice = 0,
                optionCAP = 0,
                multiplier = 0;
              try {
                optionPrice = cheapestPrices[option.values_source].price;
              } catch (err) {}
              try {
                optionCAP =
                  cheapestPrices[option.values_source].compare_at_price;
              } catch (err) {}
              try {
                multiplier = parseInt(
                  customizerData.variantAttributes[
                    edge.node.id.split('/').pop()
                  ][option.pricing_attribute] || 0
                );
              } catch (err) {}
              //console.log(optionPrice, optionCAP, multiplier);
              customizerPrice += optionPrice * multiplier;
              customizerCAP += optionCAP * multiplier;
            });
          }
        });

        if (salePrice) {
          price += customizerCAP;
          salePrice += customizerPrice;
          item['g:sale_price'] = `${parseFloat(salePrice).toFixed(2)} USD`;
        } else {
          price += customizerPrice;
        }
        item['g:price'] = `${parseFloat(price).toFixed(2)} USD`;

        return item;
      });

      let fbProducts = JSON.parse(JSON.stringify(xmlProducts));
      fbProducts.rss.channel.item = fbProducts.rss.channel.item.map(i => {
        if (i['g:id'].indexOf('shopify_US') > -1) {
          let gid = i['g:id'].split('_');
          i['g:id'] = gid[3];
          i['g:item_group_id'] = gid[2];
        }
        return i;
      });

      return fsPromises
        .writeFile(
          path.resolve('.', './assets/catalog1.xml'),
          j2xParser.parse(xmlProducts)
        )
        .then(() => {
          return fsPromises.writeFile(
            path.resolve('.', './assets/catalog_facebook.xml'),
            j2xParser.parse(fbProducts)
          );
        })
        .catch(err => {
          console.log(err);
        });
    })
    .catch(err => console.log(err));
};

module.exports = Job;
