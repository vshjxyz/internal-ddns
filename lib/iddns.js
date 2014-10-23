var logger = require('./logger')
  , ip = require('ip')
  , net = require('net')
  , q = require('q')
  , os = require('os')
  , storage = require('./storage')
  , spawn = require('child_process').spawn
  , PORT = 10822
  , TIMEOUT = 250
  , HANDSHAKE = '34ed5f6gthy798u0j9iko0t'
  , ACTIONS = {
    DISCOVER: 'discover'
    , EXECUTE: 'exec'
  }
;

function Iddns(opts) {
  this.currentInterval = null;
};

Iddns.prototype.run = function(every) {
  var that = this
    , every = every || 10 * 1000
    ;

  this.listen();
  this.currentInterval = setInterval(function() {
    that.discover();
  }, every);
};

Iddns.prototype.listen = function() {
  var that = this
    , server = net.Server()
    ;

  server.on('connection', function(clientSocket) {
    clientSocket.on('data', function (data) {
      data = that._parseData(data);
      if (data.handshake === HANDSHAKE) {
        switch (data.action) {
          case ACTIONS.DISCOVER:
            clientSocket.end(JSON.stringify({
              handshake: HANDSHAKE
            , hostname: os.hostname()
            }));
            break;
          case ACTIONS.EXECUTE:
            var child = spawn(data.command, data.args)
              , sendOutput = function (output) {
                  clientSocket.write(JSON.stringify({
                    handshake: HANDSHAKE
                  , hostname: os.hostname()
                  , output: output.toString()
                  }));
                }
              ;

            child.stderr.on('data', sendOutput);
            child.stdout.on('data', sendOutput);
            child.stdout.on('end', function () {
              clientSocket.end();
            });
            break;
        }
      } else {
        clientSocket.end();
      }
    });
  });
  server.listen(PORT);
  logger.info('server started listening');
};

Iddns.prototype.discover = function() {
  var currentIp = ip.address()
    , subNet = currentIp.match(/(\d+\.\d+\.\d+\.)\d+/)[1]
    ;

  storage.models.Host.destroy().then(function() {
      for (var i = 1; i < 255; i++) {
        this.handshake(subNet + i);
      }
  }.bind(this));
};

Iddns.prototype.handshake = function(host) {
  var that = this
    , socket = net.Socket()
    ;

  (function (host, socket) {
    socket.setTimeout(TIMEOUT);

    socket.on('connect', function () {
      socket.write(JSON.stringify({
        handshake: HANDSHAKE
      , action: ACTIONS.DISCOVER
      }));
    });

    socket.on('data', function(data) {
      data = that._parseData(data);
      if(data.handshake === HANDSHAKE) {
          storage.models.Host.create({
              ip: host
            , hostname: data.hostname
          });
      }
      socket.end();
    });

    socket.on('error', function(exception) {
      socket.destroy();
    });

    socket.connect({port: PORT, host: host});

  })(host, socket);
};

Iddns.prototype.printList = function() {
  return this.list().then(function(hosts) {
    for (var i = 0; i < hosts.length; i++) {
      console.log(hosts[i].hostname + ' -> ' + hosts[i].ip);
    }
  });
};

Iddns.prototype.execute = function(command) {
  var that = this
    ;

  return this.list().then(function(hosts) {
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i]
        , socket = net.Socket()
        , args = []
        ;

      args = command.split(' ');
      command = args[0];
      args.shift();
      socket.on('connect', function () {
        socket.write(JSON.stringify({
          handshake: HANDSHAKE
        , action: ACTIONS.EXECUTE
        , command: command
        , args: args
        }));
      });
      socket.on('data', function(data) {
        data = that._parseData(data);
        if (data.handshake === HANDSHAKE) {
          console.log(data.output.substring(0, data.output.length - 1));
        }
      });

      socket.connect({port: PORT, host: host.ip});
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
