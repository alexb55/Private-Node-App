var express = require('express');
var router = express.Router();
const path = require('path');

const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const moment = require('moment');

const cmApiClient = require(path.resolve('.', './middleware/cm'));

router.get('/list', (req, res) => {
  const knex = require(path.resolve('.', './middleware/knex'));

  knex('review')
    .orderBy('id', 'desc')
    .then(items => {
      res.send(JSON.stringify(items));
    });
});

router.post('/add', (req, res) => {
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
});

router.post('/toggleHome', (req, res) => {
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
});

router.post('/update', (req, res) => {
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
});

module.exports = router;
