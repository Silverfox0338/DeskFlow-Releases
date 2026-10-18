#!/usr/bin/env node
// deskflow-addon: create, check, package and install DeskFlow addons.
//   npx deskflow-addon new <name> [--plugin]     start a new addon (or a C# plugin)
//   npx deskflow-addon validate [folder]         check addon.json with DeskFlow's rules
//   npx deskflow-addon pack [folder] [--out f]   build the .deskflow-addon file
//   npx deskflow-addon install [folder|file]     pack (if needed) and open it in DeskFlow
// No dependencies: zips are written with Node's built-in zlib.
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { spawnSync } = require('child_process');

const VERSION = require('../package.json').version;
const MIN_DESKFLOW = '0.6.0';
const MAX_PACKAGE = 50 * 1024 * 1024;
const MAX_FILE = 15 * 1024 * 1024;
const SAFE_EXT = ['.json', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.txt', '.md'];
const PROVIDED_DLLS = ['deskflow.dll', 'microsoft.windows.sdk.net.dll', 'winrt.runtime.dll'];
const ELEMENTS = ['stack', 'grid', 'text', 'icon', 'image', 'progress', 'list', 'spacer', 'divider', 'link'];
const SOURCES = ['time', 'system', 'battery', 'network', 'media', 'web', 'rss', 'file'];
const SETTING_TYPES = ['text', 'number', 'toggle', 'choice', 'file'];

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const green = paint(32), red = paint(31), yellow = paint(33), dim = paint(2), bold = paint(1), cyan = paint(36);

class UserError extends Error {}

// ---------------------------------------------------------------- args

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--') && ['out', 'id', 'author'].includes(k)) out[k] = argv[++i];
      else out[k] = true;
    } else if (a === '-h') out.help = true;
    else out._.push(a);
  }
  return out;
}

// ---------------------------------------------------------------- validation (mirrors DeskFlow's AddonManifest.Validate)

function versionOk(v) {
  return typeof v === 'string' && v.length <= 20 && /^v?\d+(\.\d+){0,3}$/i.test(v.trim());
}

function cmpVersion(a, b) {
  const pa = a.replace(/^v/i, '').split('.').map(Number), pb = b.replace(/^v/i, '').split('.').map(Number);
  for (let i = 0; i < 4; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

function readManifest(folder) {
  const file = path.join(folder, 'addon.json');
  if (!fs.existsSync(file)) throw new UserError(`No addon.json in ${folder}. Run "npx deskflow-addon new <name>" to start one.`);
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  try {
    // DeskFlow allows // comments and trailing commas in addon.json.
    const cleaned = text.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, s) => s || '').replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(cleaned);
  } catch (e) {
    throw new UserError(`addon.json is not valid JSON: ${e.message}`);
  }
}

