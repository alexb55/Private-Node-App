require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');

const moment = require('moment');

const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));
const { xeroClient } = require(path.resolve('.', './middleware/xero'));

let offset = new moment();
offset = offset.subtract(15, 'minutes');
let calculatedOffset = offset.format();
//console.log(calculatedOffset);

//run each hour
//NOT USED, see /server/routes/xero/index.js
const Job = () => {
  shopifyClient.order
    .list({ created_at_min: calculatedOffset })
    .then(orders => {
      return orders.reduce((promise, order) => {
        return promise
          .then(() => {
            console.log('Start import order ' + order.id);

            if (!order.customer) {
              return Promise.reject('No customer, skipping.');
            }
            let customer = order.customer;

            let invoiceConfig = {
              Type: 'ACCREC',
              Contact: {
                Name: `${customer.first_name} ${customer.last_name}`,
              },
              Date: order.created_at.split('T')[0],
              DueDate: order.created_at.split('T')[0],
              InvoiceNumber: 'INV-' + order.name.replace('#', ''),
            };

            //todo: set account code based on payment method
            let accountCode = XXX;

            let hasTax = false;
            //todo: description - include customizer items
            invoiceConfig.LineItems = order.line_items.map(item => {
              hasTax = item.tax_lines.length > 0;
              return {
                Description: `${item.title}${os.EOL}SKU: ${item.sku}`,
                Quantity: item.quantity,
                UnitAmount: item.price,
                AccountCode: accountCode,
                TaxType: hasTax ? 'OUTPUT' : 'NONE',
                TaxAmount: item.tax_lines.reduce((prev, curr, i, arr) => {
                  return prev + parseFloat(curr.price);
                }, 0),
                DiscountRate: item.total_discount
                  ? (item.total_discount / item.price * 100).toFixed(2)
                  : 0,
              };
            });

            if (order.shipping_lines.length) {
              const shippingPrice = order.shipping_lines.reduce(
                (prev, curr, i, arr) => {
                  return prev + parseFloat(curr.price);
                },
                0
              );
              invoiceConfig.LineItems.push({
                Description: `Shipping & Handling`,
                Quantity: 1,
                UnitAmount: shippingPrice,
                LineAmount: shippingPrice,
              });
            }

            return xeroClient.core.invoices.newInvoice(invoiceConfig).save();
          })
          .catch(err =>
            console.log(
              'ERROR:',
              err.data ? err.data.Elements[0].ValidationErrors : err
            )
          );
      }, Promise.resolve([]));
    })
    .catch(err => {
      console.error(err);
    })
    .then(result => {
      console.log('Transfer done.');
      console.log('Start transfer refunds.');
      return shopifyClient.order.list({ updated_at_min: calculatedOffset });
    })
    .then(orders => {
      let creditMemos = orders.reduce((totalMemos, order) => {
        if (order.refunds) {
          let refunds = order.refunds
            .filter(refund => offset.isBefore(refund.created_at))
            .map(refund => {
              refund.order_details = { ...order };
              return refund;
            });
          totalMemos = totalMemos.concat(refunds);
        }
        return totalMemos;
      }, []);

      return creditMemos.reduce((promise, creditMemo) => {
        return promise
          .then(() => {
            if (!creditMemo.order_details.customer) {
              return Promise.reject('No CM customer, skipping.');
            }

            let customer = creditMemo.order_details.customer;
            let cnConfig = {
              Type: 'ACCPAYCREDIT',
              Contact: {
                Name: `${customer.first_name} ${customer.last_name}`,
              },
              Date: creditMemo.order_details.created_at.split('T')[0],
            };
            if (creditMemo.refund_line_items.length) {
              //todo: set account code based on payment method
              let accountCode = XXX;
              cnConfig.LineItems = creditMemo.refund_line_items.map(cnItem => {
                let item = cnItem.line_item;
                hasTax = item.tax_lines.length > 0;
                return {
                  Description: `${item.title}${os.EOL}SKU: ${item.sku}`,
                  Quantity: item.quantity,
                  UnitAmount: item.price,
                  AccountCode: accountCode,
                  TaxType: hasTax ? 'OUTPUT' : 'NONE',
                  TaxAmount: item.tax_lines.reduce((prev, curr, i, arr) => {
                    return prev + parseFloat(curr.price);
                  }, 0),
                  DiscountRate: item.total_discount
                    ? (item.total_discount / item.price * 100).toFixed(2)
                    : 0,
                };
              });
            }
            return xeroClient.core.creditNotes.newCreditNote(cnConfig).save();
          })
          .catch(err =>
            console.log(
              'ERROR:',
              err.data ? err.data.Elements[0].ValidationErrors : err
            )
          );
      }, Promise.resolve([]));
    })
    .then(result => {
      console.log('Transfer CM done.');
      //console.log(result);
    });
};

module.exports = Job;
