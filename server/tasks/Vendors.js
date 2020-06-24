require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');

const moment = require('moment');

const { cmApiClient, cmConfig } = require(path.resolve('.', './middleware/cm'));
const cmListIds = cmConfig.cmListIds;
const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));

// NOT NEEDED, see server/routes/vendor/index.js
const Job = () => {
  let vendorsDetails = [];

  let offset = new moment();
  offset = offset.subtract(60, 'minutes');
  let calculatedOffset = offset.format();
  //console.log(calculatedOffset);

  shopifyClient.metafield
    .list({ namespace: 'XXXXX', key: 'XXXXXX' })
    .then(metafields => {
      if (metafields.length) {
        vendorsDetails = JSON.parse(metafields[0].value);
      }
      //console.log(vendorsDetails);
      return shopifyClient.order.list({ created_at_min: calculatedOffset });
    })
    .then(orders => {
      let vendorEmailsData = {};
      orders.map(order => {
        //console.log(order);
        let s = order.shipping_address;
        let shippingAddressFormatted = `
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
        order.line_items.map(item => {
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
      });

      return Object.keys(vendorEmailsData).reduce((promise, key) => {
        return promise
          .then(() => {
            let emailInfo = vendorEmailsData[key];
            let ids = emailInfo.items.map(i => i.product_id);
            return shopifyClient.product.list({ ids: ids.join(',') });
          })
          .then(products => {
            //console.log('sending email:');
            let emailInfo = vendorEmailsData[key];
            //console.log(emailInfo);
            let vendorDetails = vendorsDetails.filter(
              info => info.title == emailInfo.vendor
            );
            if (vendorDetails.length) {
              vendorDetails = vendorDetails[0];
            }
            if (vendorDetails.enabled == '1') {
              // todo: MOVE TO template
              let itemsHtml = `<table style="width:100%;" cellspacing="0" cellpadding="0" border="0"><tbody>`;
              emailInfo.items.map(i => {
                let product = { handle: '', images: [{ src: '' }] };
                let productF = products.filter(p => p.id == i.product_id);
                if (productF) {
                  product = productF[0];
                }
                itemsHtml += `
                  <tr>
                    <td style="width:100px;padding:15px 0;border-bottom:0px solid #c7c7c0;vertical-align:top;">
                                <a href="XXXXXXXXXXXXXXXXXXXXXXX${
                                  product.handle
                                }" target="_blank">
                            <img style="border:1px solid #eeeeec;" src="${product.image.src.replace(
                              /\.(?=[^.]*$)/,
                              '_96x.'
                            )}">
                        </a>
                            </td>
                    <td style="padding:15px;line-height:18px;border-bottom:0px solid #c7c7c0;font-size:13px;color:#51514e;" valign="top" align="left">
                        <strong style="font-size:17px;">${i.title}</strong>
                                <div style="margin-top:6px;"><strong>SKU:</strong> ${
                                  i.sku
                                }</div>
                        <div style="margin-top:6px;"><strong>QTY:</strong> ${
                          i.quantity
                        }</div>
                    </td>
                  </tr>
                `;
              });
              itemsHtml += `</tbody></table>`;
              return cmApiClient.transactional.sendSmartEmail({
                smartEmailID: 'XXXXXXXXXXXXXXXXXXXXXXXXX',
                To: vendorDetails.email,
                Data: {
                  order_id: emailInfo.order_id,
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
    });
};

module.exports = Job;