/** Returns { errors, warnings } for a manifest (errors = DeskFlow would refuse it). */
function validate(m) {
  const errors = [], warnings = [];
  const get = (k) => m[k] ?? m[k[0].toUpperCase() + k.slice(1)];
  const id = String(get('id') ?? '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9.-]{2,63}$/.test(id) || id.includes('..'))
    errors.push('id must be 3–64 lowercase letters, digits, dots or dashes (e.g. "com.yourname.countdown").');
  const name = get('name');
  if (!name || !String(name).trim()) errors.push('name is missing.');
  else if (String(name).length > 60) errors.push('name is longer than 60 characters.');
  if (!versionOk(get('version') ?? '1.0.0')) errors.push('version must look like 1.0.0.');
  const min = get('minDeskFlow') ?? MIN_DESKFLOW;
  if (!versionOk(min)) errors.push('minDeskFlow must look like 0.6.0.');
  const kind = String(get('kind') ?? 'widget').toLowerCase();
  if (!['widget', 'plugin'].includes(kind)) errors.push('kind must be "widget" (safe) or "plugin" (code).');

  const hosts = (get('permissions')?.web ?? get('permissions')?.Web ?? []).map((h) => String(h).trim().toLowerCase());
  for (const h of hosts)
    if (!/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h))
      errors.push(`permissions.web: "${h}" isn't a valid host (use just the name, like api.example.com).`);
  if (hosts.length > 10) errors.push('permissions.web: at most 10 hosts.');

  const settings = get('settings') ?? [];
  const keys = new Set();
  for (const s of settings) {
    const key = s.key ?? s.Key ?? '';
    if (!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(key) || keys.has(key.toLowerCase())) errors.push(`settings: key "${key}" is invalid or repeated.`);
    keys.add(String(key).toLowerCase());
    const type = String(s.type ?? s.Type ?? 'text').toLowerCase();
    if (!SETTING_TYPES.includes(type)) errors.push(`settings: "${key}" has an unknown type "${type}" (use ${SETTING_TYPES.join(', ')}).`);
    if (type === 'choice' && !(s.options ?? s.Options ?? []).length) errors.push(`settings: "${key}" is a choice without options.`);
  }
  if (settings.length > 20) errors.push('settings: at most 20.');

  if (kind === 'widget') {
    const w = get('widget');
    if (!w || typeof w !== 'object') errors.push('A widget addon needs a "widget" section with "layout" (and usually "sources").');
    else {
      if (!w.layout || typeof w.layout !== 'object') errors.push('widget.layout is missing.');
      if (get('assembly')) errors.push('A safe widget addon can\'t contain code. Use "kind": "plugin" for that.');
      lintWidget(w, settings, hosts, errors, warnings);
    }
  } else if (kind === 'plugin') {
    const asm = get('assembly');
    if (!asm || !/\.dll$/i.test(asm) || /[\\/]|\.\./.test(asm)) errors.push('A plugin needs "assembly": the name of its DLL, e.g. "MyPlugin.dll".');
  }
  if (cmpVersion(String(min), MIN_DESKFLOW) < 0) warnings.push(`minDeskFlow ${min} is older than the first version with addons (${MIN_DESKFLOW}).`);
  return { errors, warnings, id, kind };
}

/** Extra checks DeskFlow would only catch when the widget is shown. */
function lintWidget(w, settings, hosts, errors, warnings) {
  const sources = w.sources ?? {};
  const names = Object.keys(sources);
  if (names.length > 10) errors.push('widget.sources: at most 10.');
  for (const n of names) {
    const s = sources[n] ?? {};
    const type = String(s.type ?? '').toLowerCase();
    if (!SOURCES.includes(type)) errors.push(`source "${n}": unknown type "${s.type}" (use ${SOURCES.join(', ')}).`);
    if ((type === 'web' || type === 'rss') && s.url) {
      try {
        const u = new URL(String(s.url).replace(/\{\{[^}]*\}\}/g, 'x'));
        if (u.protocol !== 'https:') errors.push(`source "${n}": only https:// URLs are allowed.`);
        else if (!hosts.includes(u.hostname.toLowerCase())) errors.push(`source "${n}": add "${u.hostname}" to permissions.web, or DeskFlow won't let it load.`);
      } catch { warnings.push(`source "${n}": the url doesn't look like a URL.`); }
    }
    if (type === 'file' && !settings.some((x) => (x.key ?? x.Key) === s.setting && String(x.type ?? x.Type).toLowerCase() === 'file'))
      errors.push(`source "${n}": "setting" must name a setting of type "file".`);
  }
  const roots = new Set([...names, 'settings', 'item']);
  let count = 0;
  const walk = (node, depth, where) => {
    if (!node || typeof node !== 'object') return;
    if (++count > 300) return;
    if (depth > 12) { errors.push('layout: nested more than 12 levels deep.'); return; }
    const type = String(node.type ?? '').toLowerCase();
    if (!ELEMENTS.includes(type)) errors.push(`${where}: unknown element "${node.type}" (use ${ELEMENTS.join(', ')}).`);
    if (type === 'list' && !node.item) errors.push(`${where}: a list needs an "item" layout.`);
    for (const [k, v] of Object.entries(node))
      if (typeof v === 'string')
        for (const m of v.matchAll(/\{\{\s*([A-Za-z_][\w]*)/g))
          if (!roots.has(m[1])) warnings.push(`${where}.${k}: "{{${m[1]}…}}" doesn't match a source name (${[...roots].join(', ')}).`);
    if (type === 'list' && typeof node.items === 'string') {
      const first = node.items.replace(/[{}\s]/g, '').split(/[.[]/)[0];
      if (!roots.has(first)) warnings.push(`${where}.items: "${first}" doesn't match a source name.`);
    }
    (node.children ?? []).forEach((c, i) => walk(c, depth + 1, `${where}.children[${i}]`));
    if (node.item) walk(node.item, depth + 1, `${where}.item`);
  };
  walk(w.layout, 0, 'layout');
  if (count > 300) errors.push('layout: more than 300 elements.');
}

function report({ errors, warnings }, label) {
  for (const w of warnings) console.log(`  ${yellow('warning')} ${w}`);
  for (const e of errors) console.log(`  ${red('error')}   ${e}`);
  if (errors.length) throw new UserError(`${label} has ${errors.length} problem${errors.length === 1 ? '' : 's'}; DeskFlow wouldn't install it.`);
}

// ---------------------------------------------------------------- zip (store/deflate, no dependencies)

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function writeZip(file, entries) {
  const parts = [], central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name.replace(/\\/g, '/'), 'utf8');
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(useDeflate ? 8 : 0, 8); local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    parts.push(local, nameBuf, body);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(useDeflate ? 8 : 0, 10); cen.writeUInt16LE(dosTime, 12); cen.writeUInt16LE(dosDate, 14);
    cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(body.length, 20); cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28); cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);
    offset += 30 + nameBuf.length + body.length;
  }
  const cenSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cenSize, 12); end.writeUInt32LE(offset, 16);
  fs.writeFileSync(file, Buffer.concat([...parts, ...central, end]));
}

