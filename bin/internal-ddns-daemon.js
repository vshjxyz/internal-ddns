var daemon = require("daemonize2").setup({
    main: "internal-ddns.js",
    name: "internal-ddns",
    pidfile: "../internal-ddns.pid"
});

switch(process.argv[2]) {
  case "start":
    daemon.start();
    break;

  case "stop":
    daemon.stop();
    break;

  default:
    console.log("Usage: [start|stop]");
}
