var express = require('express');
var router = express.Router();
const path = require('path');

/*
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});
*/

const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const journey = require(path.resolve('.', './server/utils/journey'));

const cmConfig = require(path.resolve('.', './config/cm.json'));
var createsend = require('createsend-node');
var cmApiClient = new createsend(cmConfig);
const cmListIds = cmConfig.cmListIds;

const moment = require('moment');

const shopifyClient = require(path.resolve('.', './middleware/shopify'));

router.get('/subscriber/test', (req, res) => {
  cmApiClient.subscribers
    .getSubscriberDetails(
      cmListIds['workflows'],
      'XXXXXXXXXXXXX'
    )
    .catch(err => {
      res.send(err);
    })
    .then(json => {
      res.send(JSON.stringify(json));
    });
});

router.post('/subscriber/add', (req, res) => {
  const subscriber = req.body.subscriber;
  const __gaUserId = req.body.__gaUserId;

  let subscriberInfo = {
    EmailAddress: subscriber,
    CustomFields: [{ Key: 'XXXXXXXXXXXXXXXX', Value: 'XXXXXXXXXXXXX' }],
    Resubscribe: true,
    RestartSubscriptionBasedAutoresponders: true,
  };
  let redirectUrl = '/pages/XXXXXXXXXXXXXX';

  let shopifyCustomer = {};

  cmApiClient.subscribers
    .getSubscriberDetails(cmListIds['workflows'], subscriber)
    .catch(err => {
      return Promise.resolve({});
    })
    .then(json => {
      if (json.State && json.State == 'Active') {
        redirectUrl = '/pages/XXXXXXXXXXXXXXXX';
        return Promise.reject();
      }
      if (json.CustomFields) {
        subscriberInfo.CustomFields = [
          ...json.CustomFields,
          ...subscriberInfo.CustomFields,
        ];
      }
      return Promise.resolve();
    })
    .then(() => {
      return cmApiClient.subscribers.addSubscriber(
        cmListIds['workflows'],
        subscriberInfo
      );
    })
    .then(() => {
      return cmApiClient.subscribers.addSubscriber(
        cmListIds['nl'],
        subscriberInfo
      );
    })
    .then(() => {
      return journey.updateCustomer({
        email: subscriber,
        lead_source: 'Newsletter',
        utma_user_id: __gaUserId,
      });
    })
    .catch(err => {
      console.error(err);
      return Promise.resolve({});
    })
    .then(json => {
      res.send(JSON.stringify({ url: redirectUrl }));
    });
});

router.post('/subscriber/updateSegments', (req, res) => {
  const { segment, email } = req.body;

  let subscriberInfo = {
    EmailAddress: email,
    CustomFields: segment.map(s => {
      return { Key: 'XXXXXXXXXXXXX', Value: s };
    }),
    Resubscribe: true,
    RestartSubscriptionBasedAutoresponders: true,
  };

  cmApiClient.subscribers
    .getSubscriberDetails(cmListIds['workflows'], email)
    .catch(err => {
      return Promise.resolve({});
    })
    .then(json => {
      if (json.CustomFields) {
        subscriberInfo.CustomFields = [
          ...json.CustomFields,
          ...subscriberInfo.CustomFields,
        ];
      }
      return Promise.resolve();
    })
    .then(() => {
      return cmApiClient.subscribers.addSubscriber(
        cmListIds['workflows'],
        subscriberInfo
      );
    })
    .then(() => {
      res.send(JSON.stringify({ success: 'true' }));
    });
});

module.exports = router;
