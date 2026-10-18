#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const VERSION = require('../package.json').version;
const MIN_DESKFLOW = '0.6.0';
const MAX_PACKAGE = 50 * 1024 * 1024;
const MAX_FILE = 15 * 1024 * 1024;
const SAFE_EXT = ['.json', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.txt', '.md'];
const PROVIDED_DLLS = ['deskflow.dll', 'microsoft.windows.sdk.net.dll', 'winrt.runtime.dll'];
const ELEMENTS = ['stack', 'grid', 'text', 'icon', 'image', 'progress', 'list', 'spacer', 'divider', 'link', 'chart', 'button'];
const SOURCES = ['time', 'system', 'battery', 'network', 'media', 'web', 'rss', 'file', 'history'];
const SETTING_TYPES = ['text', 'number', 'toggle', 'choice', 'file'];
const FILTERS = ['number', 'round', 'percent', 'bytes', 'upper', 'lower', 'trim', 'default', 'date', 'until', 'ago', 'days'];
const SCHEMA_URL = 'https://raw.githubusercontent.com/Silverfox0338/DeskFlow-Releases/main/addon-sdk/addon.schema.json';
const SDK_DIR = path.join(__dirname, '..', 'sdk');
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'];
const ACTIONS = ['open', 'refresh', 'setSetting', 'cycleSetting', 'stepSetting', 'copy', 'media.playPause', 'media.next', 'media.previous'];
const FUNCTIONS = ['min', 'max', 'abs', 'round', 'floor', 'ceil', 'sqrt', 'pow', 'sin', 'cos', 'tan', 'pi', 'clamp', 'mod', 'now', 'today', 'date', 'addDays', 'addHours', 'daysBetween', 'year', 'month', 'day', 'hour', 'minute', 'weekday', 'concat', 'len', 'upper', 'lower', 'trim', 'pad', 'substr', 'contains', 'startsWith', 'format', 'text', 'number', 'pick'];
const has = (m, re) => re.test(JSON.stringify(m.widget ?? {}));
const FEATURES = [
  ['Expressions ({{= …}})', '0.6.4', (m) => has(m, /\{\{\s*=/)],
  ['"computed"', '0.6.4', (m) => !!m.widget?.computed],
  ['The history source', '0.6.4', (m) => has(m, /"type":"history"/)],
  ['The chart element', '0.6.4', (m) => has(m, /"type":"chart"/)],
  ['The button element', '0.6.4', (m) => has(m, /"type":"button"/)],
  ['"updates"', '0.6.5', (m) => !!(m.updates ?? m.Updates)],
  ['"publicKey"', '0.6.5', (m) => !!(m.publicKey ?? m.PublicKey)],
];

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const green = paint(32), red = paint(31), yellow = paint(33), dim = paint(2), bold = paint(1), cyan = paint(36), magenta = paint(35);

class UserError extends Error {}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--') && ['out', 'id', 'author', 'key', 'changelog', 'sign', 'from'].includes(k)) out[k] = argv[++i];
      else out[k] = true;
    } else if (a === '-h') out.help = true;
    else out._.push(a);
  }
  return out;
}

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
  return parseManifest(fs.readFileSync(file, 'utf8'));
}

function parseManifest(raw) {
  const text = String(raw).replace(/^\uFEFF/, '');
  try {
    const cleaned = text.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, s) => s || '').replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(cleaned);
  } catch (e) {
    throw new UserError(`addon.json is not valid JSON: ${e.message}`);
  }
}

function lintTemplate(text, where, errors, warnings) {
  if (typeof text !== 'string' || !text.includes('{{')) return;
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{{', i);
    if (open < 0) break;
    const close = text.indexOf('}}', open + 2);
    if (close < 0) { errors.push(`${where}: "${text.slice(open, open + 40)}" has no closing }}.`); break; }
    const expr = text.slice(open + 2, close);
    const parts = splitFilters(expr);
    if (!parts[0].trim()) errors.push(`${where}: {{}} is empty (put a path inside, like {{now.time}}).`);
    else if (parts[0].trim().startsWith('=')) lintExpression(parts[0].trim().slice(1), where, errors);
    for (const raw of parts.slice(1)) {
      const f = raw.trim();
      const colon = f.indexOf(':');
      const name = (colon < 0 ? f : f.slice(0, colon)).trim().toLowerCase();
      const arg = colon < 0 ? '' : f.slice(colon + 1).trim();
      if (!FILTERS.includes(name)) warnings.push(`${where}: unknown filter "${name}" in {{${expr.trim()}}} (use ${FILTERS.join(', ')}).`);
      else if (['number', 'percent', 'trim'].includes(name) && arg && !/^-?\d+$/.test(arg)) warnings.push(`${where}: the ${name} filter needs a whole number, not "${arg}".`);
    }
    i = close + 2;
  }
}

function splitFilters(expr) {
  const parts = [];
  let start = 0, quote = '';
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c !== '|') continue;
    if (expr[i + 1] === '|') { i++; continue; }
    parts.push(expr.slice(start, i));
    start = i + 1;
  }
  parts.push(expr.slice(start));
  return parts;
}

