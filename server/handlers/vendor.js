const rp = require('request-promise');
const fs = require('fs');
const ejs = require('ejs');

const { cmApiClient, cmConfig } = require(path.resolve('.', './middleware/cm'));
const cmListIds = cmConfig.cmListIds;
const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));

module.exports = {

  list: (req, res) => {
    fetch(`XXXXXXXXXXXXXXXX`, {})
      .then(response => response.text())
      .then(response => res.send(JSON.stringify(response.split(';'))))
      .catch(error => {
        console.log(error);
        //hardcode if not available
        //res.send('[]');
        res.send(
          '[XXXXXXXX]'
        );
      });
  },

  placeorder: (req, res) => {
    let order = { ...req.body };

    console.log(`Place order XXXXX notification ${order.name}`);

    let vendorsDetails = [];

    shopifyClient.metafield
      .list({ namespace: 'XXXXXXXX', key: 'XXXXXXXXXXX' })
      .then(metafields => {
        if (metafields.length) {
          vendorsDetails = JSON.parse(metafields[0].value);
        }
        return Promise.resolve();
      })
      .then(ordertest => {
        //console.log(ordertest);
        //order = ordertest[0];
        let vendorEmailsData = {};
        let s = order.shipping_address;
        let shippingAddressFormatted = ``;
        if (s) {
          shippingAddressFormatted = `
            ${s.first_name} ${s.last_name}
            <br/>
            ${s.address1}
            <br/>
            ${s.address2}
            <br/>
            ${s.city}, ${s.province}, ${s.zip}
            <br/>
            ${s.country}
            <br/>
            T: ${s.phone}
          `;
        }
        order.line_items.map(item => {
          if (
            parseFloat(item.price) >= 5 ||
            item.sku.toLowerCase().indexOf('sample') == -1
          ) {
            return;
          }
          let key = `${order.id}${item.vendor}`;
          if (!vendorEmailsData[key]) {
            vendorEmailsData[key] = {
              order_id: order.name,
              address: shippingAddressFormatted,
              vendor: item.vendor,
              items: [],
            };
          }
          vendorEmailsData[key]['items'].push(item);
        });

        //console.log(vendorEmailsData);

        return Object.keys(vendorEmailsData).reduce((promise, key) => {
          return promise
            .then(() => {
              let emailInfo = vendorEmailsData[key];
              let ids = emailInfo.items
                .filter(i => i.product_id)
                .map(i => i.product_id);
              return shopifyClient.product.list({ ids: ids.join(',') });
            })
            .catch(err => {
              console.log(`ERROR LOADING PRODUCTS for order ${order.name}`, err);
              return Promise.resolve([]);
            })
            .then(products => {
              console.log('sending email:');
              let emailInfo = vendorEmailsData[key];
              console.log(emailInfo);
              let vendorDetails = vendorsDetails.filter(
                info => info.title == emailInfo.vendor
              );
              if (vendorDetails.length) {
                vendorDetails = vendorDetails[0];
              }
              if (vendorDetails.enabled == '1') {
                let itemsHtml = ejs.render(
                  fs.readFileSync(
                    path.resolve('.', './server/views/email/warehouse_items.ejs'),
                    'utf-8'
                  ),
                  { items: emailInfo.items, products }
                );
                console.log(`sending to: ${vendorDetails.email}`);
                return cmApiClient.transactional.sendSmartEmail({
                  smartEmailID: 'XXXXXXXXXXXXXXXXXx',
                  To: vendorDetails.email,
                  Data: {
                    order_id: emailInfo.order_id,
                    order_data: { increment_id: emailInfo.order_id },
                    order_warehouse_items_html: itemsHtml,
                    customer_info: emailInfo.address,
                  },
                });
              }
            })
            .catch(err => console.log(err));
        }, Promise.resolve([]));
      })
      .catch(err => {
        console.error(err);
      })
      .then(response => {
        res.send(JSON.stringify({ error: '0', message: 'success.' }));
      });
  },

};
