var express = require('express');
var router = express.Router();

const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const fs = require('fs');
const path = require('path');
const os = require('os');
const _ = require('lodash');

const moment = require('moment');

const customizerUtils = require(path.resolve('.', './server/utils/customizer'));

const shopifyClient = require(path.resolve('.', './middleware/shopify'));

const xero = require('xero-node');
const xeroConfig = require(path.resolve('.', './config/xero/config.json'));
if (xeroConfig.privateKeyPath && !xeroConfig.privateKey) {
  xeroConfig.privateKey = fs.readFileSync(
    path.resolve('.', xeroConfig.privateKeyPath)
  );
}
const xeroClient = new xero.PrivateApplication(xeroConfig);

router.get('/test', (req, res) => {
  xeroClient.core.accounts.getAccounts().then(acc => {
    res.send(JSON.stringify(acc));
  });
});

router.post('/placeorder', (req, res) => {
  let order = { ...req.body };

  console.log(`Place order XERO import ${order.name}`);

  if (parseFloat(order.subtotal_price) == 0) {
    res.send(JSON.stringify({ error: '0', message: 'success.' }));
    return this;
  }

  let customerName = '';
  if (order.customer) {
    customerName = `${order.customer.first_name} ${order.customer.last_name}`;
  }

  let invoiceConfig = {
    Type: 'ACCREC',
    Status: 'AUTHORISED',
    Contact: {
      Name: customerName,
    },
    Date: order.created_at.split('T')[0],
    DueDate: order.created_at.split('T')[0],
    InvoiceNumber: 'INV-' + order.name.replace('#', ''),
  };

  let accountCode = XXX;
  if (order.payment_gateway_names && order.payment_gateway_names.length) {
    let gwName = order.payment_gateway_names[0];
    if (gwName.indexOf('shopify') > -1) {
      accountCode = XXX;
    } else if (gwName.indexOf('paypal') > -1) {
      accountCode = XXX;
    }
  }

  invoiceConfig.LineItems = customizerUtils
    .processCustomizerOptions(order.line_items)
    .map(item => {
      let descr = `${item.title}${os.EOL}SKU: ${item.sku}`;
      item.properties.forEach(p => {
        if (p.name.toLowerCase().trim() != 'XXXXXXXXXXX') {
          descr += `${os.EOL}${p.name}: ${p.value}`;
        }
      });
      let itemTax = item.tax_lines.reduce((prev, curr, i, arr) => {
        return prev + parseFloat(curr.price);
      }, 0);
      let hasTax = itemTax > 0;
      let itemDiscount = item.discount_allocations.reduce(
        (prev, curr, i, arr) => {
          return prev + parseFloat(curr.amount);
        },
        0
      );
      return {
        Description: descr,
        Quantity: item.quantity,
        UnitAmount: item.price,
        AccountCode: accountCode,
        TaxType: hasTax ? 'OUTPUT' : 'NONE',
        TaxAmount: parseFloat(itemTax).toFixed(2),
        DiscountRate: itemDiscount
          ? (itemDiscount / (item.price * item.quantity) * 100).toFixed(2)
          : 0,
      };
    });

  if (order.shipping_lines.length) {
    let shippingPrice = order.shipping_lines.reduce((prev, curr, i, arr) => {
      return prev + parseFloat(curr.price);
    }, 0);
    invoiceConfig.LineItems.push({
      Description: `Shipping & Handling${os.EOL}${
        order.shipping_lines[0].title
      }`,
      Quantity: 1,
      UnitAmount: shippingPrice,
      LineAmount: shippingPrice,
      AccountCode: 'XXXXXXX',
      TaxType: 'NONE',
    });
  }

  xeroClient.core.invoices
    .newInvoice(invoiceConfig)
    .save()
    .catch(err =>
      console.error(
        'ERROR XERO IMPORT:',
        err.data ? err.data.Elements[0].ValidationErrors : err
      )
    )
    .then(r => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    });
});

