require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const rp = require('request-promise');

var moment = require('moment');

const shopifyClient = require(path.resolve('.', './middleware/shopify'));
const knex = require(path.resolve('.', './middleware/knex'));

const Job = () => {
  knex.schema
    .dropTableIfExists('order_item')
    .then(() => {
      return knex.schema.createTable('order_item', table => {
        table.increments();
        table.string('line_item_id');
        table.timestamp('est_ship_date').defaultTo(knex.fn.now());
      });
    })
    .then(() => knex.destroy());
};

module.exports = Job;
