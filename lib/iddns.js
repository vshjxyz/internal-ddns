var logger = require('./logger')
  , ip = require('ip')
  , net = require('net')
  , q = require('q')
  , os = require('os')
  , storage = require('./storage')
  , colors = require('colors')
  , spawn = require('child_process').spawn
  , conf = require('../conf/default')
;

function Iddns(opts) {
  this.currentInterval = null;
  this.cleanupInterval = null;
};

Iddns.prototype.run = function(every) {
  var that = this
    , every = every || conf.DISCOVER_TIME
    , everyClean = everyClean || conf.CLEANUP_TIME
    ;

  this.listen();
  this.currentInterval = setInterval(function() {
    that.discover();
  }, every);
  this.cleanupInterval = setInterval(function() {
    that.cleanup();
  }, everyClean);
};

Iddns.prototype.listen = function() {
  var that = this
    , server = net.Server()
    ;

  server.on('connection', function(clientSocket) {
    clientSocket.on('data', function (data) {
      data = that._parseData(data);
      if (data.handshake === conf.HANDSHAKE) {
        switch (data.action) {
          case conf.ACTIONS.DISCOVER:
            clientSocket.end(JSON.stringify({
              handshake: conf.HANDSHAKE
            , hostname: os.hostname()
            }));
            break;
          case conf.ACTIONS.EXECUTE:
            logger.info('Executing command ' + data.command + ' ' + data.args.join(' '));
            var child = spawn(data.command, data.args)
              , sendOutput = function (output) {
                  if (clientSocket.writable) {
                    clientSocket.write(JSON.stringify({
                      handshake: conf.HANDSHAKE
                    , hostname: os.hostname()
                    , output: output.toString()
                    }));
                  }
                }
              ;

            child.stderr.on('data', sendOutput);
            child.stdout.on('data', sendOutput);
            child.on('error', function (error) {
              sendOutput(error);
              clientSocket.end();
            });
            child.on('exit', function (code) {
              clientSocket.end();
            });
            break;
        }
      } else {
        clientSocket.end();
      }
    });
  });
  server.listen(conf.PORT);
  logger.info('server started listening on port ' + conf.PORT);
};

Iddns.prototype.discover = function() {
  var currentIp = ip.address()
    , subNet = currentIp.match(/(\d+\.\d+\.\d+\.)\d+/)[1]
    ;

    for (var i = 1; i < 255; i++) {
      this.handshake(subNet + i);
    }
};

Iddns.prototype.handshake = function(host) {
  var that = this
    , socket = net.Socket()
    ;

  (function (host, socket) {
    socket.setTimeout(conf.TIMEOUT);

    socket.on('connect', function () {
      socket.write(JSON.stringify({
        handshake: conf.HANDSHAKE
      , action: conf.ACTIONS.DISCOVER
      }));
    });

    socket.on('data', function(data) {
      data = that._parseData(data);
      if(data.handshake === conf.HANDSHAKE) {
        logger.info('Host found: ' + data.hostname + '(' + host + ')');
        storage.models.Host.findOrCreate({ where: { ip: host }, defaults: {
            ip: host
          , hostname: data.hostname
        }}).spread(function(host, created) {
          if (!created) {
            host.last_discover = new Date().getTime();
            host.save();
          }
        });
      }
      socket.end();
    });

    socket.on('error', function(exception) {
      socket.destroy();
    });

    socket.connect({port: conf.PORT, host: host});

  })(host, socket);
};

Iddns.prototype.cleanup = function() {
  var that = this
      from = new Date()
    ;
    from = from.setMinutes(from.getMinutes() - 5).getTime();
    storage.models.Host.findAll({ last_discover: { lte: from } }).then(function(hosts) {
      hosts.forEach(function(host) {
        logger.warn('Cleaning host: ' + host.hostname + '(' + host.ip + ')');
        host.destroy();
      });
    });
};

Iddns.prototype.printList = function() {
  return this.list().then(function(hosts) {
    for (var i = 0; i < hosts.length; i++) {
      console.log(hosts[i].hostname + ' -> ' + hosts[i].ip + ' - last discovered at ' + new Date(hosts[i].last_discover));
    }
    if (!hosts.length) {
      console.log('No hosts have been discovered yet');
    }
  });
};

Iddns.prototype.execute = function(fullCommand, hosts) {
  var that = this
    , hosts = hosts || []
    ;

  return storage.models.Host.findAll({ip: {in: hosts}}).then(function(hosts) {
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i]
        , socket = net.Socket()
        , args = []
        ;

      (function(socket, host) {
        args = fullCommand.split(' ');
        command = args[0];
        args.shift();
        socket.on('connect', function () {
          if (!socket.errorEmitted) {
            socket.write(JSON.stringify({
              handshake: conf.HANDSHAKE
            , action: conf.ACTIONS.EXECUTE
            , command: command
            , args: args
            }));
          }
        });
        socket.on('data', function(data) {
          data = that._parseData(data);
          if (data.handshake === conf.HANDSHAKE) {
            console.log((host.hostname + '> ').cyan + data.output.substring(0, data.output.length - 1));
          }
        });
        socket.on('end', function(exception) {
            socket.end();
        });

        socket.on('error', function(exception) {
          logger.error(exception.stack.substring(0, exception.stack.length - 1));
          socket.destroy();
        });

        socket.connect({port: conf.PORT, host: host.ip});
      })(socket, host);

      logger.info('Socket open on ' + host.hostname + '(' + host.ip + ') - command: "' + fullCommand + '"');
    }
  });
};

Iddns.prototype._parseData = function(data) {
  try {
    data = JSON.parse(data.toString());
  } catch (err) {
    data = { output: err };
  }
  return data;
}

Iddns.prototype.list = function() {
  return storage.models.Host.findAll();
};

exports = module.exports = new Iddns;
