#!/usr/bin/env node

var program = require('commander')
  , inquirer = require("inquirer")
  , _ = require("lodash")
  , iddns = require('../lib/iddns')
  , logger = require('../lib/logger')
  , storage = require('../lib/storage')
  ;

program
    .version('0.1.6')
    .option('-l, --list', 'Lists the registered devices')
    .option('-e, --execute [command]', 'Executes the given command the registered devices')
    .parse(process.argv);

storage.db.sync().then(function() {

    if (program.list) {
      iddns.printList();
    } else if (program.execute) {
      iddns.list().then(function(hosts) {
        hosts = _.map(hosts, function(host) {
          return host.hostname + ' (' + host.ip + ')';
        });

        var question = {
          type: "checkbox"
        , name: "hosts"
        , message: "Where do you want to execute that command?"
        , choices: hosts
        };

        inquirer.prompt([question], function(answers) {
            var hostsIps = _.map(answers.hosts, function(host) {
                var match = host.match(/.+\((.+)\)/);
               return match ? match[1] : null;
            });
            hostsIps = hostsIps.filter(function() { return true; });

            iddns.execute(program.execute, hostsIps);
        });
      });

    } else {
      iddns.run();
    }

});
