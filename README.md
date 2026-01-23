# mktimer

Simple script that lets you create / enable systemd timers with a single command

Usage:

`mktimer --name $service_name --exec $program (--calendar $systemd.calendar || --timespan $systemd.timespan)`

Limitations:

- only does systemd --user timers
- no flag to disable running systemctl --enable && systemctl --start on the newly created timer
- I wrote it in node.js

TODO:

- rewrite in go (or maybe rust)
- add support for --system timers
- turn into an actual cli with ls/rm/update commands
