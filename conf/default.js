module.exports = {
  PORT: 10822
  , TIMEOUT: 250
  , HANDSHAKE: '34ed5f6gthy798u0j9iko0t'
  , ACTIONS: {
    DISCOVER: 'discover'
    , EXECUTE: 'exec'
  }
  , LOGS: '/tmp/iddns-daemon.log'
  , DB: '/tmp/database.sqlite'
  , DISCOVER_TIME: 10 * 1000
  , CLEANUP_TIME: 120 * 1000
}
