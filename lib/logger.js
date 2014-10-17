var winston = require('winston');

exports = module.exports = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true
    }),
    new (winston.transports.File)({
      filename: 'iddns-daemon.log'
    })
  ]
});
