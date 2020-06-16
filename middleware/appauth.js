const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');

const shopifyClient = require(path.resolve('.', './middleware/shopify'));

class RouterConfig {

 constructor(params) {

   //explicitly set everything
   this.router = params.router;
   this.title = params.title;
   this.path = params.path;
   this.apiKey = params.apiKey;
   this.apiSecret = params.apiSecret;
   this.scopes = params.scopes;
   this.redirectUri = 'XXXXXXXXXXXXXXXXXXXXX';

   this.initHome();
   this.initAuth();
   this.initCallback();
 }

 initHome() {
   this.router.get('/', (req, res) => {
     const shop = req.query.shop;
     const accessToken = cookie.parse(req.headers.cookie || '')[`${this.path}AccessToken`];
     if (shop && accessToken) {
       res.render('app', {
         title: this.title,
         apiKey: this.apiKey,
         shop,
         asset: this.path,
       });
     } else {
       res.redirect(`/app/${this.path}/auth?shop=${shop}`);
     }
   });
 }

 initAuth() {
   this.router.get('/auth', (req, res) => {
     const shop = req.query.shop;
     const accessToken = cookie.parse(req.headers.cookie || '')[`${this.path}AccessToken`];
     if (shop && accessToken) {
       return res.redirect(`/app/${this.path}/?shop=${shop}`);
     }
     if (shop) {
       const state = nonce();
       const installUrl =
         '/oauth/authorize?client_id=' +
         this.apiKey +
         '&scope=' +
         this.scopes +
         '&state=' +
         state +
         '&redirect_uri=' +
         this.redirectUri;

       res.cookie(`${this.path}State`, state, {
         sameSite: 'none',
         secure: true,
       });
       res.render('auth', {
         title: this.title,
         apiKey: this.apiKey,
         installUrl,
         shop,
       });
     } else {
       return res
         .status(400)
         .send(
           'Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request'
         );
     }
   });
 }

 initCallback() {
   this.router.get('/callback', (req, res) => {
     const { shop, hmac, code, state } = req.query;
     const stateCookie = cookie.parse(req.headers.cookie)[`${this.path}State`];

     if (state !== stateCookie) {
       return res.status(403).send('Request origin cannot be verified');
     }

     if (shop && hmac && code) {
       // DONE: Validate request is from Shopify
       const map = Object.assign({}, req.query);
       delete map['signature'];
       delete map['hmac'];
       const message = querystring.stringify(map);
       const providedHmac = Buffer.from(hmac, 'utf-8');
       const generatedHash = Buffer.from(
         crypto
           .createHmac('sha256', apiSecret)
           .update(message)
           .digest('hex'),
         'utf-8'
       );
       let hashEquals = false;

       try {
         hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac);
       } catch (e) {
         hashEquals = false;
       }

       if (!hashEquals) {
         return res.status(400).send('HMAC validation failed');
       }

       // DONE: Exchange temporary code for a permanent access token
       const accessTokenRequestUrl =
         'https://' + shop + '/admin/oauth/access_token';
       const accessTokenPayload = {
         client_id: apiKey,
         client_secret: apiSecret,
         code,
       };

       request
         .post(accessTokenRequestUrl, { json: accessTokenPayload })
         .then(accessTokenResponse => {
           const accessToken = accessTokenResponse.access_token;
           res.cookie(`${this.path}AccessToken`, accessToken, {
             sameSite: 'none',
             secure: true,
           });
           res.redirect(`/app/${this.path}/?shop=${shop}`);
         })
         .catch(error => {
           res.status(error.statusCode).send(error.error.error_description);
         });
     } else {
       res.status(400).send('Required parameters missing');
     }
   });
 }

 getRouter() {
   return this.router;
 }

}

module.exports = RouterConfig;
