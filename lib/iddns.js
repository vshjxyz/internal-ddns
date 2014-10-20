var logger = require('./logger')
    ,ip = require('ip')
    ,net = require('net')
    ,storage = require('./storage')
    ,PORT = 10822
    ,TIMEOUT = 250
    ,HANDSHAKE = '34ed5f6gthy798u0j9iko0t'
    ;

function IDdns(opts) {
  this.currentInterval = null;
};

IDdns.prototype.run = function(every) {
  var every = every || 5 * 1000;
  this.listen();
  this.discover();
  // this.currentInterval = setInterval(this.discover, every);
};

IDdns.prototype.listen = function() {
  var server = net.Server();
  server.on('connection', function(clientSocket) {
    clientSocket.on('data', function (data) {
      if (data.toString() === HANDSHAKE) {
        clientSocket.end(HANDSHAKE);
      } else {
        clientSocket.end();
      }
    });
  });
  server.listen(PORT);
  logger.info('server started listening');
};

IDdns.prototype.discover = function() {
  var currentIp = ip.address()
     ,subNet = currentIp.match(/(\d+\.\d+\.\d+\.)\d+/)[1]
     ;
  storage.models.Host.destroy().then(function() {
      for (var i = 1; i < 255; i++) {
        this.handshake(subNet + i);
      }
  }.bind(this));
};

IDdns.prototype.handshake = function(host) {
  var socket = net.Socket();

  (function (host, socket) {
    socket.setTimeout(TIMEOUT);

    socket.on('connect', function () {
        socket.write(HANDSHAKE);
    });

    socket.on('data', function(data) {
      if(data.toString() === HANDSHAKE) {
          storage.models.Host.create({
              ip: host
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

IDdns.prototype.list = function() {
  storage.models.Host.findAll().then(function(hosts) {
     hosts.forEach(function(host) {
         console.log(host.ip);
     });
  });
};


exports = module.exports = new IDdns;
