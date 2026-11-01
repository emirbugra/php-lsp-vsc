# PHP LSP (Rust)

A fast PHP language server written in Rust, for VS Code. It indexes large projects (vendor included) in seconds and
works with modern PHP 8.x as well as legacy PHP 4/5 code.

The server lives in [php-lsp-rs](https://github.com/emirbugra/php-lsp-rs); this extension bundles it, so there is
nothing else to install.

## Features

**Navigation**
- Go to definition, type definition, implementation
- Find references, document highlight, rename (classes, methods, functions, properties, constants, variables)
- Call hierarchy and type hierarchy
- Document and workspace symbols

**Editing**
- Completion with type inference (docblocks, `@template` generics, narrowing by `instanceof` / conditions)
- Hover with signatures and docblocks, signature help, parameter name inlay hints
- Code actions: add return type, add parameter / property type, add PHPDoc (PHP-version aware), import class,
  implement missing methods, create method, remove unused import, optimize imports

**Inspections**
- Undefined classes, functions, methods and variables
- Unused imports, missing abstract method implementations, deprecated usages

**Laravel**
- Eloquent: relations, attributes, scopes and query builder methods
- Completion, go to definition and diagnostics for route, view, config and translation names and `.env` keys

**Formatter**
- Built-in formatter with presets: PSR-12, PER-CS 2.0 / 3.0, Laravel, Symfony, PEAR, Zend, CodeIgniter, PhpStorm
  default
- Options use PhpStorm's own names (`phpLsp.format.options`); format document, selection and on type
- Reads the project's PhpStorm code style (`.idea/codeStyles`) and `.editorconfig` (including `ij_php_*` keys)
- Import / export code styles as PhpStorm XML or `.editorconfig`
- Can use the project's Laravel Pint or PHP-CS-Fixer instead (`phpLsp.formatter.tool`)

## Settings

| Setting | Default | |
|---|---|---|
| `phpLsp.indexVendor` | `true` | Index `vendor/` directories |
| `phpLsp.inspections.enabled` | `true` | Undefined symbols, unused imports, … |
| `phpLsp.laravel.diagnostics` | `true` | Unknown route / view / config / translation names |
| `phpLsp.phpVersion` | `""` | Target PHP version for type suggestions (default: from `composer.json` or the installed `php`) |
| `phpLsp.formatter.tool` | `auto` | `auto`, `builtin`, `pint`, `php-cs-fixer` or `off` |
| `phpLsp.format.preset` | `psr12` | Built-in formatter preset |
| `phpLsp.format.options` | `{}` | Overrides for the preset, by PhpStorm option name |
| `phpLsp.format.useProjectCodeStyle` | `true` | Use `.idea/codeStyles` and `.editorconfig` |
| `phpLsp.serverPath` | `""` | Use a different `php-lsp` binary |
| `phpLsp.logLevel` | `info` | Server log level |

VS Code's own basic PHP suggestions are turned off by default (`php.suggest.basic`) to avoid duplicate completions.

## Commands

- **PHP LSP: Show Info Panel** — server status and index statistics
- **PHP LSP: Restart Server**, **PHP LSP: Show Server Log**
- **PHP LSP: Import Code Style…**, **PHP LSP: Export Code Style…**

## Development

```sh
git clone https://github.com/emirbugra/php-lsp-rs
git clone https://github.com/emirbugra/php-lsp-vsc
cd php-lsp-rs && cargo build --release
cd ../php-lsp-vsc && npm install && npm run compile
# press F5 in VS Code
```

The extension looks for the server in this order: `phpLsp.serverPath` → `server/php-lsp` inside the extension →
`../php-lsp-rs/target/{release,debug}/php-lsp` → `php-lsp` on `PATH`.

Releases are built by GitHub Actions (`.github/workflows/release.yml`): one package per platform, each with its own
server binary.

## License

MIT. The bundled server embeds JetBrains [phpstorm-stubs](https://github.com/JetBrains/phpstorm-stubs)
(Apache-2.0); see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
