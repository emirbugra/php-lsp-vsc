import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, State, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;
let output: vscode.OutputChannel;
let statusItem: vscode.StatusBarItem;
let panel: vscode.WebviewPanel | undefined;
let panelTimer: NodeJS.Timeout | undefined;
let serverCommand = '';
let lastError = '';
let state: 'stopped' | 'starting' | 'running' | 'error' = 'stopped';

interface ServerStatus {
  version: string;
  indexing: boolean;
  percent: number;
  files: number;
  symbols: number;
  openDocuments: number;
  roots: string[];
  composerProjects: string[];
  indexVendor: boolean;
}

function binaryName(): string {
  return process.platform === 'win32' ? 'php-lsp.exe' : 'php-lsp';
}

/** A packaged binary can lose its executable bit (zip extraction); restore it. */
function ensureExecutable(file: string): void {
  if (process.platform === 'win32') {
    return;
  }
  try {
    const mode = fs.statSync(file).mode;
    if ((mode & 0o111) !== 0o111) {
      fs.chmodSync(file, mode | 0o755);
    }
  } catch {
    /* start fails with a clear error later */
  }
}

/** configured path -> bundled binary -> sibling dev build -> PATH */
function resolveServer(context: vscode.ExtensionContext): string {
  const configured = vscode.workspace.getConfiguration('phpLsp').get<string>('serverPath', '').trim();
  if (configured) {
    return configured;
  }
  const bundled = path.join(context.extensionPath, 'server', binaryName());
  if (fs.existsSync(bundled)) {
    ensureExecutable(bundled);
    return bundled;
  }
  for (const profile of ['release', 'debug']) {
    const dev = path.join(context.extensionPath, '..', 'php-lsp-rs', 'target', profile, binaryName());
    if (fs.existsSync(dev)) {
      return path.normalize(dev);
    }
  }
  return 'php-lsp';
}

function setState(s: typeof state, detail?: string): void {
  state = s;
  switch (s) {
    case 'starting':
      statusItem.text = '$(sync~spin) PHP LSP';
      statusItem.tooltip = 'PHP LSP: starting…';
      break;
    case 'running':
      statusItem.text = '$(check) PHP LSP';
      statusItem.tooltip = 'PHP LSP is running. Click for details.';
      break;
    case 'error':
      statusItem.text = '$(error) PHP LSP';
      statusItem.tooltip = `PHP LSP failed: ${detail ?? ''}`;
      break;
    default:
      statusItem.text = '$(circle-slash) PHP LSP';
      statusItem.tooltip = 'PHP LSP is stopped. Click for details.';
  }
  renderPanel();
}

/** Settings the server applies without a restart, as it reads them (also sent when they change). */
function liveSettings(): Record<string, unknown> {
  const cfg = vscode.workspace.getConfiguration('phpLsp');
  return {
    formatPreset: cfg.get<string>('format.preset', 'psr12'),
    formatOptions: cfg.get<Record<string, unknown>>('format.options', {}),
    useProjectCodeStyle: cfg.get<boolean>('format.useProjectCodeStyle', true),
    inlayParameterNames: cfg.get<boolean>('inlayHints.parameterNames', true),
    inlayVariableTypes: cfg.get<boolean>('inlayHints.variableTypes', true),
    codeLens: cfg.get<boolean>('codeLens.enabled', true),
  };
}

/** Target of the server's code lenses: `editor.action.showReferences` wants VS Code objects. */
function showReferences(uri: string, position: { line: number; character: number }, locations: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }[]): void {
  const pos = (p: { line: number; character: number }) => new vscode.Position(p.line, p.character);
  const locs = (locations ?? []).map((l) => new vscode.Location(vscode.Uri.parse(l.uri), new vscode.Range(pos(l.range.start), pos(l.range.end))));
  void vscode.commands.executeCommand('editor.action.showReferences', vscode.Uri.parse(uri), pos(position), locs);
}

interface ImportedStyle {
  name: string | null;
  preset: string;
  options: Record<string, unknown>;
  unsupported: string[];
  invalid: string[];
}

