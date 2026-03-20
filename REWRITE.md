# Fixing this mess

## Modernize

Chalk is a builtin in modern node, I don't need that anymore.
  I could also throw out chai and switch over to assert() syntax for tests.
    Counterpoint: I like should() syntax better and that's a dev dependancy and who cares about optimizing size on that?

Migrate to eslint10
  Might be time to throw out whatever eslint plugins don't work
