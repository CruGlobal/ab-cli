![Tests](https://github.com/CruGlobal/ab-cli/actions/workflows/test-install.yml/badge.svg)

A command line helper for our AppBuilder development.

# Installation

```sh
$ sudo npm install -g CruGlobal/ab-cli
```

# Updating

To update to the latest version:

```sh
$ sudo npm update -g CruGlobal/ab-cli
```

Or reinstall to ensure you have the latest:

```sh
$ sudo npm install -g CruGlobal/ab-cli@latest
```

# Usage

## Development Install (local machine)

```sh
$ appbuilder install [target_directory] --develop --V1
```

See https://CruGlobal.github.io/appbuilder_docs/develop/setup/Setup.html

## Production Install

```sh
$ appbuilder prod2021 [target_directory]
```

See also https://github.com/CruGlobal/ab-production-stack