function lintExpression(expr, where, errors) {
  if (!expr.trim()) { errors.push(`${where}: an expression after "=" is missing.`); return; }
  let depth = 0, quote = '';
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')' && --depth < 0) break;
  }
  if (quote) errors.push(`${where}: a text value in "${expr.trim()}" has no closing quote.`);
  else if (depth !== 0) errors.push(`${where}: unbalanced parentheses in "${expr.trim()}".`);
  const bare = expr.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, '""');
  for (const m of bare.matchAll(/([A-Za-z_][\w]*)\s*\(/g))
    if (!FUNCTIONS.some((f) => f.toLowerCase() === m[1].toLowerCase())) errors.push(`${where}: unknown function "${m[1]}()" (use ${FUNCTIONS.join(', ')}).`);
}

function lintPluginProject(folder, errors, warnings) {
  const csproj = fs.readdirSync(folder).find((f) => f.endsWith('.csproj'));
  if (!csproj) { warnings.push('No .csproj found (fine if you build the DLL elsewhere).'); return; }
  const text = fs.readFileSync(path.join(folder, csproj), 'utf8');
  if (!/<TargetFramework>\s*net10\.0-windows[^<]*<\/TargetFramework>/i.test(text))
    warnings.push(`${csproj}: target net10.0-windows (DeskFlow runs on .NET 10).`);
  const ref = text.match(/<Reference\s+Include="DeskFlow"[\s\S]*?(<\/Reference>|\/>)/i);
  if (!ref) warnings.push(`${csproj}: no reference to DeskFlow.dll (the plugin SDK in lib\\DeskFlow.dll, or your installed DeskFlow).`);
  else if (!/<Private>\s*false\s*<\/Private>/i.test(ref[0])) errors.push(`${csproj}: the DeskFlow reference needs <Private>false</Private> (DeskFlow supplies it; a copy would break your plugin).`);
}

function validate(m, folder) {
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
      lintWidget(w, settings, hosts, errors, warnings, folder);
    }
  } else if (kind === 'plugin') {
    const asm = get('assembly');
    if (!asm || !/\.dll$/i.test(asm) || /[\\/]|\.\./.test(asm)) errors.push('A plugin needs "assembly": the name of its DLL, e.g. "MyPlugin.dll".');
    if (folder) lintPluginProject(folder, errors, warnings);
  }
  for (const [what, version, test] of FEATURES)
    if (test(m) && cmpVersion(String(min), version) < 0) warnings.push(`${what} needs DeskFlow ${version}: set "minDeskFlow": "${version}" so older versions refuse it cleanly.`);
  const updates = get('updates');
  if (updates !== undefined) {
    let u = null;
    try { u = new URL(String(updates?.url ?? updates?.Url ?? '')); } catch { }
    if (!u || u.protocol !== 'https:' || u.username || u.password || u.port || /^[\d.]+$|^\[/.test(u.hostname))
      errors.push('updates.url must be a plain https:// address of your latest.json (no port, IP address or password).');
    else if (!get('publicKey')) warnings.push('updates without a publicKey: run "npx deskflow-addon keygen" and sign your releases, so nobody else can publish an update.');
  }
  const publicKey = get('publicKey');
  if (publicKey !== undefined && !isPublicKey(publicKey)) errors.push('publicKey must be an ECDSA P-256 public key (base64), as printed by "npx deskflow-addon keygen".');
  if (cmpVersion(String(min), MIN_DESKFLOW) < 0) warnings.push(`minDeskFlow ${min} is older than the first version with addons (${MIN_DESKFLOW}).`);
  return { errors, warnings, id, kind };
}