// ---------------------------------------------------------------- commands

function cmdValidate(folder) {
  folder = path.resolve(folder || '.');
  const m = readManifest(folder);
  const result = validate(m);
  report(result, 'addon.json');
  console.log(`${green('✓')} ${bold(m.name)} ${dim(`(${result.id} ${m.version ?? '1.0.0'}, ${result.kind === 'plugin' ? 'code plugin' : 'safe addon'})`)} is valid.`);
  return { m, result };
}

function findPluginOutput(folder) {
  const release = path.join(folder, 'bin', 'Release');
  if (!fs.existsSync(release)) return null;
  const tfms = fs.readdirSync(release).map((d) => path.join(release, d)).filter((d) => fs.statSync(d).isDirectory());
  tfms.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return tfms[0] ?? null;
}

function cmdPack(folder, opts = {}) {
  folder = path.resolve(folder || '.');
  const { m, result } = cmdValidate(folder);
  const entries = [{ name: 'addon.json', data: fs.readFileSync(path.join(folder, 'addon.json')) }];
  const images = path.join(folder, 'images');
  if (fs.existsSync(images))
    for (const f of fs.readdirSync(images)) {
      const full = path.join(images, f);
      if (!fs.statSync(full).isFile()) continue;
      if (!SAFE_EXT.includes(path.extname(f).toLowerCase())) { console.log(`  ${yellow('skipped')} images/${f} (only images and text are allowed)`); continue; }
      entries.push({ name: `images/${f}`, data: fs.readFileSync(full) });
    }

  if (result.kind === 'plugin') {
    const csproj = fs.readdirSync(folder).find((f) => f.endsWith('.csproj'));
    if (csproj && !opts['no-build']) {
      console.log(dim(`Building ${csproj} (Release)…`));
      const r = spawnSync('dotnet', ['build', csproj, '-c', 'Release', '-nologo', '-v', 'q'], { cwd: folder, stdio: 'inherit' });
      if (r.status !== 0) throw new UserError('The plugin build failed (see above). Is the .NET 10 SDK installed? https://dot.net');
    }
    const out = opts.from ? path.resolve(opts.from) : findPluginOutput(folder);
    if (!out) throw new UserError('No build output found. Build the plugin first, or pass --from <folder with your DLL>.');
    for (const f of fs.readdirSync(out)) {
      const lower = f.toLowerCase();
      if (PROVIDED_DLLS.includes(lower)) continue; // DeskFlow ships these
      if (lower.endsWith('.dll') || lower.endsWith('.deps.json')) entries.push({ name: f, data: fs.readFileSync(path.join(out, f)) });
    }
    if (!entries.some((e) => e.name.toLowerCase() === String(m.assembly).toLowerCase()))
      throw new UserError(`${m.assembly} wasn't found in ${out}. Does "assembly" match your project's DLL name?`);
  }

  let total = 0;
  for (const e of entries) {
    if (e.data.length > MAX_FILE) throw new UserError(`${e.name} is larger than 15 MB.`);
    total += e.data.length;
  }
  if (total > MAX_PACKAGE) throw new UserError('The addon is larger than 50 MB.');

  const file = path.resolve(opts.out || `${result.id}-${m.version ?? '1.0.0'}.deskflow-addon`);
  writeZip(file, entries);
  const shown = path.relative(process.cwd(), file);
  console.log(`${green('✓')} Packed ${bold(shown && !shown.startsWith('..') ? shown : file)} ${dim(`(${entries.length} file${entries.length === 1 ? '' : 's'}, ${(fs.statSync(file).size / 1024).toFixed(1)} KB)`)}`);
  return file;
}