/** Read a PhpStorm scheme / .editorconfig and store it as `phpLsp.format.preset` + `phpLsp.format.options`. */
async function importCodeStyle(): Promise<void> {
  if (!client || state !== 'running') {
    vscode.window.showWarningMessage('PHP LSP is not running.');
    return;
  }
  const picked = await vscode.window.showOpenDialog({
    title: 'Import code style: a PhpStorm scheme (.xml) or an .editorconfig',
    canSelectMany: false,
    defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
    filters: { 'Code style': ['xml', 'editorconfig'], 'All files': ['*'] },
  });
  if (!picked?.[0]) {
    return;
  }
  const file = picked[0].fsPath;
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    vscode.window.showErrorMessage(`Cannot read ${file}: ${e}`);
    return;
  }
  let style: ImportedStyle;
  try {
    style = await client.sendRequest<ImportedStyle>('phpLsp/importCodeStyle', {
      text,
      kind: file.toLowerCase().endsWith('.xml') ? 'phpstorm' : file.endsWith('.editorconfig') ? 'editorconfig' : undefined,
    });
  } catch (e) {
    vscode.window.showErrorMessage(`Not a code style file: ${e instanceof Error ? e.message : e}`);
    return;
  }
  const targets: { label: string; target: vscode.ConfigurationTarget }[] = [];
  if (vscode.workspace.workspaceFolders?.length) {
    targets.push({ label: 'Workspace settings', target: vscode.ConfigurationTarget.Workspace });
  }
  targets.push({ label: 'User settings', target: vscode.ConfigurationTarget.Global });
  const where =
    targets.length === 1
      ? targets[0]
      : await vscode.window.showQuickPick(targets, { title: 'Where should the code style be saved?' });
  if (!where) {
    return;
  }
  const cfg = vscode.workspace.getConfiguration('phpLsp');
  await cfg.update('format.preset', style.preset, where.target);
  await cfg.update('format.options', style.options, where.target);

  const count = Object.keys(style.options).length;
  const label = style.name ? `"${style.name}"` : path.basename(file);
  let msg = `Imported ${label} into ${where.label.toLowerCase()}: preset ${style.preset} with ${count} override${count === 1 ? '' : 's'}.`;
  if (style.unsupported.length) {
    msg += ` ${style.unsupported.length} option${style.unsupported.length === 1 ? ' is' : 's are'} not supported yet.`;
  }
  output.appendLine(`Imported code style ${label} (${file}): preset ${style.preset}, overrides ${JSON.stringify(style.options)}`);
  if (style.unsupported.length) {
    output.appendLine(`  not supported yet: ${style.unsupported.join(', ')}`);
  }
  if (style.invalid.length) {
    output.appendLine(`  unusable values: ${style.invalid.join(', ')}`);
  }
  const more = style.unsupported.length || style.invalid.length ? ['Details'] : [];
  const pick = await vscode.window.showInformationMessage(msg, ...more);
  if (pick === 'Details') {
    output.show();
  }
}

/** Write the code style in effect (for the active PHP file, else the settings) as a PhpStorm scheme or an .editorconfig. */
async function exportCodeStyle(): Promise<void> {
  if (!client || state !== 'running') {
    vscode.window.showWarningMessage('PHP LSP is not running.');
    return;
  }
  const choice = await vscode.window.showQuickPick(
    [
      { label: 'PhpStorm scheme (.xml)', format: 'phpstorm', file: 'php-code-style.xml', detail: 'Import in PhpStorm: Settings → Editor → Code Style → PHP → ⚙ → Import Scheme' },
      { label: '.editorconfig', format: 'editorconfig', file: '.editorconfig', detail: 'Read by VS Code, PhpStorm (ij_php_* keys) and most editors' },
    ],
    { title: 'Export code style as' }
  );
  if (!choice) {
    return;
  }
  const editor = vscode.window.activeTextEditor;
  const uri = editor?.document.languageId === 'php' && editor.document.uri.scheme === 'file' ? editor.document.uri.toString() : undefined;
  const result = await client.sendRequest<{ text: string }>('phpLsp/exportCodeStyle', { uri, kind: choice.format, name: 'php-lsp' });
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  const target = await vscode.window.showSaveDialog({
    title: 'Export code style',
    defaultUri: folder ? vscode.Uri.joinPath(folder, choice.file) : undefined,
    filters: choice.format === 'phpstorm' ? { 'PhpStorm scheme': ['xml'] } : { EditorConfig: ['editorconfig'], 'All files': ['*'] },
  });
  if (!target) {
    return;
  }
  let text = result.text;
  if (choice.format === 'editorconfig' && fs.existsSync(target.fsPath)) {
    // keep the other sections of an existing .editorconfig
    const how = await vscode.window.showWarningMessage(
      `${path.basename(target.fsPath)} exists.`,
      { modal: true, detail: 'Append the PHP section to it, or replace the whole file?' },
      'Append',
      'Replace'
    );
    if (!how) {
      return;
    }
    if (how === 'Append') {
      const old = fs.readFileSync(target.fsPath, 'utf8');
      text = old.replace(/\s*$/, '\n\n') + text;
    }
  }
  fs.writeFileSync(target.fsPath, text);
  const pick = await vscode.window.showInformationMessage(`Code style exported to ${target.fsPath}.`, 'Open');
  if (pick === 'Open') {
    await vscode.window.showTextDocument(target);
  }
}