function lintWidget(w, settings, hosts, errors, warnings, folder) {
  if (w.width !== undefined && (typeof w.width !== 'number' || w.width < 80 || w.width > 640))
    warnings.push(`widget.width ${JSON.stringify(w.width)}: use a number from 80 to 640 (DeskFlow clamps it).`);
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
    if (type === 'history' && !s.of) errors.push(`source "${n}": a history source needs "of", the value to record (e.g. "sys.cpu").`);
    if (type === 'file' && !settings.some((x) => (x.key ?? x.Key) === s.setting && String(x.type ?? x.Type).toLowerCase() === 'file'))
      errors.push(`source "${n}": "setting" must name a setting of type "file".`);
    lintTemplate(s.url, `source "${n}".url`, errors, warnings);
  }
  const roots = new Set([...names, 'settings', 'item', 'calc']);
  const computed = w.computed ?? {};
  if (Object.keys(computed).length > 30) errors.push('widget.computed: at most 30 values.');
  for (const [k, v] of Object.entries(computed)) {
    if (typeof v !== 'string') errors.push(`computed.${k}: must be an expression (text), e.g. "now.unix / 86400".`);
    else lintExpression(v.trim().replace(/^=/, ''), `computed.${k}`, errors);
  }
  let count = 0;
  const walk = (node, depth, where) => {
    if (!node || typeof node !== 'object') return;
    if (++count > 300) return;
    if (depth > 12) { errors.push('layout: nested more than 12 levels deep.'); return; }
    const type = String(node.type ?? '').toLowerCase();
    if (!ELEMENTS.includes(type)) errors.push(`${where}: unknown element "${node.type}" (use ${ELEMENTS.join(', ')}).`);
    if (type === 'list' && !node.item) errors.push(`${where}: a list needs an "item" layout.`);
    if (type === 'chart') {
      const kind = String(node.kind ?? 'sparkline').toLowerCase();
      if (!['sparkline', 'line', 'bar', 'ring'].includes(kind)) errors.push(`${where}: unknown chart kind "${node.kind}" (use sparkline, line, bar or ring).`);
      else if (kind === 'ring' ? node.value === undefined : !node.values) errors.push(`${where}: a ${kind} chart needs "${kind === 'ring' ? 'value' : 'values'}".`);
    }
    if (type === 'button') {
      if (!ACTIONS.includes(node.action)) errors.push(`${where}: unknown button action "${node.action}" (use ${ACTIONS.join(', ')}).`);
      else if (/Setting$/.test(node.action)) {
        const st = settings.find((x) => (x.key ?? x.Key) === node.setting);
        const t = String(st?.type ?? st?.Type ?? 'text').toLowerCase();
        if (!st) errors.push(`${where}: "setting" must name one of your settings.`);
        else if (t === 'file') errors.push(`${where}: a button can't change a file setting (only the user picks files).`);
        else if (node.action === 'cycleSetting' && !['toggle', 'choice'].includes(t)) errors.push(`${where}: cycleSetting works on a toggle or choice setting.`);
        else if (node.action === 'stepSetting' && t !== 'number') errors.push(`${where}: stepSetting works on a number setting.`);
      }
      if (node.action === 'open' && typeof node.url === 'string' && !node.url.includes('{{') && !/^https:\/\//i.test(node.url))
        errors.push(`${where}: open only opens https:// pages.`);
    }
    for (const [k, v] of Object.entries(node))
      if (typeof v === 'string') {
        lintTemplate(v, `${where}.${k}`, errors, warnings);
        for (const m of v.matchAll(/\{\{\s*([A-Za-z_][\w]*)/g))
          if (!roots.has(m[1])) warnings.push(`${where}.${k}: "{{${m[1]}…}}" doesn't match a source name (${[...roots].join(', ')}).`);
      }
    if (type === 'image' && folder && typeof node.src === 'string' && node.src && !node.src.includes('{{') && !/^https:\/\//i.test(node.src)) {
      const file = path.join(folder, node.src);
      const ext = path.extname(node.src).toLowerCase();
      if (/^[a-z]+:/i.test(node.src) || path.isAbsolute(node.src) || node.src.includes('..')) errors.push(`${where}.src: "${node.src}" must be a file inside your addon (like images/logo.png) or an https:// URL.`);
      else if (!fs.existsSync(file)) errors.push(`${where}.src: "${node.src}" doesn't exist in your addon folder.`);
      else if (!IMAGE_EXT.includes(ext)) errors.push(`${where}.src: "${node.src}" isn't a PNG, JPG, GIF or BMP image.`);
      else if (!node.src.replace(/\\/g, '/').startsWith('images/')) warnings.push(`${where}.src: put images in the images/ folder; pack only includes that folder.`);
      else if (fs.statSync(file).size > MAX_FILE) errors.push(`${where}.src: "${node.src}" is larger than 15 MB.`);
    }
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
  if (errors.length) throw new UserError(`${label} has ${errors.length} problem${errors.length === 1 ? '' : 's'} to fix before you share it.`);
}

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

function isPublicKey(b64) {
  try {
    const key = crypto.createPublicKey({ key: Buffer.from(String(b64), 'base64'), format: 'der', type: 'spki' });
    return key.asymmetricKeyType === 'ec' && key.asymmetricKeyDetails?.namedCurve === 'prime256v1';
  } catch {
    return false;
  }
}

function publicKeyOf(pem) {
  return crypto.createPublicKey(pem).export({ type: 'spki', format: 'der' }).toString('base64');
}

function signBuffer(buffer, id, version, pem) {
  const sha = crypto.createHash('sha256').update(buffer).digest('hex');
  const message = `DeskFlow addon v1\n${String(id).toLowerCase()}\n${String(version).trim()}\n${sha}\n`;
  const sig = crypto.sign('sha256', Buffer.from(message, 'utf8'), { key: pem, dsaEncoding: 'ieee-p1363' }).toString('base64');
  return `untrusted comment: DeskFlow addon signature v1\n${id}\n${version}\n${sig}\n`;
}

function readZipEntry(file, wanted) {
  const buf = fs.readFileSync(file);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new UserError(`${path.basename(file)} isn't a .deskflow-addon (zip) file.`);
  let p = buf.readUInt32LE(eocd + 16);
  const count = buf.readUInt16LE(eocd + 10);
  for (let n = 0; n < count; n++) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), nameLen = buf.readUInt16LE(p + 28);
    const extra = buf.readUInt16LE(p + 30), comment = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (name === wanted) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      return method === 8 ? zlib.inflateRawSync(data) : data;
    }
    p += 46 + nameLen + extra + comment;
  }
  throw new UserError(`${path.basename(file)} has no ${wanted}.`);
}