function cmdInstall(target, opts) {
  let file = target ? path.resolve(target) : null;
  if (!file || fs.statSync(file).isDirectory()) file = cmdPack(file || '.', { ...opts, out: path.join(os.tmpdir(), `deskflow-addon-${Date.now()}.deskflow-addon`) });
  if (process.platform !== 'win32') throw new UserError('Installing needs Windows (DeskFlow is a Windows app). The packed file is ready to copy over.');
  const installed = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'DeskFlow', 'DeskFlow.exe');
  const r = fs.existsSync(installed)
    ? spawnSync(installed, ['--install', file], { stdio: 'ignore', detached: true })
    : spawnSync('cmd', ['/c', 'start', '""', file], { stdio: 'ignore' });
  if (r.error) throw new UserError(`Couldn't open DeskFlow: ${r.error.message}`);
  console.log(`${green('✓')} Opened in DeskFlow. Confirm the install prompt, then use ${bold('Add to desktop')} in Studio → Addons.`);
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'my-addon';
}

function title(s) {
  return String(s).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function cmdNew(name, opts) {
  if (!name) throw new UserError('Give your addon a name: npx deskflow-addon new my-widget');
  const dir = path.resolve(slug(name));
  if (fs.existsSync(dir) && fs.readdirSync(dir).length) throw new UserError(`${dir} already exists and isn't empty.`);
  fs.mkdirSync(dir, { recursive: true });
  const user = slug(opts.author || os.userInfo().username || 'me').replace(/-/g, '');
  const id = opts.id || `com.${user || 'me'}.${slug(name)}`;
  const author = opts.author || os.userInfo().username || '';
  const display = title(name);
  const write = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text.replace(/^\n/, ''));
  };

  if (opts.plugin) {
    const cls = display.replace(/[^A-Za-z0-9]/g, '') || 'MyWidget';
    write('addon.json', JSON.stringify({
      id, name: display, version: '1.0.0', author, description: 'A DeskFlow code plugin.', glyph: 'E8E1',
      minDeskFlow: MIN_DESKFLOW, kind: 'plugin', assembly: `${cls}.dll`,
    }, null, 2) + '\n');
    write(`${cls}.csproj`, `
<Project Sdk="Microsoft.NET.Sdk">
  <!-- Compiles against your installed DeskFlow (it provides DeskFlow.dll at runtime, so it isn't copied). -->
  <PropertyGroup>
    <TargetFramework>net10.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <EnableDynamicLoading>true</EnableDynamicLoading>
    <DeskFlowDir Condition="'$(DeskFlowDir)' == ''">$(LOCALAPPDATA)\\Programs\\DeskFlow</DeskFlowDir>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="DeskFlow">
      <HintPath>$(DeskFlowDir)\\DeskFlow.dll</HintPath>
      <Private>false</Private>
    </Reference>
  </ItemGroup>
</Project>
`);
    write(`${cls}Widget.cs`, `
using System.Windows;
using System.Windows.Controls;
using DeskFlow.Widgets;

namespace ${cls};

[Widget("${slug(name)}", "${display}", Description = "Made with deskflow-addon.", Glyph = "\\uE8E1")]
public sealed class ${cls}Widget : IWidget
{
    private readonly TextBlock _text = new() { Text = "Hello from ${display}!", FontSize = 15 };
    private WidgetContext? _context;

    public FrameworkElement View => _text;

    public ${cls}Widget() => _text.SetResourceReference(TextBlock.ForegroundProperty, "TextBrush"); // follow the theme

    public void Initialize(WidgetContext context) => _context = context; // context.Settings.Options + context.Save()

    public IEnumerable<Control> CreateSettingsMenuItems() => Array.Empty<Control>();

    public void OnVisibilityChanged(bool visible) { } // pause timers while hidden

    public void Dispose() { }
}
`);
    write('.gitignore', 'bin/\nobj/\n*.deskflow-addon\n');
  } else {
    write('addon.json', JSON.stringify({
      id, name: display, version: '1.0.0', author, description: 'Made with deskflow-addon.', glyph: 'E8E1',
      minDeskFlow: MIN_DESKFLOW, kind: 'widget',
      settings: [{ key: 'greeting', label: 'Greeting', type: 'text', default: 'Hello' }],
      widget: {
        width: 220,
        sources: { now: { type: 'time', every: 60 } },
        layout: {
          type: 'stack', gap: 2,
          children: [
            { type: 'text', style: 'caption', text: '{{settings.greeting | upper}}' },
            { type: 'text', style: 'display', text: '{{now.time}}' },
            { type: 'text', style: 'body', color: 'subtle', text: '{{now.weekday}}, {{now.longDate}}' },
          ],
        },
      },
    }, null, 2) + '\n');
    write('images/.keep', '');
    fs.rmSync(path.join(dir, 'images', '.keep'));
    write('.gitignore', '*.deskflow-addon\n');
  }
  write('README.md', `
# ${display}

A DeskFlow ${opts.plugin ? 'code plugin' : 'addon'}.

\`\`\`
npx deskflow-addon validate      # check addon.json
npx deskflow-addon install       # pack it and open it in DeskFlow
npx deskflow-addon pack          # build the .deskflow-addon to share
\`\`\`

Guide: https://github.com/Silverfox0338/DeskFlow-Releases/blob/main/ADDONS.md
`);
  const rel = path.relative(process.cwd(), dir) || '.';
  console.log(`${green('✓')} Created ${bold(display)} ${dim(`(${opts.plugin ? 'C# plugin' : 'safe addon'}, id ${id})`)} in ${cyan(rel)}`);
  console.log(`\n  cd ${rel}\n  npx deskflow-addon install\n`);
  if (opts.plugin) console.log(dim('  Needs the .NET 10 SDK (https://dot.net) and DeskFlow installed to build.'));
}

