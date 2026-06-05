'use strict';

// ---- Constants ----
const SECTIONS = [
  { id: 'fach', label: 'Oberfach',    icon: 'box'  },
  { id: 's1',   label: 'Schublade 1', icon: 'menu' },
  { id: 's2',   label: 'Schublade 2', icon: 'menu' },
  { id: 's3',   label: 'Schublade 3', icon: 'menu' },
  { id: 's4',   label: 'Schublade 4', icon: 'menu' },
  { id: 's5',   label: 'Schublade 5', icon: 'menu' },
];

const DEFAULT_CATS = ['Brot','Eis','Fertiges Essen','Fisch','Fleisch','Gemüse','Obst','Sonstiges'];
const STORAGE_KEY   = 'gefrierapp-items-v1';
const CATS_KEY      = 'gefrierapp-cats-v1';
const BANNER_KEY    = 'gefrierapp-banner-dismissed';

// ---- State ----
let items     = [];
let cats      = [];
let view      = 'uebersicht';
let search    = '';
let catFilter = '';
let collapsed = {};
let showForm  = false;
let editId    = null;
let showBanner = false;
// cat management sheet
let showCatSheet = false;
let catEditName  = '';
let catNewInput  = '';
// import sheet
let showImport   = false;
let importState  = null; // { rows, errors, ready } after parsing

