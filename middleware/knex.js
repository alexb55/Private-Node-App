const path = require('path');

const knex = require('knex')({
  dialect: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: path.resolve('.', './middleware/data.db')
  }
});

module.exports = knex;
