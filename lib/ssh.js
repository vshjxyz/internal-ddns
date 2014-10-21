var logger = require('./logger')
    ,ssh2 = require('ssh2')
    ;

function SshClient(ip, username, password) {
  if (!ip) {
    throw "IP is required to initialize an ssh connection";
  }
  if (!username) {
    throw "Username is required to initialize an ssh connection";
  }
  this.conn = new ssh2();
  this.ip = ip || '';
  this.username = username || '';
  this.password = password || '';
};

SshClient.prototype.exec = function(command) {
  this.conn.on('ready', function() {
    logger.info('Connection :: ready');
    this.conn.exec(command, function(err, stream) {
      if (err) throw err;
      stream.on('exit', function(code, signal) {
        logger.info('Stream :: exit :: code: ' + code + ', signal: ' + signal);
      }).on('close', function() {
        logger.info('Stream :: close');
        this.conn.end();
      }).on('data', function(data) {
        logger.info('STDOUT: ' + data);
      }).stderr.on('data', function(data) {
        logger.info('STDERR: ' + data);
      });
    });
  });

  this.conn.connect({
    host: this.ip
    ,port: 22
    ,username: this.username
    ,password: this.password
    ,debug: console.log
    ,readyTimeout: 99999
  });
  logger.info('Executing "' + command + '" command on host ' + this.ip + ' usr: ' + this.username + ' psw:' + this.password);
};

module.exports = SshClient;
