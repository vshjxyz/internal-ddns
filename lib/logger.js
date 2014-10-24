var winston = require('winston')
  , conf = require('../conf/default')
  ;

exports = module.exports = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true
    }),
    new (winston.transports.File)({
      filename: conf.LOGS
    })
  ]
});