async function startClient(context: vscode.ExtensionContext): Promise<void> {
  serverCommand = resolveServer(context);
  lastError = '';
  const cfg = vscode.workspace.getConfiguration('phpLsp');
  output.appendLine(`Starting php-lsp: ${serverCommand}`);
  setState('starting');

  const serverOptions: ServerOptions = {
    command: serverCommand,
    transport: TransportKind.stdio,
    options: { env: { ...process.env, RUST_LOG: `warn,php_lsp=${cfg.get<string>('logLevel', 'info')}` } },
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'php' },
      { scheme: 'untitled', language: 'php' },
      // `.blade.php` files when a Blade extension gives them their own language
      { scheme: 'file', language: 'blade' },
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{php,phtml,inc,php4,php5,module,install}'),
    },
    initializationOptions: {
      indexVendor: cfg.get<boolean>('indexVendor', true),
      inspections: cfg.get<boolean>('inspections.enabled', true),
      formatter: cfg.get<string>('formatter.tool', 'auto'),
      formatterPath: cfg.get<string>('formatter.path', ''),
      laravelDiagnostics: cfg.get<boolean>('laravel.diagnostics', true),
      phpVersion: cfg.get<string>('phpVersion', ''),
      ...liveSettings(),
    },
    outputChannel: output,
  };

  const c = new LanguageClient('phpLsp', 'PHP LSP', serverOptions, clientOptions);
  c.onDidChangeState((e) => {
    if (e.newState === State.Running) {
      setState('running');
    } else if (e.newState === State.Stopped && state !== 'error') {
      setState('stopped');
    }
  });
  client = c;
  try {
    await c.start();
  } catch (err) {
    client = undefined;
    lastError = `${err}`;
    output.appendLine(`Could not start php-lsp (${serverCommand}): ${err}`);
    setState('error', lastError);
    const pick = await vscode.window.showErrorMessage(
      `PHP LSP could not start: ${err}`,
      'Open Settings',
      'Show Log'
    );
    if (pick === 'Open Settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', 'phpLsp.serverPath');
    } else if (pick === 'Show Log') {
      output.show();
    }
  }
}

async function stopClient(): Promise<void> {
  if (client) {
    const c = client;
    client = undefined;
    try {
      await c.stop();
    } catch {
      /* already stopped */
    }
  }
  setState('stopped');
}

// ---- info panel -------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

async function fetchStatus(): Promise<ServerStatus | undefined> {
  if (!client || state !== 'running') {
    return undefined;
  }
  try {
    return await client.sendRequest<ServerStatus>('phpLsp/status');
  } catch {
    return undefined;
  }
}

