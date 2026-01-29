# timecop

An easy to use CLI for systemd timers

Usage:

`timecop new <service-name> --exec-start <command> (--calendar <systemd-calendar> || --timespan <systemd-timespan> [--no-enable]`

Limitations:

- currently only does systemd --user timers
- doesn't validate the entire execStart command, just checks that argv[0] exists and is executable

TODO:

- add support for --system timers
- turn into an actual cli with ls/rm/update commands
- unit testing
