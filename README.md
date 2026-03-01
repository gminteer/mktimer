# timecop

Manage systemd timers in a somewhat less obnoxious way than manually churning out unit files and directly interacting with systemctl (spoiler: you're still interacting with systemctl you're just doing it through a hole in a sheet.)

## Usage

`timecop run|new <command> --on|--every <schedule>` create a timer

`timecop list|ls [filter]` show a list of timers (basically systemctl list-timers with easier to read output)

`timecop remove|rm <timer>` remove a timer

`timecop show <timer>` show timer details (basically systemctl show with syntax highlighting)

## Features

- Timer validation/normalization: it'll fix up relative paths for programs and checks your calendar / monotomic timer with `systemd-analyze`

- Smart enough to figure out if the schedule provided is a calendar or monotomic timer (the timer unit files are >95% identical but it does change a couple of lines)

- Polite enough to not overwrite files without being told to do so

- Syntax highlighting, colors, fancy ANSI boxes

- All the blazing speed and svelteness of a node.js CLI that's pulling in the syntax highlighting engine from vscode as a dependancy

- Most of the important bits have unit tests.

## Limitations

- Can't generate fancy timers with multiple OnCalendar= schedules

- Can't modify timers

- Probably has bugs I haven't noticed yet.

## TODO

- Better README

- Better / more tests

- Support for more timer options

- Better documentation (should probably figure out how to generate a manpage and how to generate command line completions)

- Actually publish the damn thing on npm and figure out how to package it with pkg so you don't have to download 20+MiB of dependancy libraries.
