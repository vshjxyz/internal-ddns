#!/usr/bin/env node

var program = require('commander')
    ,iddns = require('../lib/iddns')
    ,logger = require('../lib/logger')
    ,storage = require('../lib/storage')
    ;

program
    .version('0.1.0')
    .option('-l, --list', 'Lists the registered devices')
    .option('-e, --exec [command]', 'Executes the given command the registered devices')
    .parse(process.argv);

storage.db.sync().then(function() {

    if (program.list) {
      iddns.printList();
    } else if (program.command) {
      iddns.exec(program.command);
    } else {
      iddns.run();
    }

});