function signFile(file, keyPath) {
  const keyFile = path.resolve(keyPath || 'deskflow-addon-key.pem');
  if (!fs.existsSync(keyFile)) throw new UserError(`No signing key at ${keyFile}. Make one with "npx deskflow-addon keygen", or pass --key <file>.`);
  const pem = fs.readFileSync(keyFile, 'utf8');
  const m = parseManifest(readZipEntry(file, 'addon.json'));
  const id = String(m.id ?? m.Id ?? '').trim().toLowerCase(), version = String(m.version ?? m.Version ?? '1.0.0').trim();
  const declared = m.publicKey ?? m.PublicKey;
  let mine;
  try { mine = publicKeyOf(pem); } catch (e) { throw new UserError(`${keyFile} isn't a valid private key: ${e.message}`); }
  if (!declared) throw new UserError('addon.json has no "publicKey", so DeskFlow couldn\'t check this signature. Add the key "keygen" printed, then pack again.');
  if (declared !== mine) throw new UserError('addon.json\'s publicKey doesn\'t belong to this signing key.');
  fs.writeFileSync(`${file}.sig`, signBuffer(fs.readFileSync(file), id, version, pem));
  console.log(`${green('✓')} Signed ${bold(path.basename(file))} ${dim(`→ ${path.basename(file)}.sig (upload it next to the package)`)}`);
}

function cmdKeygen(opts) {
  const out = path.resolve(opts.out || 'deskflow-addon-key.pem');
  if (fs.existsSync(out)) throw new UserError(`${out} already exists. Keep using it: a new key can't sign updates for people who installed your addon.`);
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  fs.writeFileSync(out, pem, { mode: 0o600 });
  const ignore = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(ignore) && !fs.readFileSync(ignore, 'utf8').includes(path.basename(out))) fs.appendFileSync(ignore, `${path.basename(out)}\n`);
  console.log(`${green('✓')} Created your signing key ${bold(path.relative(process.cwd(), out) || out)}`);
  console.log(`\n  Add this to addon.json:\n\n  ${cyan(`"publicKey": "${publicKeyOf(pem)}",`)}\n`);
  console.log(dim('  Keep the key file secret and backed up (it\'s in .gitignore). Losing it means people must reinstall to get updates;'));
  console.log(dim('  anyone who has it can publish updates as you. Sign releases with: npx deskflow-addon pack --sign ' + path.basename(out)));
}

function cmdSign(target, opts) {
  if (!target || !target.endsWith('.deskflow-addon')) throw new UserError('Sign a package: npx deskflow-addon sign my-addon-1.0.0.deskflow-addon [--key deskflow-addon-key.pem]');
  signFile(path.resolve(target), opts.key);
}

function cmdValidate(folder) {
  folder = path.resolve(folder || '.');
  const m = readManifest(folder);
  const result = validate(m, folder);
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
      if (PROVIDED_DLLS.includes(lower)) continue;
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
  if (opts.sign) signFile(file, opts.sign === true ? undefined : opts.sign);
  const updates = m.updates ?? m.Updates;
  if (updates?.url && !opts.out?.includes(os.tmpdir())) {
    const index = path.join(path.dirname(file), 'latest.json');
    const latest = {
      version: m.version ?? '1.0.0',
      download: new URL(path.basename(file), updates.url).href,
      changelog: typeof opts.changelog === 'string' ? opts.changelog : '',
      minDeskFlow: m.minDeskFlow ?? MIN_DESKFLOW,
    };
    fs.writeFileSync(index, JSON.stringify(latest, null, 2) + '\n');
    console.log(`${green('✓')} Wrote ${bold('latest.json')} ${dim(`· upload it to ${updates.url}, with ${path.basename(file)}${opts.sign ? ' and its .sig' : ''} at ${latest.download}`)}`);
  }
  return file;
}

