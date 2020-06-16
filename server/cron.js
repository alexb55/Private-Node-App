require('isomorphic-fetch');
var cron = require('node-cron');

let tasks = [
  {
    schedule: '0 */12 * * *',
    name: 'GAsync',
  },
  {
    schedule: '5 */6 * * *',
    name: 'Streak',
  },
  {
    schedule: '0 1 * * *',
    name: 'GatherUp',
  },
  /*
  {
    schedule: '5 1 * * *',
    name: 'Mattress',
  },
  */
  {
    schedule: '0 2 * * *',
    name: 'LoyaltyProgram',
  },
  {
    schedule: '10 2 * * *',
    name: 'OrderCheckin',
  },
  {
    schedule: '20 2 * * *',
    name: 'Feedfix',
  },
  {
    schedule: '30 2 * * *',
    name: 'SyncSwapImages',
  },
];

tasks.map(task =>
  cron.schedule(task.schedule, require(`./tasks/${task.name}.js`))
);
