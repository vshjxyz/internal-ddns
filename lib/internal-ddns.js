#!/usr/bin/env node

var program = require('commander');
var iddns = require('./iddns');
var logger = require('./logger');
program
  .version('0.1.0')
  .option('-l, --list', 'Lists the registered devices')
  .parse(process.argv);

if (program.list) {
  iddns.list();
  return 0;
}

iddns.run();
