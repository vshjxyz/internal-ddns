var Sequelize = require('sequelize')
    ,database = new Sequelize('database', null, null, {
        dialect: 'sqlite',
        storage: 'database.sqlite'
    })
   ;

var Host = database.define('Host', {
    ip: Sequelize.STRING
});

module.exports = {
    db: database,
    models: {
        Host: Host
    }
};