function findDeskFlow() {
  const candidates = [
    process.env.DESKFLOW_EXE,
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'DeskFlow', 'DeskFlow.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'DeskFlow', 'DeskFlow.exe'),
  ];
  return candidates.find((c) => c && fs.existsSync(c)) ?? null;
}

function cmdInstall(target, opts) {
  let file = target ? path.resolve(target) : null;
  if (!file || fs.statSync(file).isDirectory()) file = cmdPack(file || '.', { ...opts, out: path.join(os.tmpdir(), `deskflow-addon-${Date.now()}.deskflow-addon`) });
  if (process.platform !== 'win32') throw new UserError('Installing needs Windows (DeskFlow is a Windows app). The packed file is ready to copy over.');
  const installed = findDeskFlow();
  const r = installed
    ? spawnSync(installed, ['--install', file], { stdio: 'ignore', detached: true })
    : spawnSync('cmd', ['/c', 'start', '""', file], { stdio: 'ignore' });
  if (r.error) throw new UserError(`Couldn't open DeskFlow: ${r.error.message}`);
  console.log(`${green('✓')} Opened in DeskFlow. Confirm the install prompt, then use ${bold('Add to desktop')} in Studio → Addons.`);
}

const LEVEL = {
  error: (s) => red(s.padEnd(7)),
  warn: (s) => yellow(s.padEnd(7)),
  denied: (s) => magenta(s.padEnd(7)),
  info: (s) => dim(s.padEnd(7)),
};
const LEVEL_NAME = { error: 'error', warn: 'warning', denied: 'blocked', info: 'info' };

function stamp() {
  return dim(new Date().toTimeString().slice(0, 8));
}

function compilerLines(output, folder) {
  const seen = new Set(), out = [];
  for (const line of output.split(/\r?\n/)) {
    const m = line.match(/^(.*?)\((\d+),(\d+)\):\s+(error|warning)\s+([A-Z]+\d+):\s+(.*?)(\s+\[[^\]]*\])?$/);
    if (!m) continue;
    const key = m.slice(1, 7).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const file = path.relative(folder, m[1]) || m[1];
    out.push({ error: m[4] === 'error', text: `${file}:${m[2]}:${m[3]} ${dim(m[5])} ${m[6]}` });
  }
  return out;
}