function help() {
  console.log(`${bold('deskflow-addon')} ${dim(VERSION)}: make addons for DeskFlow

  ${cyan('npx deskflow-addon new <name>')} [--plugin] [--id com.you.name] [--author "You"]
      Start a new addon in ./<name> (a safe addon, or a C# plugin with --plugin).
  ${cyan('npx deskflow-addon validate')} [folder]
      Check addon.json with the same rules DeskFlow uses (plus layout and source hints).
  ${cyan('npx deskflow-addon pack')} [folder] [--out file] [--no-build] [--from dir]
      Build the .deskflow-addon file. Plugins are built with dotnet first.
  ${cyan('npx deskflow-addon install')} [folder|file]
      Pack (if needed) and open it in DeskFlow's install prompt.

Guide: https://github.com/Silverfox0338/DeskFlow-Releases/blob/main/ADDONS.md`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, target] = args._;
  if (args.version) return console.log(VERSION);
  if (!cmd || args.help || cmd === 'help') return help();
  switch (cmd) {
    case 'new': case 'create': case 'init': return cmdNew(target, args);
    case 'validate': case 'check': return cmdValidate(target);
    case 'pack': case 'build': return cmdPack(target, args);
    case 'install': return cmdInstall(target, args);
    default: throw new UserError(`Unknown command "${cmd}". Run "npx deskflow-addon --help".`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    if (e instanceof UserError) {
      console.error(`${red('✗')} ${e.message}`);
      process.exit(1);
    }
    throw e;
  }
}

module.exports = { validate, writeZip, crc32 };
