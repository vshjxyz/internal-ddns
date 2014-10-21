var logger = require('./logger')
    ,ip = require('ip')
    ,net = require('net')
    ,q = require('q')
    ,storage = require('./storage')
    ,SshClient = require('./ssh')
    ,PORT = 10822
    ,TIMEOUT = 250
    ,HANDSHAKE = '34ed5f6gthy798u0j9iko0t'
    ;

function IDdns(opts) {
  this.currentInterval = null;
};

IDdns.prototype.run = function(every) {
  var that = this
     ,every = every || 10 * 1000
     ;
  this.listen();
  this.currentInterval = setInterval(function() {
    that.discover();
  }, every);
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

IDdns.prototype.printList = function() {
  return this.list().then(function(ips) {
    for (var i = 0; i < ips.length; i++) {
      console.log(ips[i]);
    }
  });
};

IDdns.prototype.exec = function(command) {
  return this.list().then(function(ips) {
    for (var i = 0; i < ips.length; i++) {
      var ip = ips[i];
      new SshClient(ip, 'telly', 'chewievision').exec(command);
    }
  });
};

IDdns.prototype.list = function() {
  var deferred = q.defer();
  storage.models.Host.findAll().then(function(hosts) {
    var ips = [];
    hosts.forEach(function(host) {
      ips.push(host.ip);
    });
    deferred.resolve(ips);
  });
  return deferred.promise;
};

exports = module.exports = new IDdns;