function cmdDev(target, opts) {
  if (process.platform !== 'win32') throw new UserError('Live development needs Windows (DeskFlow is a Windows app). Use validate and pack elsewhere.');
  const folder = path.resolve(target || '.');
  const { m, result } = cmdValidate(folder);
  const exe = findDeskFlow();
  if (!exe) throw new UserError('DeskFlow isn\'t installed (looked in %LOCALAPPDATA%\\Programs\\DeskFlow). Install it, or set DESKFLOW_EXE.');
  const plugin = result.kind === 'plugin';
  const csproj = plugin ? fs.readdirSync(folder).find((f) => f.endsWith('.csproj')) : null;
  if (plugin && !csproj) throw new UserError('No .csproj in this folder, so the plugin can\'t be built.');

  const log = path.join(process.env.APPDATA || '', 'DeskFlow', 'dev', `${result.id}.jsonl`);
  let offset = fs.existsSync(log) ? fs.statSync(log).size : 0;
  let building = false, again = false, linked = false;

  const link = () => {
    if (linked) return;
    linked = true;
    const args = ['--dev-link', folder];
    if (!opts.desktop) args.push('--dev-preview', folder);
    if (opts.sandbox) args.push('--sandbox');
    spawn(exe, args, { detached: true, stdio: 'ignore' }).unref();
    const where = opts.sandbox ? 'and started a sandbox' : opts.desktop ? '(add it from Studio → Addons)' : 'and opened the previewer';
    console.log(`${stamp()} ${green('✓')} Linked ${bold(m.name)} in DeskFlow ${where} ${dim('· confirm the prompt there the first time')}`);
  };

  const build = () => {
    if (building) { again = true; return; }
    building = true;
    const started = Date.now();
    console.log(`${stamp()} ${dim(`Building ${csproj}…`)}`);
    let output = '';
    const child = spawn('dotnet', ['build', csproj, '-c', 'Debug', '-nologo', '-v', 'q', '-clp:NoSummary'], { cwd: folder });
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    child.on('error', (e) => {
      building = false;
      console.log(`${stamp()} ${red('✗')} Couldn't run dotnet: ${e.message}. Is the .NET 10 SDK installed? https://dot.net`);
    });
    child.on('close', (code) => {
      building = false;
      const lines = compilerLines(output, folder);
      for (const l of lines) console.log(`    ${l.error ? red('error') : yellow('warning')} ${l.text}`);
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      if (code === 0) {
        console.log(`${stamp()} ${green('✓')} Built in ${secs} s${linked ? dim(' · DeskFlow reloads it') : ''}`);
        link();
      } else {
        if (!lines.length) console.log(output.trim().split(/\r?\n/).slice(-15).map((l) => '    ' + l).join('\n'));
        console.log(`${stamp()} ${red('✗')} Build failed${linked ? dim(' · DeskFlow keeps the last working version') : ''}`);
      }
      if (again) { again = false; build(); }
    });
  };

  const check = () => {
    try {
      const r = validate(readManifest(folder));
      for (const w of r.warnings) console.log(`    ${yellow('warning')} ${w}`);
      for (const e of r.errors) console.log(`    ${red('error')}   ${e}`);
      if (r.errors.length) console.log(`${stamp()} ${red('✗')} addon.json has ${r.errors.length} problem${r.errors.length === 1 ? '' : 's'}${dim(' · fix before you share it; DeskFlow reports what happens below')}`);
      else console.log(`${stamp()} ${green('✓')} addon.json is valid${dim(' · DeskFlow reloads it')}`);
    } catch (e) {
      if (!(e instanceof UserError)) throw e;
      console.log(`${stamp()} ${red('✗')} ${e.message}${dim(' · DeskFlow keeps the last working version')}`);
    }
  };

  const tail = () => {
    let size;
    try { size = fs.statSync(log).size; } catch { return; }
    if (size < offset) offset = 0;
    if (size === offset) return;
    const fd = fs.openSync(log, 'r');
    const buf = Buffer.alloc(size - offset);
    fs.readSync(fd, buf, 0, buf.length, offset);
    fs.closeSync(fd);
    offset = size;
    for (const line of buf.toString('utf8').split('\n')) {
      if (!line.trim()) continue;
      let e;
      try { e = JSON.parse(line); } catch { continue; }
      const level = LEVEL[e.level] ? e.level : 'info';
      const msg = level === 'info' ? dim(e.message) : e.message;
      console.log(`${dim(e.time)} ${LEVEL[level](LEVEL_NAME[level])} ${bold(e.category)}: ${msg}`);
      if (e.details && level === 'error') console.log(dim(e.details.split(/\r?\n/).slice(0, 6).map((l) => '      ' + l.trim()).join('\n')));
    }
  };

  let timer = null;
  const changed = (file) => {
    const rel = String(file || '').replace(/\\/g, '/');
    if (/(^|\/)(bin|obj|node_modules|\.git|\.vs)\//i.test(rel + '/') && !/^addon\.json$/i.test(rel)) return;
    const relevant = plugin ? /\.(cs|csproj|xaml|resx|json)$/i.test(rel) : /^addon\.json$/i.test(rel) || /^images\//i.test(rel);
    if (!relevant) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log(`${stamp()} ${cyan('↻')} ${rel}`);
      if (/^addon\.json$/i.test(rel)) check();
      if (plugin && !/^addon\.json$/i.test(rel)) build();
    }, 300);
  };

  console.log(`\n${bold('deskflow-addon dev')} ${dim(`· ${plugin ? 'C# plugin' : 'safe addon'} · ${folder}`)}`);
  console.log(dim(`Edit your files and DeskFlow reloads the widget. Press Ctrl+C to stop${opts.keep ? '' : ' (this unlinks the folder)'}.\n`));
  if (plugin) build();
  else link();
  fs.watch(folder, { recursive: true }, (_, file) => changed(file));
  setInterval(tail, 400);

  process.on('SIGINT', () => {
    if (!opts.keep && linked) {
      spawnSync(exe, ['--dev-unlink', folder], { stdio: 'ignore' });
      console.log(`\n${green('✓')} Unlinked. Your widget positions are kept for next time.`);
    } else console.log('');
    process.exit(0);
  });
}

function deskflowVersion(exe) {
  const r = spawnSync('powershell', ['-NoProfile', '-Command', `(Get-Item -LiteralPath '${exe.replace(/'/g, "''")}').VersionInfo.ProductVersion`], { encoding: 'utf8' });
  const v = (r.stdout || '').trim().split('+')[0];
  return /^\d+(\.\d+)+/.test(v) ? v : null;
}

