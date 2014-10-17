var logger = require('./logger');

function IDdns(opts) {
  this.currentInterval = null;
};

IDdns.prototype.run = function(every) {
  var every = every || 5 * 1000;
  this.currentInterval = setInterval(function (argument) {
    logger.info('this should appear every 5 seconds');
  }, every);
};

IDdns.prototype.list = function() {
  logger.warn('some kind of list');
};

exports = module.exports = new IDdns;
