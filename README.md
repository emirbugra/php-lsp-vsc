# PHP & Laravel IntelliSense

**Fast, lightweight, free and open source PHP support for VS Code — with Laravel, Blade, Symfony and CodeIgniter 4.**

[![Version](https://img.shields.io/visual-studio-marketplace/v/emirbugra.php-lsp-vsc?label=Marketplace&color=b4521c)](https://marketplace.visualstudio.com/items?itemName=emirbugra.php-lsp-vsc)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/emirbugra.php-lsp-vsc?color=b4521c)](https://marketplace.visualstudio.com/items?itemName=emirbugra.php-lsp-vsc)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/emirbugra.php-lsp-vsc?color=b4521c)](https://marketplace.visualstudio.com/items/emirbugra.php-lsp-vsc/reviews)
[![License: MIT](https://img.shields.io/badge/license-MIT-3a4150)](LICENSE)

The code intelligence you expect from a full PHP IDE, inside VS Code, for free. No license key, no premium tier,
no telemetry.

<!-- GIF: completion + hover → media/screenshots/completion.gif
![Completion](media/screenshots/completion.gif)
-->

## ✨ Why this extension?

- ⚡ **Fast** — a Laravel project with its `vendor/` folder (~6,000 files) is indexed in about a second;
  completions and diagnostics update while you type.
- 🪶 **Light on memory** — about 50 MB of RAM for a typical Laravel app, ~100 MB for a 16,000-file project.
- 🎨 **Works with your PhpStorm code style** — reads `.idea/codeStyles` and `.editorconfig` (`ij_php_*`), so a
  team using PhpStorm and VS Code formats code the same way.
- 💸 **Free and open source** — MIT licensed, every feature included.
- 🐘 **Modern and legacy PHP** — PHP 8.4 property hooks and enums, all the way back to PHP 4-style code.
- 📦 **Nothing to install** — the language server is bundled for Windows, macOS and Linux (x64 and ARM).

## 🚀 Features

### 🧭 Navigation
- Go to definition, type definition and implementation
- Find all references, highlight occurrences
- Rename classes, methods, functions, properties, constants and variables across the project
- Call hierarchy and type hierarchy
- Document outline and workspace symbol search

<!-- GIF: go to definition / references / rename → media/screenshots/navigation.gif
![Navigation](media/screenshots/navigation.gif)
-->

### 💡 Smart editing
- Completion that understands types: docblocks, `@template` generics, `instanceof` and condition narrowing
- Hover with signatures and documentation, signature help
- Inlay hints: parameter names and the inferred type of variables (`$user: User`)
- Code lens: reference counts, implementations, subclasses and overrides above declarations
- Quick fixes and refactorings:
  - ➕ Add return type / parameter type / property type (respects your project's PHP version)
  - 📝 Add PHPDoc
  - 📥 Import class, 🧹 remove unused imports, optimize imports
  - 🏗️ Implement missing methods, create method

### 🔍 Inspections
- Undefined classes, functions, methods and variables
- Missing or too many arguments in calls
- Unused imports
- Missing abstract method implementations
- Deprecated usages

### 🟥 Laravel
- **Eloquent**: relations, attributes, scopes and query builder methods are completed and typed
- **Routes, views, config, translations and `.env`**: completion and go to definition inside
  `route('…')`, `view('…')`, `config('…')`, `__('…')`, `env('…')`
- Warnings for route, view, config and translation names that don't exist, with a "Change to…" fix
- Facade aliases (`Route::`, `Str::`, `Form::` …) work without `use`

### 🗡️ Blade
- Completion, go to definition, hover, references and type hints inside `{{ }}`, `{!! !!}`, `@php`,
  directives (`@if`, `@foreach`, …) and component attributes (`:title="$post->title"`)
- Knows the variables each view receives from your controllers (`view('posts.index', compact('posts'))`)
  and their types, so `$post->` completes inside `@foreach ($posts as $post)`
- View names in `@extends`, `@include`, `@component`; unknown routes, views and translations are reported

### 🎼 Symfony
- Route names in `generateUrl()`, `redirectToRoute()`, `$router->generate()`: completion, go to
  definition, "not found" warnings — from `#[Route]` attributes, `@Route` annotations, YAML files and
  Symfony's generated names
- Twig template names in `render()`, `renderView()`, `#[Template]`

### 🔥 CodeIgniter 4
- `view()`, `route_to()`, `lang()`, `config()`, `env()` strings: completion, go to definition, warnings
- Controller handlers in `app/Config/Routes.php` (`'Home::index'`): completion and go to definition
- Views know the data passed to them; `model('UserModel')`, `service('request')`, `config('App')` are typed

<!-- GIF: Laravel route/view completion → media/screenshots/laravel.gif
![Laravel](media/screenshots/laravel.gif)
-->

### 🎨 Formatter
- Built-in formatter: **PSR-12**, **PER-CS 2.0 / 3.0**, **Laravel**, **Symfony**, **PEAR**, **Zend**,
  **CodeIgniter** and **PhpStorm default** presets
- 200+ options with PhpStorm's own names (`phpLsp.format.options`): spacing, wrapping, blank lines, alignment,
  PHPDoc
- Format document, format selection and format while typing
- Import / export code styles as a PhpStorm XML scheme or `.editorconfig`
- Prefer Laravel Pint or PHP-CS-Fixer? Set `phpLsp.formatter.tool` and the project's own tool is used

<!-- GIF: format document → media/screenshots/format.gif
![Formatter](media/screenshots/format.gif)
-->

## 📥 Installing in VSCodium, Cursor, Windsurf and other editors

The extension is on the VS Code Marketplace. In editors that don't use the Marketplace, install it from a `.vsix` file:

1. Download the file for your platform from the [latest release](https://github.com/emirbugra/php-lsp-vsc/releases/latest) (for example `php-lsp-vsc-linux-x64.vsix`, `php-lsp-vsc-darwin-arm64.vsix`, `php-lsp-vsc-win32-x64.vsix`).
2. Open the Extensions view, click `…` at the top and choose **Install from VSIX…**, or run `codium --install-extension php-lsp-vsc-linux-x64.vsix` (`cursor` / `windsurf` for those editors).

## ⚙️ Settings

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
| `phpLsp.inlayHints.parameterNames` | `true` | Parameter name hints at call sites |
| `phpLsp.inlayHints.variableTypes` | `true` | Inferred type hints after variables |
| `phpLsp.codeLens.enabled` | `true` | Reference / implementation counts above declarations |
| `phpLsp.serverPath` | `""` | Use a different `php-lsp` binary |
| `phpLsp.logLevel` | `info` | Server log level |

VS Code's own basic PHP suggestions are turned off by default (`php.suggest.basic`) to avoid duplicate completions.

## ⌨️ Commands

- **PHP LSP: Show Info Panel** — server status and index statistics
- **PHP LSP: Restart Server** · **PHP LSP: Show Server Log**
- **PHP LSP: Import Code Style…** · **PHP LSP: Export Code Style…**

## 🐞 Feedback

Found a bug or missing a feature? [Open an issue](https://github.com/emirbugra/php-lsp-vsc/issues). If the
extension helps you, a ⭐ on [GitHub](https://github.com/emirbugra/php-lsp-vsc) or a
[review on the Marketplace](https://marketplace.visualstudio.com/items/emirbugra.php-lsp-vsc/reviews) helps a lot.

## 🛠️ Development

The language server lives in [php-lsp-rs](https://github.com/emirbugra/php-lsp-rs) (written in Rust).

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

## 📄 License

MIT. The bundled server embeds JetBrains [phpstorm-stubs](https://github.com/JetBrains/phpstorm-stubs)
(Apache-2.0); see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
