import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { DONATIONS } from './donate';

const SEEN_KEY = 'phpLsp.lastSeenVersion';

let panel: vscode.WebviewPanel | undefined;

interface Release {
  version: string;
  /** Bullets, with continuation lines joined. */
  items: string[];
}

/** `## 0.6.0` sections of CHANGELOG.md, newest first. */
export function parseChangelog(text: string): Release[] {
  const out: Release[] = [];
  let cur: Release | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const h = /^##\s+v?(\d+\.\d+\.\d+)\b/.exec(raw);
    if (h) {
      cur = { version: h[1], items: [] };
      out.push(cur);
    } else if (cur && /^[-*]\s+/.test(raw)) {
      cur.items.push(raw.replace(/^[-*]\s+/, '').trim());
    } else if (cur && cur.items.length > 0 && /^\s+\S/.test(raw)) {
      cur.items[cur.items.length - 1] += ' ' + raw.trim();
    }
  }
  return out;
}

function compare(a: string, b: string): number {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((x[i] || 0) !== (y[i] || 0)) {
      return (x[i] || 0) - (y[i] || 0);
    }
  }
  return 0;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

/** Escaped text with `code` and **bold**. */
function inline(s: string): string {
  return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function readChangelog(context: vscode.ExtensionContext): Release[] {
  try {
    return parseChangelog(fs.readFileSync(path.join(context.extensionPath, 'CHANGELOG.md'), 'utf8'));
  } catch {
    return [];
  }
}

function html(releases: Release[], current: string, nonce: string): string {
  const notes = releases
    .map(
      (r) => `<section><h2>${esc(r.version)}${r.version === current ? ' <span class="tag">new</span>' : ''}</h2><ul>${r.items
        .map((i) => `<li>${inline(i)}</li>`)
        .join('')}</ul></section>`
    )
    .join('');
  const donate = DONATIONS.length
    ? `<section class="donate"><h2>Support the project</h2>
  <p>PHP LSP is free and open source. If it saves you time, you can chip in — completely optional.
  Please check the address against the one in the README before sending anything.</p>
  ${DONATIONS.map(
    (d, i) => `<div class="addr"><div><b>${esc(d.coin)}</b> <span class="net">${esc(d.network)}</span></div>
    <code id="a${i}">${esc(d.address)}</code><button data-copy="${i}">Copy</button></div>`
  ).join('')}</section>`
    : '';
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px 24px 40px; max-width: 820px; line-height: 1.5; }
  h1 { font-size: 1.6em; margin: 0 0 2px; }
  h2 { font-size: 1.15em; margin: 26px 0 6px; }
  .sub { color: var(--vscode-descriptionForeground); margin-bottom: 8px; }
  .tag { font-size: .7em; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 1px 7px; border-radius: 9px; vertical-align: middle; }
  ul { padding-left: 20px; } li { margin: 5px 0; }
  code { font-family: var(--vscode-editor-font-family); background: var(--vscode-textCodeBlock-background); padding: 1px 4px; border-radius: 3px; }
  .addr { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--vscode-widget-border, #8884); }
  .addr code { grid-column: 1; word-break: break-all; }
  .addr button { grid-column: 2; grid-row: 1 / span 2; }
  .net { color: var(--vscode-descriptionForeground); font-size: .9em; }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: 0; padding: 5px 14px; border-radius: 2px; cursor: pointer; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  a { color: var(--vscode-textLink-foreground); }
</style></head>
<body>
  <h1>PHP LSP — what's new</h1>
  <div class="sub">Version ${esc(current)}</div>
  ${notes || '<p>No release notes found.</p>'}
  ${donate}
  <p class="sub" style="margin-top:30px">You can open this page again with “PHP LSP: What's New” and turn the automatic page off with the <code>phpLsp.showWhatsNew</code> setting.</p>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  document.querySelectorAll('button[data-copy]').forEach((b) => b.addEventListener('click', () => {
    vscode.postMessage({ copy: document.getElementById('a' + b.dataset.copy).textContent });
    b.textContent = 'Copied';
    setTimeout(() => (b.textContent = 'Copy'), 1500);
  }));
</script>
</body></html>`;
}

/** Open the page. `since`: only the releases after this version (all of the latest 5 when empty). */
export function showWhatsNew(context: vscode.ExtensionContext, since?: string): void {
  const current: string = context.extension.packageJSON.version;
  let releases = readChangelog(context).filter((r) => compare(r.version, current) <= 0);
  releases = since ? releases.filter((r) => compare(r.version, since) > 0) : releases.slice(0, 1);
  releases = releases.slice(0, 5);
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  if (!panel) {
    panel = vscode.window.createWebviewPanel('phpLspWhatsNew', "PHP LSP: What's New", { viewColumn: vscode.ViewColumn.Active, preserveFocus: true }, { enableScripts: true });
    panel.onDidDispose(() => (panel = undefined), null, context.subscriptions);
    panel.webview.onDidReceiveMessage(
      async (m: { copy?: unknown }) => {
        // only text that is one of our own addresses goes to the clipboard
        if (typeof m.copy === 'string' && DONATIONS.some((d) => d.address === m.copy)) {
          await vscode.env.clipboard.writeText(m.copy);
        }
      },
      null,
      context.subscriptions
    );
  } else {
    panel.reveal(vscode.ViewColumn.Active, true);
  }
  panel.webview.html = html(releases, current, nonce);
}

/** After an update (not on first install, not in a development host) show what changed. */
export function maybeShowWhatsNew(context: vscode.ExtensionContext): void {
  const current: string = context.extension.packageJSON.version;
  const seen = context.globalState.get<string>(SEEN_KEY);
  void context.globalState.update(SEEN_KEY, current);
  if (!seen || compare(seen, current) >= 0 || context.extensionMode !== vscode.ExtensionMode.Production) {
    return;
  }
  if (!vscode.workspace.getConfiguration('phpLsp').get<boolean>('showWhatsNew', true)) {
    return;
  }
  showWhatsNew(context, seen);
}
