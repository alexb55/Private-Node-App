const moment = require('moment');

const { cmApiClient, cmConfig } = require(path.resolve('.', './middleware/cm'));
const cmListIds = cmConfig.cmListIds;

module.exports = {

  list: (req, res) => {
    const knex = require(path.resolve('.', './middleware/knex'));

    knex('review')
      .orderBy('id', 'desc')
      .then(items => {
        res.send(JSON.stringify(items));
      });
  },

  add: (req, res) => {
    let review = req.body.review;
    review.created_at = moment().valueOf();
    //console.log(review);

    const knex = require(path.resolve('.', './middleware/knex'));

    knex('review')
      .insert(review)
      .then(() => {
        return cmApiClient.transactional.sendSmartEmail({
          smartEmailID: 'XXXXXXXXXXXXX',
          To: 'XXXXXXXXXX',
          Data: {
            order_number: review.order_number,
            name: review.name,
            title: review.title,
            rating: review.rating,
            summary: review.summary,
            review: review.review,
          },
        });
      })
      .then(() => {
        res.send(JSON.stringify({ error: '0', message: 'success' }));
      });
  },

  toggleHome: (req, res) => {
    const { review } = req.body;
    //console.log(review);

    const knex = require(path.resolve('.', './middleware/knex'));

    knex('review')
      .where({ id: review.id })
      .update({ enabled_on_home: review.enabled_on_home ? false : true })
      .then(() => {
        return knex('review').where({ id: review.id });
      })
      .then(rows => {
        res.send(JSON.stringify(rows.length ? rows[0] : review));
      });
  },

  update: (req, res) => {
    const { review } = req.body;
    //console.log(review);

    const knex = require(path.resolve('.', './middleware/knex'));

    knex('review')
      .where({ id: review.id })
      .update({
        name: review.name,
        city: review.city,
        state: review.state,
        rating: review.rating,
        summary: review.summary,
        review: review.review,
      })
      .then(() => {
        return knex('review').where({ id: review.id });
      })
      .then(rows => {
        res.send(JSON.stringify(rows.length ? rows[0] : review));
      });
  },

};
