# Changelog

## 0.4.0

- Blade templates: completion, go to definition, hover, references and inlay hints inside `{{ }}`,
  `@php` and directives; the variables a controller passes to the view, with their types; view
  names in `@extends` / `@include`; warnings for unknown methods, routes, views and translations
- Symfony: route names (attributes, annotations, YAML, generated names) and Twig template names
  with completion, go to definition and "not found" warnings
- CodeIgniter 4: routes, controller handlers in `Routes.php`, views (with the controller's data),
  language keys, config classes; types for `model()`, `service()` and `config()`
- New inspection: missing / too many arguments in calls
- Inlay hints show the inferred type of variables (`$user: User`)
- Code lens: reference counts, implementations, subclasses and overrides
- Laravel facade aliases (`Route::`, `Str::`, package aliases) resolve without `use`
- New settings: `phpLsp.inlayHints.parameterNames`, `phpLsp.inlayHints.variableTypes`,
  `phpLsp.codeLens.enabled`

## 0.2.1

- No longer marked as preview

## 0.2.0

- New name: PHP & Laravel IntelliSense
- Rewritten Marketplace page, more search keywords

## 0.1.1

- New extension icon

## 0.1.0

First public preview.

- Indexing of the workspace and `vendor/`, PHP built-ins from phpstorm-stubs
- Completion, hover, signature help, parameter name inlay hints
- Go to definition / type definition / implementation, references, highlight, rename
- Call hierarchy, type hierarchy, document and workspace symbols
- Type inference with docblocks, `@template` generics and narrowing
- Inspections: undefined symbols and variables, unused imports, missing implementations, deprecations
- Code actions: add types / PHPDoc, import class, implement methods, create method, optimize imports
- Laravel: Eloquent magic, route / view / config / translation / `.env` names with diagnostics
- Built-in formatter with PSR-12, PER-CS, Laravel, Symfony, PEAR, Zend, CodeIgniter and PhpStorm presets;
  PhpStorm code style and `.editorconfig` support; code style import / export