function latestVersion() {
  return new Promise((resolve) => {
    const req = require('https').get('https://registry.npmjs.org/deskflow-addon/latest', { timeout: 6000 }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => { try { resolve(JSON.parse(body).version || null); } catch { resolve(null); } });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

async function cmdDoctor(opts) {
  let problems = 0;
  const ok = (m) => console.log(`  ${green('✓')} ${m}`);
  const warn = (m, fix) => console.log(`  ${yellow('!')} ${m}${fix ? dim(` → ${fix}`) : ''}`);
  const fail = (m, fix) => { problems++; console.log(`  ${red('✗')} ${m}${fix ? dim(` → ${fix}`) : ''}`); };
  console.log(`${bold('deskflow-addon doctor')} ${dim(VERSION)}\n`);

  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 18) ok(`Node.js ${process.versions.node}`);
  else fail(`Node.js ${process.versions.node} is too old`, 'install Node 18 or newer from https://nodejs.org');
  if (process.platform === 'win32') ok(`Windows (${os.release()})`);
  else warn('Not Windows: validate and pack work, but DeskFlow, dev and install need Windows');

  const sdks = spawnSync('dotnet', ['--list-sdks'], { encoding: 'utf8' });
  const v10 = sdks.error ? [] : sdks.stdout.split(/\r?\n/).filter((l) => /^10\./.test(l)).map((l) => l.split(' ')[0]);
  if (v10.length) ok(`.NET SDK ${v10[v10.length - 1]} (for C# plugins)`);
  else warn(sdks.error ? '.NET SDK not found' : 'No .NET 10 SDK', 'only needed for C# plugins: https://dot.net');
  if (fs.existsSync(path.join(SDK_DIR, 'DeskFlow.dll'))) ok('Plugin SDK (reference DeskFlow.dll) included');
  else warn('The plugin SDK is missing from this package', 'reinstall: npx deskflow-addon@latest');

  if (process.platform === 'win32') {
    const exe = findDeskFlow();
    if (!exe) fail('DeskFlow isn\'t installed', 'https://github.com/Silverfox0338/DeskFlow-Releases/releases');
    else {
      const v = deskflowVersion(exe);
      ok(`DeskFlow ${v ?? '(version unknown)'} ${dim(exe)}`);
      if (v && cmpVersion(v, '0.6.1') < 0) warn(`DeskFlow ${v} has no developer mode`, 'update DeskFlow to use "dev"');
      const tasks = spawnSync('tasklist', ['/FI', 'IMAGENAME eq DeskFlow.exe', '/NH'], { encoding: 'utf8' });
      if (/DeskFlow\.exe/i.test(tasks.stdout || '')) ok('DeskFlow is running');
      else warn('DeskFlow isn\'t running', '"dev" and "install" start it');
      try {
        const settings = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA || '', 'DeskFlow', 'settings.json'), 'utf8').replace(/^\uFEFF/, ''));
        if (settings.DeveloperMode) ok('Developer mode is on');
        else warn('Developer mode is off', '"dev" asks to turn it on (or Studio → Addons)');
      } catch { warn('Couldn\'t read DeskFlow\'s settings'); }
    }
  }

  if (opts.offline) warn('Skipped the npm version check (--offline)');
  else {
    const latest = await latestVersion();
    if (!latest) warn('Couldn\'t reach npm to check for a newer deskflow-addon');
    else if (cmpVersion(latest, VERSION) > 0) warn(`deskflow-addon ${latest} is available (you ran ${VERSION})`, 'npx deskflow-addon@latest …');
    else if (cmpVersion(latest, VERSION) < 0) ok(`deskflow-addon ${VERSION} ${dim(`(newer than npm's ${latest})`)}`);
    else ok(`deskflow-addon ${VERSION} is the latest`);
  }
  console.log(problems ? `\n${red(`${problems} problem${problems === 1 ? '' : 's'} to fix.`)}` : `\n${green('Ready to make addons.')}`);
  if (problems) process.exitCode = 1;
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
      $schema: SCHEMA_URL, id, name: display, version: '1.0.0', author, description: 'A DeskFlow code plugin.', glyph: 'E8E1',
      minDeskFlow: MIN_DESKFLOW, kind: 'plugin', assembly: `${cls}.dll`,
    }, null, 2) + '\n');
    write(`${cls}.csproj`, `
<Project Sdk="Microsoft.NET.Sdk">
  <!--
    Compiles against lib\\DeskFlow.dll, the DeskFlow plugin SDK: just the public plugin API, with IntelliSense docs.
    DeskFlow supplies the real DeskFlow.dll when your plugin runs, so it's never copied into the build (Private=false).
  -->
  <PropertyGroup>
    <TargetFramework>net10.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <EnableDynamicLoading>true</EnableDynamicLoading>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="DeskFlow">
      <HintPath>lib\\DeskFlow.dll</HintPath>
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

    public ${cls}Widget() => _text.SetResourceReference(TextBlock.ForegroundProperty, ThemeKeys.Text); // follow the theme

    public void Initialize(WidgetContext context) => _context = context; // context.Settings.Options + context.Save()

    public IEnumerable<Control> CreateSettingsMenuItems() => Array.Empty<Control>();

    public void OnVisibilityChanged(bool visible) { } // pause timers while hidden

    public void Dispose() { }
}
`);
    write('.gitignore', 'bin/\nobj/\n*.deskflow-addon\n');
    fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
    for (const f of ['DeskFlow.dll', 'DeskFlow.xml'])
      if (fs.existsSync(path.join(SDK_DIR, f))) fs.copyFileSync(path.join(SDK_DIR, f), path.join(dir, 'lib', f));
  } else {
    write('addon.json', JSON.stringify({
      $schema: SCHEMA_URL, id, name: display, version: '1.0.0', author, description: 'Made with deskflow-addon.', glyph: 'E8E1',
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
npx deskflow-addon dev           # live: DeskFlow reloads the widget every time you save
npx deskflow-addon validate      # check addon.json
npx deskflow-addon install       # pack it and open it in DeskFlow's install prompt
npx deskflow-addon pack          # build the .deskflow-addon to share
\`\`\`

Guide: https://github.com/Silverfox0338/DeskFlow-Releases/blob/main/ADDONS.md
`);
  const rel = path.relative(process.cwd(), dir) || '.';
  console.log(`${green('✓')} Created ${bold(display)} ${dim(`(${opts.plugin ? 'C# plugin' : 'safe addon'}, id ${id})`)} in ${cyan(rel)}`);
  console.log(`\n  cd ${rel}\n  npx deskflow-addon dev       ${dim('# live: reloads in DeskFlow every time you save')}\n`);
  if (opts.plugin) console.log(dim('  Needs the .NET 10 SDK (https://dot.net). The plugin SDK is in lib\\DeskFlow.dll.'));
  console.log(dim('  addon.json has a $schema, so VS Code autocompletes it and explains every field.'));
}

function help() {
  console.log(`${bold('deskflow-addon')} ${dim(VERSION)}: make addons for DeskFlow

  ${cyan('npx deskflow-addon new <name>')} [--plugin] [--id com.you.name] [--author "You"]
      Start a new addon in ./<name> (a safe addon, or a C# plugin with --plugin).
  ${cyan('npx deskflow-addon validate')} [folder]
      Check addon.json with the same rules DeskFlow uses (plus layout and source hints).
  ${cyan('npx deskflow-addon pack')} [folder] [--out file] [--no-build] [--from dir] [--sign key.pem] [--changelog "text"]
      Build the .deskflow-addon file. Plugins are built with dotnet first. With "updates" in addon.json it
      also writes latest.json; --sign signs the package (.sig) with your key.
  ${cyan('npx deskflow-addon keygen')} [--out file]
      Make a signing key and print the publicKey for addon.json (signed updates, DeskFlow 0.6.5+).
  ${cyan('npx deskflow-addon sign')} <file.deskflow-addon> [--key file]
      Sign a package you already built.
  ${cyan('npx deskflow-addon install')} [folder|file]
      Pack (if needed) and open it in DeskFlow's install prompt.
  ${cyan('npx deskflow-addon doctor')} [--offline]
      Check Node.js, the .NET SDK, DeskFlow (version, running, developer mode) and this tool.
  ${cyan('npx deskflow-addon dev')} [folder] [--keep] [--desktop] [--sandbox]
      Live development: links the folder in DeskFlow (developer mode) and opens it in the
      previewer; reloads on every save, rebuilds plugins, and prints errors and blocked requests
      from inside DeskFlow. --desktop skips the previewer, --sandbox also starts a throwaway
      DeskFlow, --keep leaves the folder linked when you stop.

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
    case 'dev': case 'watch': return cmdDev(target, args);
    case 'doctor': return cmdDoctor(args);
    case 'keygen': return cmdKeygen(args);
    case 'sign': return cmdSign(target, args);
    default: throw new UserError(`Unknown command "${cmd}". Run "npx deskflow-addon --help".`);
  }
}

if (require.main === module) {
  Promise.resolve().then(main).catch((e) => {
    if (e instanceof UserError) {
      console.error(`${red('✗')} ${e.message}`);
      process.exit(1);
    }
    console.error(e);
    process.exit(1);
  });
}

module.exports = { validate, lintTemplate, writeZip, readZipEntry, crc32, compilerLines, signBuffer, publicKeyOf, isPublicKey };
