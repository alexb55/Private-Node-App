const path = require('path');

const journey = require(path.resolve('.', './server/utils/journey'));

const moment = require('moment');

const { cmApiClient, cmConfig } = require(path.resolve('.', './middleware/cm'));
const cmListIds = cmConfig.cmListIds;
const { shopifyClient } = require(path.resolve('.', './middleware/shopify'));

module.exports = {
  test: (req, res) => {
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
  },

  add: (req, res) => {
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
  },

  updateSegments: (req, res) => {
    const { segment, email } = req.body;

    let subscriberInfo = {
      EmailAddress: email,
      CustomFields: segment.map(s => {
        return { Key: 'Interest', Value: s };
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
  },
};
