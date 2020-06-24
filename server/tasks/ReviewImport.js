require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const rp = require('request-promise');

const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));

const knex = require(path.resolve('.', './middleware/knex'));

const Job = () => {
  let reviews = [];
  let key = 0;

  knex.schema
    .dropTableIfExists('review')
    .then(r => {
      return knex.schema.createTable('review', table => {
        table.increments();
        table.timestamp('created_at');
        table.string('product_id');
        table.string('title');
        table.string('handle');
        table.string('rating');
        table.string('summary');
        table.string('review');
        table.string('photo');
        table.string('name');
        table.string('city');
        table.string('state');
        table.string('order_number');
        table.boolean('enabled_on_home').defaultTo(false);
      });
    })
    .then(r => {
      return rp('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    })
    .then(response => {
      reviews = JSON.parse(response);
      console.log('review count: ' + reviews.length);

      //reviews = reviews.slice(0, 10);

      return reviews.reduce((promise, review) => {
        return promise
          .then(() => {
            console.log('Importing: ' + review.title);
            key++;
            return shopifyClient.product.list({
              title: review.title,
            });
          })
          .catch(err =>
            console.log(
              'ERROR:',
              err.data ? err.data.Elements[0].ValidationErrors : err
            )
          )
          .then(response => {
            if (response) {
              let searchresult = response.filter(
                r => (r.title = review.title)
              )[0];
              if (searchresult) {
                review.product_id = searchresult.id.toString();
                review.handle = searchresult.handle;
              }
            }
            return knex('review').insert(review);
          });
      }, Promise.resolve([]));
    })
    .catch(err => {
      console.log(err);
    })
    .then(() => knex.destroy());
};

module.exports = Job;
