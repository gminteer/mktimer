# timecop

An easy to use CLI for systemd timers

Usage:

`timecop run <command> --on <schedule>`
`timecop ls [filter]`

Limitations:

- currently only does systemd --user timers
- doesn't validate the entire execStart command, just checks that argv[0] exists and is executable
- it's written in node

TODO:

- add support for --system timers
- turn into an actual cli with ls/rm/update commands
- better unit testing
- better README
