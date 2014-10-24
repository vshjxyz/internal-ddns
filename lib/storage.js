var conf = require('../conf/default')
  , Sequelize = require('sequelize')
  , database = new Sequelize('database', null, null, {
        dialect: 'sqlite'
      , storage: conf.DB
      , logging: false
  })
 ;

var Host = database.define('Host', {
    ip: Sequelize.STRING
  , hostname: Sequelize.STRING
  , last_discover: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
});

module.exports = {
    db: database
  , models: {
      Host: Host
  }
};