async function renderPanel(): Promise<void> {
  if (!panel) {
    return;
  }
  const st = await fetchStatus();
  const stateLabel: Record<typeof state, string> = {
    stopped: 'Stopped',
    starting: 'Starting…',
    running: st?.indexing ? `Running — indexing ${st.percent}%` : 'Running',
    error: 'Error',
  };
  const rows: [string, string][] = [
    ['Status', stateLabel[state]],
    ['Server binary', serverCommand],
  ];
  if (lastError) {
    rows.push(['Error', lastError]);
  }
  if (st) {
    rows.push(
      ['Server version', st.version],
      ['Indexed files', st.files.toLocaleString()],
      ['Indexed symbols', st.symbols.toLocaleString()],
      ['Open PHP documents', String(st.openDocuments)],
      ['Index vendor/', st.indexVendor ? 'yes' : 'no'],
      ['Workspace roots', st.roots.join('\n') || '—'],
      ['Composer projects', st.composerProjects.join('\n') || '—']
    );
  }
  const body = rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('');
  const bar = st?.indexing
    ? `<div class="bar"><div style="width:${st.percent}%"></div></div>`
    : '';
  panel.webview.html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px 18px; }
  h1 { font-size: 1.3em; margin: 0 0 4px; }
  .sub { color: var(--vscode-descriptionForeground); margin-bottom: 14px; }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; white-space: nowrap; padding: 5px 16px 5px 0; vertical-align: top; color: var(--vscode-descriptionForeground); font-weight: normal; }
  td { padding: 5px 0; word-break: break-all; }
  tr { border-bottom: 1px solid var(--vscode-widget-border, #8884); }
  .bar { height: 4px; background: var(--vscode-widget-border, #8884); margin: 10px 0; }
  .bar div { height: 100%; background: var(--vscode-progressBar-background); }
</style></head>
<body>
  <h1>PHP LSP (Rust)</h1>
  <div class="sub">Extension is loaded.</div>
  ${bar}
  <table>${body}</table>
</body></html>`;
}

function showPanel(): void {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside, true);
    return;
  }
  panel = vscode.window.createWebviewPanel('phpLspInfo', 'PHP LSP', { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, {
    enableScripts: false,
  });
  panel.onDidDispose(() => {
    panel = undefined;
    if (panelTimer) {
      clearInterval(panelTimer);
      panelTimer = undefined;
    }
  });
  panelTimer = setInterval(() => void renderPanel(), 1500);
  void renderPanel();
}

// ---- lifecycle ----------------------------------------------------------------

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  output = vscode.window.createOutputChannel('PHP LSP');
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  statusItem.command = 'phpLsp.showPanel';
  statusItem.show();
  context.subscriptions.push(output, statusItem);
  setState('stopped');

  context.subscriptions.push(
    vscode.commands.registerCommand('phpLsp.showPanel', showPanel),
    vscode.commands.registerCommand('phpLsp.restart', async () => {
      await stopClient();
      await startClient(context);
    }),
    vscode.commands.registerCommand('phpLsp.showOutput', () => output.show()),
    vscode.commands.registerCommand('phpLsp.importCodeStyle', importCodeStyle),
    vscode.commands.registerCommand('phpLsp.exportCodeStyle', exportCodeStyle),
    vscode.commands.registerCommand('phpLsp.showReferences', showReferences),
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      // formatter settings apply without a restart
      const live = ['phpLsp.format', 'phpLsp.inlayHints', 'phpLsp.codeLens'];
      if (live.some((k) => e.affectsConfiguration(k)) && client && state === 'running') {
        await client.sendNotification('workspace/didChangeConfiguration', { settings: liveSettings() });
      }
      if (e.affectsConfiguration('phpLsp.serverPath') || e.affectsConfiguration('phpLsp.indexVendor') || e.affectsConfiguration('phpLsp.inspections.enabled') || e.affectsConfiguration('phpLsp.formatter') || e.affectsConfiguration('phpLsp.phpVersion') || e.affectsConfiguration('phpLsp.laravel')) {
        const pick = await vscode.window.showInformationMessage(
          'PHP LSP settings changed. Restart the language server to apply them.',
          'Restart'
        );
        if (pick === 'Restart') {
          await vscode.commands.executeCommand('phpLsp.restart');
        }
      }
    })
  );

  await startClient(context);
}

export async function deactivate(): Promise<void> {
  if (panelTimer) {
    clearInterval(panelTimer);
  }
  await stopClient();
}