function today() { return new Date().toISOString().slice(0,10); }
function uid()   { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ---- Persistence ----
function load() {
  try { items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { items = []; }
  try {
    const stored = localStorage.getItem(CATS_KEY);
    cats = stored ? JSON.parse(stored) : [...DEFAULT_CATS];
  } catch(e) { cats = [...DEFAULT_CATS]; }
}

function save()     { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function saveCats() { localStorage.setItem(CATS_KEY, JSON.stringify(cats)); }

// ---- Helpers ----
function daysLeft(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

function fmtDate(d) {
  if (!d) return '';
  const [y,m,day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function filtered() {
  return items.filter(it => {
    if (catFilter && it.category !== catFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    const sec = SECTIONS.find(x => x.id === it.section)?.label || '';
    return [it.name, it.category, sec, it.stored, it.expires].some(v => v?.toLowerCase().includes(s));
  });
}

// ---- SVG Icons ----
const ICONS = {
  snowflake: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/><circle cx="12" cy="12" r="2"/></svg>`,
  plus:      `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit:      `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:     `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  check:     `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  search:    `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  grid:      `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  list:      `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  bar:       `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  chevdown:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  chevright: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>`,
  box:       `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  menu:      `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></svg>`,
  info:      `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  x:         `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  tag:       `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  upload:    `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
  settings:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
};

function icon(name, cls='') {
  const s = ICONS[name] || '';
  return s.replace('<svg ', `<svg class="${cls}" `);
}

// ---- DOM helpers ----
function el(tag, attrs={}, ...children) {
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

function html(str) {
  const d = document.createElement('div');
  d.innerHTML = str;
  return d.firstElementChild;
}

// ---- Item card ----
function renderItem(it, showSection=false) {
  const days = daysLeft(it.expires);
  let expTag = '';
  if (days !== null) {
    if (days < 0)       expTag = `<span class="tag danger">Abgelaufen</span>`;
    else if (days <= 7) expTag = `<span class="tag warn">${days === 0 ? 'Heute' : days + 'd'}</span>`;
  }
  const metaParts = [`Seit ${fmtDate(it.stored)}`];
  if (it.expires) metaParts.push(`MHD ${fmtDate(it.expires)}`);
  if (showSection) metaParts.push(SECTIONS.find(s=>s.id===it.section)?.label||'');

  const card = html(`
    <div class="item${it.present ? '' : ' consumed'}" data-id="${it.id}">
      <button class="check-btn${it.present ? '' : ' done'}" data-action="toggle"
        aria-label="${it.present ? 'Als verbraucht markieren' : 'Als vorhanden markieren'}">
        ${icon('check')}
      </button>
      <div class="item-body">
        <div class="item-name">${it.name}</div>
        <div class="item-meta">${metaParts.join(' · ')}</div>
        <div class="item-tags">
          <span class="tag">${it.category}</span>
          ${expTag}
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-action="edit"  aria-label="Bearbeiten">${icon('edit')}</button>
        <button class="icon-btn" data-action="del"   aria-label="Löschen">${icon('trash')}</button>
      </div>
    </div>`);

  card.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'toggle') toggleItem(it.id);
    if (btn.dataset.action === 'edit')   openEdit(it);
    if (btn.dataset.action === 'del')    confirmDelete(it.id);
  });
  return card;
}

// ---- Views ----
function renderUebersicht(content) {
  const filt = filtered();
  SECTIONS.forEach(sec => {
    const secItems   = filt.filter(i => i.section === sec.id);
    const isCollapsed = collapsed[sec.id];
    const section    = el('div', { class: 'section' });

    const head = html(`
      <div class="section-head">
        <div class="section-head-left">${icon(sec.icon)} ${sec.label}</div>
        <div class="section-head-right">
          <span>${secItems.length} Artikel</span>
          ${isCollapsed ? icon('chevright') : icon('chevdown')}
        </div>
      </div>`);
    head.addEventListener('click', () => { collapsed[sec.id] = !collapsed[sec.id]; render(); });
    section.appendChild(head);

    if (!isCollapsed) {
      const body = el('div', { class: 'section-body' });
      secItems.forEach(it => body.appendChild(renderItem(it)));
      const addBtn = html(`<button class="add-row">${icon('plus')} Hinzufügen</button>`);
      addBtn.addEventListener('click', () => openAdd(sec.id));
      body.appendChild(addBtn);
      section.appendChild(body);
    }
    content.appendChild(section);
  });
}

function renderSuche(content) {
  const filt = filtered();
  if (!filt.length) {
    content.innerHTML = `<div class="empty">${icon('search')}<br>${search||catFilter?'Keine Treffer.':'Noch keine Artikel eingetragen.'}</div>`;
    return;
  }
  filt.forEach(it => content.appendChild(renderItem(it, true)));
}

function renderStatistik(content) {
  const present  = items.filter(i => i.present);
  const expiring = items.filter(i => { const d=daysLeft(i.expires); return d!==null&&d>=0&&d<=7; });
  const expired  = items.filter(i => { const d=daysLeft(i.expires); return d!==null&&d<0; });

  const grid = el('div', { class: 'stats-grid' });
  [[present.length,'Vorrätig',''], [items.length,'Gesamt',''],
   [expiring.length,'Läuft bald ab','warn'], [expired.length,'Abgelaufen','danger']
  ].forEach(([v,l,c]) => {
    grid.appendChild(html(`<div class="stat-card"><div class="stat-label">${l}</div><div class="stat-val ${c}">${v}</div></div>`));
  });
  content.appendChild(grid);

  content.appendChild(html(`<div class="sec-title">Kategorien (vorhanden)</div>`));
  const catCounts = Object.fromEntries(cats.map(c=>[c,0]));
  present.forEach(i => { if (i.category in catCounts) catCounts[i.category]++; });
  const catWrap = el('div');
  const entries = Object.entries(catCounts).filter(([,v])=>v>0);
  if (!entries.length) {
    catWrap.innerHTML = '<div class="cat-row" style="color:var(--text3)">Keine Artikel vorhanden.</div>';
  } else {
    entries.forEach(([cat,cnt]) => catWrap.appendChild(html(`<div class="cat-row"><span>${cat}</span><span style="font-weight:600">${cnt}</span></div>`)));
  }
  content.appendChild(catWrap);

  content.appendChild(html(`<div class="sec-title" style="margin-top:18px">Belegung je Bereich</div>`));
  SECTIONS.forEach(sec => {
    const cnt = present.filter(i=>i.section===sec.id).length;
    if (!cnt) return;
    content.appendChild(html(`<div class="cat-row"><span>${sec.label}</span><span style="font-weight:600">${cnt}</span></div>`));
  });
}

// ---- Category management sheet ----
function renderCatSheet() {
  const ov = el('div', { class: 'overlay', id: 'cat-overlay' });
  ov.addEventListener('click', e => { if (e.target === ov) { showCatSheet=false; render(); } });

  const sheet = el('div', { class: 'sheet' });
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">
      Kategorien verwalten
      <button class="icon-btn" id="cat-close" aria-label="Schließen">${icon('x')}</button>
    </div>
    <div id="cat-list"></div>
    <div class="cat-add-row" style="margin-top:14px">
      <input id="cat-new-inp" placeholder="Neue Kategorie…" value="${catNewInput}" autocomplete="off" />
      <button class="icon-btn cat-add-btn" id="cat-add-btn" aria-label="Hinzufügen">${icon('plus')}</button>
    </div>
    <p class="cat-hint">Kategorien mit Artikeln können nicht gelöscht werden.</p>`;

  // Populate list
  const list = sheet.querySelector('#cat-list');
  cats.forEach(cat => {
    const inUse = items.some(i => i.category === cat);
    const row = html(`
      <div class="cat-manage-row">
        <span class="cat-manage-label">${cat}</span>
        <div class="cat-manage-actions">
          <button class="icon-btn" data-cat-edit="${cat}" aria-label="Umbenennen">${icon('edit')}</button>
          <button class="icon-btn${inUse?' cat-del-disabled':''}" data-cat-del="${cat}"
            aria-label="${inUse?'Wird verwendet':'Löschen'}" ${inUse?'disabled':''}>${icon('trash')}</button>
        </div>
      </div>`);
    list.appendChild(row);
  });

  // Inline rename form if active
  if (catEditName) {
    const existingRow = [...list.querySelectorAll('[data-cat-edit]')]
      .find(b => b.dataset.catEdit === catEditName)?.closest('.cat-manage-row');
    if (existingRow) {
      existingRow.outerHTML; // replaced below
      const idx = cats.indexOf(catEditName);
      const editRow = html(`
        <div class="cat-edit-inline">
          <input id="cat-rename-inp" value="${catEditName}" autocomplete="off" />
          <button class="icon-btn" id="cat-rename-ok"  aria-label="Speichern">${icon('check')}</button>
          <button class="icon-btn" id="cat-rename-x"   aria-label="Abbrechen">${icon('x')}</button>
        </div>`);
      existingRow.replaceWith(editRow);
      setTimeout(() => {
        const inp = sheet.querySelector('#cat-rename-inp');
        if (inp) { inp.focus(); inp.select(); }
      }, 30);
    }
  }

  // Events
  sheet.querySelector('#cat-close').addEventListener('click', () => { showCatSheet=false; catEditName=''; catNewInput=''; render(); });

  list.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-cat-edit]');
    const delBtn  = e.target.closest('[data-cat-del]:not([disabled])');
    if (editBtn) { catEditName = editBtn.dataset.catEdit; render(); return; }
    if (delBtn)  {
      const name = delBtn.dataset.catDel;
      cats = cats.filter(c => c !== name);
      if (catFilter === name) catFilter = '';
      saveCats(); render(); return;
    }
  });

  // Save rename
  const renameOk = sheet.querySelector('#cat-rename-ok');
  const renameX  = sheet.querySelector('#cat-rename-x');
  if (renameOk) {
    const doRename = () => {
      const newName = sheet.querySelector('#cat-rename-inp')?.value.trim();
      if (newName && newName !== catEditName && !cats.includes(newName)) {
        const idx = cats.indexOf(catEditName);
        cats[idx] = newName;
        items.forEach(i => { if (i.category === catEditName) i.category = newName; });
        if (catFilter === catEditName) catFilter = newName;
        save(); saveCats();
      }
      catEditName = '';
      render();
    };
    renameOk.addEventListener('click', doRename);
    renameX.addEventListener('click', () => { catEditName=''; render(); });
    sheet.querySelector('#cat-rename-inp')?.addEventListener('keydown', e => {
      if (e.key==='Enter') doRename();
      if (e.key==='Escape') { catEditName=''; render(); }
    });
  }

  // Add new
  const addBtn = sheet.querySelector('#cat-add-btn');
  const addInp = sheet.querySelector('#cat-new-inp');
  const doAdd = () => {
    const name = addInp.value.trim();
    if (!name || cats.includes(name)) { addInp.focus(); return; }
    cats.push(name);
    catNewInput = '';
    saveCats(); render();
  };
  addBtn.addEventListener('click', doAdd);
  addInp.addEventListener('keydown', e => { if (e.key==='Enter') doAdd(); });
  addInp.addEventListener('input',   e => { catNewInput = e.target.value; });
  setTimeout(() => {
    if (!catEditName) sheet.querySelector('#cat-new-inp')?.focus();
  }, 50);

  ov.appendChild(sheet);
  return ov;
}

// ---- Item form ----
let formData = {};

function openAdd(secId) {
  formData = { name:'', section: secId||'fach', category: cats[0]||'Sonstiges', stored: today(), expires:'', present: true };
  editId = null; showForm = true; render();
  setTimeout(() => document.getElementById('f-name')?.focus(), 50);
}

function openEdit(it) {
  formData = { ...it };
  editId = it.id; showForm = true; render();
  setTimeout(() => document.getElementById('f-name')?.focus(), 50);
}

function submitForm() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { document.getElementById('f-name').focus(); return; }
  formData.name     = name;
  formData.section  = document.getElementById('f-section').value;
  formData.category = document.getElementById('f-cat').value;
  formData.stored   = document.getElementById('f-stored').value;
  formData.expires  = document.getElementById('f-expires').value;
  if (editId) {
    const idx = items.findIndex(i => i.id === editId);
    if (idx >= 0) items[idx] = { ...formData, id: editId };
  } else {
    items.push({ ...formData, id: uid() });
  }
  showForm = false; editId = null;
  save(); render();
}

function renderForm() {
  const ov = el('div', { class: 'overlay', id: 'form-overlay' });
  ov.addEventListener('click', e => { if (e.target === ov) { showForm=false; render(); } });

  const sheet = el('div', { class: 'sheet' });
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">
      ${editId ? 'Artikel bearbeiten' : 'Neuer Artikel'}
      <button class="icon-btn" id="f-close" aria-label="Schließen">${icon('x')}</button>
    </div>
    <div class="form-group">
      <label class="form-label" for="f-name">Bezeichnung</label>
      <input id="f-name" placeholder="z. B. Hähnchenbrust" value="${formData.name}" autocomplete="off" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="f-section">Bereich</label>
        <select id="f-section">${SECTIONS.map(s=>`<option value="${s.id}"${formData.section===s.id?' selected':''}>${s.label}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-cat">Kategorie</label>
        <select id="f-cat">${cats.map(c=>`<option value="${c}"${formData.category===c?' selected':''}>${c}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="f-stored">Eingelagert am</label>
        <input type="date" id="f-stored" value="${formData.stored}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="f-expires">MHD (optional)</label>
        <input type="date" id="f-expires" value="${formData.expires}" />
      </div>
    </div>
    <button class="btn-save" id="f-submit">${editId ? 'Speichern' : 'Hinzufügen'}</button>`;

  sheet.querySelector('#f-close').addEventListener('click', () => { showForm=false; render(); });
  sheet.querySelector('#f-submit').addEventListener('click', submitForm);
  sheet.querySelector('#f-name').addEventListener('keydown', e => { if (e.key==='Enter') submitForm(); });

  ov.appendChild(sheet);
  return ov;
}

// ---- Actions ----
function toggleItem(id) {
  const it = items.find(i=>i.id===id);
  if (it) { it.present = !it.present; save(); render(); }
}

function confirmDelete(id) {
  const it = items.find(i=>i.id===id);
  if (!it) return;
  if (confirm(`"${it.name}" löschen?`)) { items = items.filter(i=>i.id!==id); save(); render(); }
}

// ---- CSV Import ----
const SECTION_MAP = {
  'klappe':     'fach',
  'oberfach':   'fach',
  'schublade 1':'s1',
  'schublade 2':'s2',
  'schublade 3':'s3',
  'schublade 4':'s4',
  'schublade 5':'s5',
};

function parseDateDE(str) {
  // DD.MM.YYYY -> YYYY-MM-DD
  if (!str || !str.trim()) return '';
  const m = str.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const rows = [];
  const errors = [];
  // detect separator (semicolon or comma)
  const sep = lines[0].includes(';') ? ';' : ',';
  const header = lines[0].split(sep).map(h => h.trim().toLowerCase());

  // flexible column mapping
  const col = name => header.findIndex(h => h.includes(name));
  const iArt        = col('art');        // category
  const iEinlag     = col('einlager');   // stored date
  const iBeschr     = col('beschr');     // name/description
  const iAbteil     = col('abteil');     // section
  const iEntnommen  = col('entnommen');  // present (inverse)
  const iMHD        = col('mhd');        // optional expiry

  if (iArt < 0 || iEinlag < 0 || iBeschr < 0 || iAbteil < 0) {
    return { rows: [], errors: ['Spalten nicht erkannt. Erwartet: Art, Einlagerung, Beschreibung, Abteil'] };
  }

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const cols = raw.split(sep);
    const art      = (cols[iArt]       || '').trim();
    const einlag   = (cols[iEinlag]    || '').trim();
    const beschr   = (cols[iBeschr]    || '').trim();
    const abteil   = (cols[iAbteil]    || '').trim();
    const entnom   = iEntnommen >= 0 ? (cols[iEntnommen] || '').trim().toLowerCase() : 'nein';
    const mhd      = iMHD >= 0 ? (cols[iMHD] || '').trim() : '';

    if (!beschr && !art) continue;

    const secKey = SECTION_MAP[abteil.toLowerCase()];
    const stored  = parseDateDE(einlag);
    const expires = parseDateDE(mhd);
    const present = !(entnom === 'ja' || entnom === 'yes' || entnom === '1' || entnom === 'true');

    if (!secKey) { errors.push(`Zeile ${i+1}: Abteil "${abteil}" unbekannt, wird als Oberfach importiert.`); }

    // add category if new
    if (art && !cats.includes(art)) cats.push(art);

    rows.push({
      id:       uid(),
      name:     beschr || art,
      category: art || 'Sonstiges',
      section:  secKey || 'fach',
      stored:   stored || today(),
      expires,
      present,
    });
  }
  return { rows, errors };
}

function renderImportSheet() {
  const ov = el('div', { class: 'overlay', id: 'import-overlay' });
  ov.addEventListener('click', e => { if (e.target === ov) { showImport=false; importState=null; render(); } });

  const sheet = el('div', { class: 'sheet' });

  if (!importState) {
    // Step 1: file picker
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="sheet-title">
        CSV importieren
        <button class="icon-btn" id="imp-close" aria-label="Schließen">${icon('x')}</button>
      </div>
      <p class="cat-hint" style="font-size:14px;color:var(--text2);text-align:left;margin-bottom:16px">
        Ninox-Export (CSV, Semikolon-getrennt) auswählen.<br>
        Spalten: <strong>Art · Einlagerung · Beschreibung · Abteil · Entnommen</strong>
      </p>
      <label class="imp-file-label" id="imp-file-label">
        ${icon('upload')}
        <span>CSV-Datei auswählen</span>
        <input type="file" id="imp-file" accept=".csv,text/csv" style="display:none" />
      </label>`;

    sheet.querySelector('#imp-close').addEventListener('click', () => { showImport=false; importState=null; render(); });
    sheet.querySelector('#imp-file-label').addEventListener('click', () => sheet.querySelector('#imp-file').click());
    sheet.querySelector('#imp-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        importState = parseCSV(ev.target.result);
        render();
      };
      reader.readAsText(file, 'UTF-8');
    });

  } else {
    // Step 2: preview & confirm
    const { rows, errors } = importState;
    const dupes = rows.filter(r => items.some(i => i.name === r.name && i.stored === r.stored && i.section === r.section));
    const newRows = rows.filter(r => !dupes.includes(r));

    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="sheet-title">
        Import-Vorschau
        <button class="icon-btn" id="imp-close2" aria-label="Schließen">${icon('x')}</button>
      </div>
      ${errors.length ? `<div class="imp-warn">${icon('info')} ${errors.length} Hinweis${errors.length>1?'e':''}: ${errors[0]}${errors.length>1?` (+${errors.length-1})`:''}</div>` : ''}
      <div class="imp-summary">
        <div class="imp-sum-row"><span>Gefunden</span><strong>${rows.length} Artikel</strong></div>
        <div class="imp-sum-row"><span>Neu (werden importiert)</span><strong style="color:var(--accent)">${newRows.length}</strong></div>
        <div class="imp-sum-row"><span>Bereits vorhanden (übersprungen)</span><strong style="color:var(--text3)">${dupes.length}</strong></div>
      </div>
      <div id="imp-preview"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="icon-btn" id="imp-back" style="flex:0 0 44px;height:44px">${icon('x')}</button>
        <button class="btn-save" id="imp-confirm" ${newRows.length===0?'disabled style="opacity:0.4"':''}>
          ${newRows.length} Artikel importieren
        </button>
      </div>`;

    // Preview list (max 8)
    const preview = sheet.querySelector('#imp-preview');
    const show = newRows.slice(0,8);
    show.forEach(r => {
      const secLabel = SECTIONS.find(s=>s.id===r.section)?.label||r.section;
      preview.appendChild(html(`
        <div class="imp-row">
          <span class="tag" style="flex-shrink:0">${r.category}</span>
          <span class="imp-row-name">${r.name}</span>
          <span style="font-size:11px;color:var(--text3);white-space:nowrap">${secLabel}</span>
        </div>`));
    });
    if (newRows.length > 8) {
      preview.appendChild(html(`<div style="text-align:center;font-size:12px;color:var(--text3);padding:6px">… und ${newRows.length-8} weitere</div>`));
    }

    sheet.querySelector('#imp-close2').addEventListener('click', () => { showImport=false; importState=null; render(); });
    sheet.querySelector('#imp-back').addEventListener('click', () => { importState=null; render(); });
    const confirmBtn = sheet.querySelector('#imp-confirm');
    if (newRows.length > 0) {
      confirmBtn.addEventListener('click', () => {
        items.push(...newRows);
        saveCats();
        save();
        showImport=false; importState=null;
        render();
        setTimeout(() => alert(`${newRows.length} Artikel erfolgreich importiert.`), 100);
      });
    }
  }

  ov.appendChild(sheet);
  return ov;
}

// ---- Install banner ----
function checkInstallBanner() {
  const dismissed = localStorage.getItem(BANNER_KEY);
  const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  showBanner = !dismissed && !standalone;
}

// ---- Main render ----
function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Topbar
  const topbar = html(`
    <div class="topbar">
      <div class="topbar-inner">
        <h1>${icon('snowflake')} Gefrierschrank</h1>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="icon-btn topbar-icon" id="btn-import" aria-label="CSV importieren">${icon('upload')}</button>
          <button class="icon-btn topbar-icon" id="btn-cats" aria-label="Kategorien verwalten">${icon('tag')}</button>
          <button class="fab" id="fab-add" aria-label="Neuen Artikel hinzufügen">${icon('plus')}</button>
        </div>
      </div>
    </div>`);
  topbar.querySelector('#fab-add').addEventListener('click', () => openAdd());
  topbar.querySelector('#btn-import').addEventListener('click', () => { showImport=true; importState=null; render(); });
  topbar.querySelector('#btn-cats').addEventListener('click', () => { showCatSheet=true; catEditName=''; catNewInput=''; render(); });
  app.appendChild(topbar);

  // Tabbar
  const tabbar = el('div', { class: 'tabbar', role: 'tablist' });
  [['uebersicht','grid','Übersicht'],['suche','list','Suche'],['statistik','bar','Statistik']].forEach(([id,ico,label]) => {
    const btn = html(`<button role="tab" aria-selected="${view===id}" class="${view===id?'active':''}">${icon(ico)}<span>${label}</span></button>`);
    btn.addEventListener('click', () => { view=id; render(); });
    tabbar.appendChild(btn);
  });
  app.appendChild(tabbar);

  // Content
  const content = el('div', { class: 'content' });

  // Install banner
  if (showBanner) {
    const banner = html(`
      <div class="install-banner">
        ${icon('info')}
        <span>Zum Homescreen: Teilen-Symbol → <strong>Zum Home-Bildschirm</strong></span>
        <button class="install-close" aria-label="Schließen">×</button>
      </div>`);
    banner.querySelector('.install-close').addEventListener('click', () => {
      localStorage.setItem(BANNER_KEY, '1'); showBanner=false; render();
    });
    content.appendChild(banner);
  }

  // Search + category filter chips
  if (view === 'uebersicht' || view === 'suche') {
    const searchbar = html(`<div class="searchbar">${icon('search')}<input id="s-inp" type="search" placeholder="Suchen…" value="${search}" autocomplete="off" /></div>`);
    searchbar.querySelector('#s-inp').addEventListener('input', e => { search=e.target.value; render(); });
    content.appendChild(searchbar);

    const chips = el('div', { class: 'chips' });
    const allChip = html(`<button class="chip${!catFilter?' active':''}" >Alle</button>`);
    allChip.addEventListener('click', () => { catFilter=''; render(); });
    chips.appendChild(allChip);
    cats.forEach(c => {
      const ch = html(`<button class="chip${catFilter===c?' active':''}">${c}</button>`);
      ch.addEventListener('click', () => { catFilter=c; render(); });
      chips.appendChild(ch);
    });
    content.appendChild(chips);
  }

  if (view === 'uebersicht')       renderUebersicht(content);
  else if (view === 'suche')       renderSuche(content);
  else                             renderStatistik(content);

  app.appendChild(content);

  if (showForm)     app.appendChild(renderForm());
  if (showCatSheet) app.appendChild(renderCatSheet());
  if (showImport)   app.appendChild(renderImportSheet());
}

// ---- Bootstrap ----
load();
checkInstallBanner();
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
