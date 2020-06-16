var express = require('express');
var router = express.Router();
const path = require('path');

const bodyParser = require('body-parser');
router.use(bodyParser.json({ limit: '50mb' }));
router.use(
  bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000,
  })
);

const journey = require(path.resolve('.', './server/utils/journey'));

const cmConfig = require(path.resolve('.', './config/cm.json'));
var createsend = require('createsend-node');
var cmApiClient = new createsend(cmConfig);
const cmListIds = cmConfig.cmListIds;

router.get('/list', (req, res) => {
  let pageSize = req.query.pageSize,
    page = req.query.page,
    sorted = JSON.parse(req.query.sorted)[0] || {},
    filtered = JSON.parse(req.query.filtered);

  let pages = 1,
    rows = [];

  const knex = require(path.resolve('.', './middleware/knex'));

  let query = knex('journey');

  filtered.map(filter => {
    let v = filter.value;
    // todo: fix when from/to is ""
    if (v.from || v.to) {
      if (v.from) {
        query = query.where(filter.id, '>=', parseInt(v.from));
      }
      if (v.to) {
        query = query.where(filter.id, '<=', parseInt(v.to));
      }
    } else {
      query = query.where(filter.id, 'like', `%${v}%`);
    }
  });
  //console.log(query.toString());
  if (!sorted.id) {
    sorted = {
      id: 'last_order_name',
      desc: true,
    };
  }
  if (sorted.id == 'order_name') {
    sorted.id = 'last_order_name';
  }
  query = query.orderBy(sorted.id, sorted.desc ? 'desc' : 'asc');

  query
    .clone()
    .offset(pageSize * page)
    .limit(pageSize)
    .then(items => {
      rows = items;
      return query
        .clone()
        .count('id as count')
        .first();
    })
    .then(result => {
      pages = Math.ceil(result.count / pageSize);
      res.send(JSON.stringify({ rows, pages }));
    });
});

router.post('/update', (req, res) => {
  const { email, __gaUserId } = req.body;
  journey
    .updateCustomer({
      email,
      utma_user_id: __gaUserId,
    })
    .then(r => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    });
});

router.post('/chat', (req, res) => {
  const { email, __gaUserId } = req.body;
  journey
    .updateCustomer({
      email,
      lead_source: 'Chat',
      utma_user_id: __gaUserId,
    })
    .then(r => {
      let subscriberInfo = {
        EmailAddress: email,
        CustomFields: [{ Key: 'XXXXXXXXXXXXX', Value: 'XXXXXXXXXXXXX' }],
        Resubscribe: true,
        RestartSubscriptionBasedAutoresponders: true,
      };
      return cmApiClient.subscribers
        .addSubscriber(cmListIds['workflows'], subscriberInfo)
        .then(r => {
          return cmApiClient.subscribers.addSubscriber(
            cmListIds['nl'],
            subscriberInfo
          );
        });
    })
    .then(r => {
      res.send(JSON.stringify({ error: '0', message: 'success.' }));
    });
});

module.exports = router;