router.post('/createpurchaseorders', (req, res) => {
  let order = { ...req.body };

  console.log(`Place order XERO PO create ${order.name}`);

  if (parseFloat(order.subtotal_price) == 0) {
    res.send(JSON.stringify({ error: '0', message: 'success.' }));
    return this;
  }

  shopifyClient.product
    .list({
      ids: order.line_items
        .filter(li => li.product_id)
        .map(li => li.product_id)
        .join(','),
    })
    .then(shopifyProducts => {
      if (shopifyProducts && shopifyProducts.length) {
        order.line_items = order.line_items.map(li => {
          let product = shopifyProducts.filter(p => p.id == li.product_id);
          if (product.length) {
            li.product_data = product[0];
          }
          return li;
        });
      }
      return shopifyClient.inventoryItem.list({
        ids: order.line_items
          .filter(li => li.variant_id)
          .map(li => {
            if (li.product_data) {
              let variants = li.product_data.variants.filter(
                v => v.id == li.variant_id
              );
              if (variants && variants.length) {
                return variants[0].inventory_item_id;
              }
            }
            return false;
          })
          .filter(id => id)
          .join(','),
      });
    })
    .then(inventory => {
      if (inventory && inventory.length) {
        order.line_items = order.line_items.map(li => {
          let iid = false;
          if (li.product_data) {
            let variants = li.product_data.variants.filter(
              v => v.id == li.variant_id
            );
            if (variants && variants.length) {
              iid = variants[0].inventory_item_id;
            }
          }
          if (iid) {
            let inventoryItem = inventory.filter(inv => inv.id == iid);
            if (inventoryItem && inventoryItem.length) {
              li.inventory_data = inventoryItem[0];
            }
          }
          return li;
        });
      }
      return _.uniq(order.line_items.map(li => li.vendor))
        .reduce((promise, vendor) => {
          return promise.then(() => {
            return xeroClient.core.contacts
              .newContact({
                Name: vendor,
              })
              .save()
              .catch(err =>
                console.error(`ERROR save a contact: ${vendor}, error: `, err)
              );
          });
        }, Promise.resolve())
        .then(r => xeroClient.core.contacts.getContacts());
    })
    .then(xeroContacts => {
      let sContacts = JSON.stringify(xeroContacts);
      //console.log(`Place order XERO PO contacts: ${sContacts}`);
      let groupedItems = {};
      order.line_items.map(li => {
        if (li.vendor && li.product_data) {
          let type = li.product_data.product_type;
          if (type != 'Fabric' && type != 'Legs') {
            type = 'Main';
          }
          if (!groupedItems[type]) {
            groupedItems[type] = {};
          }
          if (!groupedItems[type][li.vendor]) {
            groupedItems[type][li.vendor] = [];
          }
          groupedItems[type][li.vendor].push(li);
        }
      });

      let accountCodes = {
        Fabric: XXX,
        Legs: XXX,
        Main: XXX,
      };

      let poConfigs = [],
        i = 1;
      for (let [type, subItems] of Object.entries(groupedItems)) {
        for (let [vendor, items] of Object.entries(subItems)) {
          let config = {
            Status: 'AUTHORISED',
            Contact: {
              ContactID: xeroContacts.filter(
                c => c.Name.toLowerCase() == vendor.toLowerCase()
              )[0].ContactID,
            },
            Date: order.created_at.split('T')[0],
            PurchaseOrderNumber:
              'PO-' +
              order.name.replace('#', '') +
              '-' +
              (i < 10 ? '0' : '') +
              i,
            Reference: 'INV-' + order.name.replace('#', ''),
          };
          config.LineItems = customizerUtils
            .processCustomizerOptions(items)
            .map(item => {
              let descr = `${item.title}${os.EOL}SKU: ${item.sku}`;
              item.properties.forEach(p => {
                if (p.name.toLowerCase().trim() != 'XXXXXXXXXXX') {
                  descr += `${os.EOL}${p.name}: ${p.value}`;
                }
              });
              return {
                //ItemCode: item.sku,
                Description: descr,
                Quantity: item.quantity,
                UnitAmount: item.inventory_data.cost || 0,
                AccountCode: accountCodes[type],
              };
            });
          poConfigs.push(config);
          i++;
        }
      }
      return poConfigs.reduce((promise, config) => {
        return promise.then(() => {
          return xeroClient.core.purchaseOrders
            .newPurchaseOrder(config)
            .save()
            .catch(err =>
              console.error(
                'ERROR XERO PO IMPORT:',
                err.data ? err.data.Elements[0].ValidationErrors : err
              )
            );
        });
      }, Promise.resolve());
    })
    .then(r => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    });
});

module.exports = router;
