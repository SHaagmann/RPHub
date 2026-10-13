/* RP Desk – Vanilla JS, keine externen Abhängigkeiten, alle Daten nur lokal. */
(() => {
'use strict';
const STORAGE_KEY = 'rp-desk-data-v1';
const VERSION = 1;
const CATEGORIES = [
  {heading:'ALLGEMEIN',items:[['dashboard','Übersicht','home'],['characters','Charaktere','users']]},
  {heading:'ERMITTLUNGEN',items:[['board','Ermittlungs-Pinnwand','network'],['interviews','Vernehmungen','file']]},
  {heading:'ORGANISATION',items:[['tasks','Aufgaben','check'],['notes','Notizen','note'],['timeline','Einsatz-Timeline','calendar']]},
  {heading:'TOOLS',items:[['leases','Leasing & Raten','wallet'],['time','Zeitrechner','clock'],['snippets','Beschlussvorlagen','copy']]}
];
const TITLES = Object.fromEntries(CATEGORIES.flatMap(g=>g.items.map(([id,title])=>[id,title])));
const ICONS = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  network:'<rect x="2" y="2" width="6" height="6" rx="1"/><rect x="16" y="2" width="6" height="6" rx="1"/><rect x="9" y="16" width="6" height="6" rx="1"/><path d="M8 5h8M5 8v4h7v4M19 8v4h-7"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  check:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
  note:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  wallet:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M17 15h2M6 5V3h12"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M4 12h16m-7-7 7 7-7 7"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7M14 10v7"/>',
  alert:'<path d="M12 2 2 21h20zM12 9v4M12 17h.01"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>'
};
const ico = (name, size=18) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||ICONS.note}</svg>`;
const $ = (s,root=document) => root.querySelector(s);
const esc = x => String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const id = () => (typeof crypto!=='undefined'&&crypto.randomUUID) ? crypto.randomUUID() : `r${Date.now()}${Math.random().toString(36).slice(2)}`;
const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const datetimeLocal = (v=new Date()) => {const d=new Date(v);if(!Number.isFinite(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
const formatDate = (v,includeTime=false) => {if(!v)return '–';const d= new Date(/T/.test(v)?v:v+'T12:00:00');return isNaN(d.getTime())?'–':new Intl.DateTimeFormat('de-DE',includeTime?{dateStyle:'short',timeStyle:'short'}:{dateStyle:'medium'}).format(d)};
const fmtMoney = n => new Intl.NumberFormat('de-DE',{maximumFractionDigits:2,minimumFractionDigits:0}).format(Number(n)||0)+' $';
const empty = (message='Noch keine Einträge vorhanden.') => `<div class="empty"><div class="empty-icon">◇</div>${esc(message)}</div>`;
const field = (label,name,value='',type='text',extra='')=>`<div class="field"><label>${esc(label)}</label><input name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${extra}></div>`;
const textareaField = (label,name,value='',rows=4,extra='')=>`<div class="field full"><label>${esc(label)}</label><textarea name="${esc(name)}" rows="${rows}" ${extra}>${esc(value)}</textarea></div>`;
const btn = (action,label,cls='button-quiet',attr='')=>`<button type="button" class="button ${cls}" data-action="${esc(action)}" ${attr}>${label}</button>`;
const head = (title,description,actions='') => `<div class="page-head"><div><div class="eyebrow">RP DESK / ${esc(TITLES[ui.page]||'WORKSPACE')}</div><h1>${esc(title)}</h1><p>${description}</p></div><div class="head-actions">${actions}</div></div>`;
const uid = (p) => `${p}-${id()}`;
function applyTheme(color){
 const hex = color || '#8aa6ff';
 const root = document.documentElement;
 root.style.setProperty('--accent', hex);
 const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
 if(match){
  const r = parseInt(match[1], 16), g = parseInt(match[2], 16), b = parseInt(match[3], 16);
  root.style.setProperty('--accent-dim', `rgba(${r},${g},${b},0.15)`);
 } else {
  root.style.setProperty('--accent-dim', 'rgba(138,166,255,0.15)');
 }
}
function compressImage(file, maxDimension = 360, quality = 0.75){
 return new Promise((resolve, reject) => {
  if(!file || !file.type.startsWith('image/')) return reject(new Error('Keine gültige Bilddatei.'));
  const reader = new FileReader();
  reader.onload = ev => {
   const img = new Image();
   img.onload = () => {
    let w = img.width, h = img.height;
    if(w > maxDimension || h > maxDimension){
     if(w > h){ h = Math.round((h * maxDimension) / w); w = maxDimension; }
     else { w = Math.round((w * maxDimension) / h); h = maxDimension; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    resolve(canvas.toDataURL('image/jpeg', quality));
   };
   img.onerror = () => reject(new Error('Bild konnte nicht verarbeitet werden.'));
   img.src = ev.target.result;
  };
  reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
  reader.readAsDataURL(file);
 });
}
function defaultSnippetsForChar(charId, authorName){
 const name = authorName || '[NAME]';
 return [
  {
   id: uid('snip'),
   charId,
   title: 'Antragsvorlage – Weiterer Besitz / Beschlagnahmung',
   body: `**Antragsvorlage**\n\nSehr geehrte Judiciary,\n\naufgrund des Verdachts auf weiteren Besitz von [GEGENSTAENDE] beantragt das SAPD die Durchsuchung von [DURCHSUCHUNGSZIEL].\n\nBegründung:\n\n[SUSPECT] wurde mit [GEGENSTAND] am [DATUM] aufgegriffen.\n\nVerstoß gegen [PARAGRAPH]\n\n[TICKETNUMMER]\n\nBest wishes,\n\n[NAME]`
  },
  {
   id: uid('snip'),
   charId,
   title: 'Antragsvorlage – Zeugensichtung & Gegenüberstellung',
   body: `### Sichtung einer Straftat durch bestätigte, glaubwürdige Zeugen\n**Suspect **wurde bei **Begehen **der **Straftat **von einem **Zeugen beobachtet**, welcher die Person sicher identifizieren kann. (Gegenüberstellung)\n\n**Antragsvorlage**\n\nSehr geehrte Judiciary,\n\naufgrund des Verdachts auf weiteren Besitz von [GEGENSTAENDE] beantragt das SAPD die Durchsuchung von [DURCHSUCHUNGSZIEL].\n\nBegründung:\n\n[SUSPECT] wurde beim Begehen der Straftat [PARAGRAPH] von [ZEUGE] in [TATORT] beobachtet und konnte in der Gegenüberstellung eindeutig als der genannte Tatverdächtige identifiziert werden.\n\nBest wishes,\n\n[NAME]`
  },
  {
   id: uid('snip'),
   charId,
   title: 'Antragsvorlage – Kausalkette (3 Straftaten in 4 Wochen)',
   body: `### Kausalkette\n**Suspect **hat in den **letzten 4 Wochen mindestens 3 Straftaten** (Waffenbesitz ohne Lizenz, Besitz von Betäubungsmitteln, Besitz von Hehlerware) begangen.\n\n**Antragsvorlage**\n\nSehr geehrte Judiciary,\n\naufgrund des Verdachts auf weiteren Besitz von [GEGENSTAENDE] beantragt das SAPD die Durchsuchung von [DURCHSUCHUNGSZIEL].\n\nBegründung:\n\n[TICKETNUMMER]\n\nBest wishes,\n\n[NAME]`
  },
  {
   id: uid('snip'),
   charId,
   title: 'Antragsvorlage – Beweismittelsicherung',
   body: `### Beweismittelsicherung\n**Hinweis zu ****[INDIZIEN]****:** Die aufgelisteten Indizien müssen insgesamt für den bearbeitenden Richter nachvollziehbar mit der vorgeworfenen Straftat in Verbindung stehen.\n\n**Antragsvorlage**\n\nSehr geehrte Judiciary,\n\naufgrund des Verdachts auf Besitz von [GEGENSTAENDE] beantragt das SAPD die Durchsuchung von [DURCHSUCHUNGSZIEL] zur Sicherung von Beweismitteln, die zur weiteren Strafverfolgung oder einem forensischen Abgleich notwendig sind.\n\nBegründung:\n\nEs liegen ausreichend Indizien vor: [INDIZIEN], dass [SUSPECT] an einer Straftat unter Verwendung von [GEGENSTAND] / an der Entwendung von [GEGENSTAND] am [DATUM] teilgenommen hat.\n\nVerstoß gegen [PARAGRAPH]\n\n[AZ]\n\nBest wishes,\n\n[NAME]`
  }
 ];
}
const defaultData = () => ({
 version: VERSION,
 characters: [],
 boards: [],
 interviews: [],
 leases: [],
 notes: [],
 timeline: [],
 tasks: [],
 snippets: []
});
const REQUIRED_COLLECTIONS = ['characters','boards','interviews','leases','notes','timeline','tasks','snippets'];
function validImport(v){return v&&typeof v==='object'&&v.version===VERSION&&REQUIRED_COLLECTIONS.every(k=>Array.isArray(v[k]))&&Array.isArray(v.characters)&&v.characters.every(c=>typeof c?.id==='string'&&typeof c?.name==='string')&&v.boards.every(b=>Array.isArray(b?.nodes)&&Array.isArray(b?.edges));}
function normalizeData(data){for(const key of ['contacts','duties','plates','radio'])delete data[key];return data}
function load(){try{let raw=localStorage.getItem(STORAGE_KEY);if(raw){let data=JSON.parse(raw);if(validImport(data))return normalizeData(data);}}catch(e){console.warn('Speicher konnte nicht geladen werden',e)}return defaultData()}
let db=load();
let ui={page:'dashboard',charId:db.characters[0]?.id||null,selection:{},search:{},taskFilter:'open',variables:{AZ:'',KZ:'',NAME:'',ORT:'',SUSPECT:'',DURCHSUCHUNGSZIEL:'',GEGENSTAND:'',PARAGRAPH:'',TICKETNUMMER:'',ZEUGE:'',TATORT:'',INDIZIEN:''},timeResult:null,boardZoom:1,boardPanX:0,boardPanY:0,pendingNodeImage:null};
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db));return true}catch(e){toast('Speichern fehlgeschlagen. Browser-Speicher prüfen oder Backup exportieren.',true);return false}}
function toast(message,error=false){const target=$('#toasts');const item=document.createElement('div');item.className='toast'+(error?' error':'');item.textContent=message;target.append(item);setTimeout(()=>item.remove(),3800)}
const char = () => db.characters.find(c=>c.id===ui.charId)||db.characters[0]||null;
const scoped = name => db[name].filter(x=>x.charId===char()?.id);
const collectionItem=(name,itemId)=>db[name].find(x=>x.id===itemId && x.charId===char()?.id);
function sel(name){const entries=scoped(name);const existing=entries.find(e=>e.id===ui.selection[name]);if(existing)return existing;ui.selection[name]=entries[0]?.id||null;return entries[0]||null;}
function setPage(page){if(!TITLES[page])return;ui.page=page;$('#sidebar').classList.remove('open');$('#sidebar-backdrop').classList.remove('show');render();window.scrollTo({top:0,behavior:'auto'});}
function renderNavigation(){let html='';for(const group of CATEGORIES){html+=`<div class="nav-group"><div class="nav-group-label">${esc(group.heading)}</div>`;for(const [p,title,icon] of group.items)html+=`<button class="nav-item ${ui.page===p?'active':''}" data-nav="${p}" ${ui.page===p?'aria-current="page"':''}>${ico(icon)}<span>${esc(title)}</span></button>`;html+='</div>';}$('#navigation').innerHTML=html;}
function render(){
 if(db.characters.length>0){
  if(!char())ui.charId=db.characters[0].id;
  applyTheme(char()?.color);
 } else {
  ui.charId=null;
  applyTheme('#8aa6ff');
 }
 renderNavigation();
 $('#current-page-name').textContent=TITLES[ui.page];
 $('#character-select').innerHTML=db.characters.length>0 ? db.characters.map(c=>`<option value="${esc(c.id)}" ${c.id===ui.charId?'selected':''}>${esc(c.name)}</option>`).join('') : '<option value="" disabled selected>Kein Charakter</option>';
 const pages={dashboard:pageDashboard,characters:pageCharacters,board:pageBoard,interviews:pageInterviews,leases:pageLeases,notes:pageNotes,time:pageTime,snippets:pageSnippets,timeline:pageTimeline,tasks:pageTasks};
 $('#content').innerHTML=(pages[ui.page]||pageDashboard)();
}
function saveAndRender(message){persist();render();if(message)toast(message)}
function removeItem(collection,itemId){const it=collectionItem(collection,itemId);if(!it||!confirm(`Eintrag wirklich löschen? Diese Aktion kann nur über ein Backup rückgängig gemacht werden.`))return;db[collection]=db[collection].filter(x=>x.id!==itemId);if(ui.selection[collection]===itemId)delete ui.selection[collection];saveAndRender('Eintrag gelöscht.');}
function copyText(txt){if(navigator.clipboard?.writeText&&location.protocol!=='file:'){navigator.clipboard.writeText(txt).then(()=>toast('In Zwischenablage kopiert.')).catch(()=>fallbackCopy(txt));}else fallbackCopy(txt)}
function fallbackCopy(text){const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{if(!document.execCommand('copy'))throw Error('Kopieren nicht unterstützt');toast('In Zwischenablage kopiert.')}catch(e){toast('Kopieren nicht möglich – bitte HTTPS verwenden.',true)}t.remove()}
function download(filename,text,type='text/plain'){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function dataField(collection,name,value,itemId){let it=collectionItem(collection,itemId);if(!it)return;it[name]=value;if(collection==='notes')it.updatedAt=new Date().toISOString();persist()}
function status(priority){return priority==='high'?'<span class="badge badge-red">Hoch</span>':priority==='low'?'<span class="badge">Niedrig</span>':'<span class="badge badge-amber">Normal</span>'}
function val(f,key){return String(new FormData(f).get(key)||'').trim()}
function headlinePanel(text,right=''){return `<div class="panel-head"><h2>${text}</h2>${right}</div>`}
function listPane(name,items,labelFn,subtitleFn,addText,createForm,searchKey){let q=(ui.search[searchKey]||'').toLowerCase();const visible=items.filter(it=>JSON.stringify([labelFn(it),subtitleFn(it)]).toLowerCase().includes(q));return `<section class="panel list-pane">${headlinePanel(addText)}${createForm}<hr class="section-separator"><input class="search-field" type="search" data-search="${searchKey}" placeholder="Einträge suchen …" value="${esc(ui.search[searchKey]||'')}"><div class="entry-list">${visible.map(it=>`<button class="entry ${sel(name)?.id===it.id?'selected':''}" data-select="${name}" data-id="${esc(it.id)}"><strong>${esc(labelFn(it))}</strong><small>${esc(subtitleFn(it))}</small></button>`).join('')||empty('Keine passenden Einträge.')}</div></section>`;}
function renderDateTimeMeta(v){return formatDate(v,true)}
function badge(text,kind=''){return `<span class="badge ${kind?'badge-'+kind:''}">${esc(text)}</span>`}
function pageDashboard(){
 const c = char();
 if(!c){
  return `${head('Willkommen bei RP Desk','Lege deinen ersten Charakter an, um deine RP-Toolbox zu starten.')}
  <div class="panel panel-pad">
   <div class="empty mb-18"><div class="empty-icon">👤</div><strong>Noch kein Charakter angelegt</strong><p class="hint">Erstelle deinen ersten Charakter, um Notizen, Beschlussvorlagen, Pinnwände und Akten zu verwalten.</p></div>
   ${headlinePanel('Ersten Charakter anlegen')}
   <form data-form="character-create"><div class="form-grid">${field('Name','name','','text','required maxlength="80" placeholder="z. B. John Doe"')}${field('Rolle / Beschreibung','subtitle','','text','placeholder="z. B. LSPD Detective"')}${field('Akzentfarbe','color','#8aa6ff','color')}</div><div class="form-actions"><button class="button">Charakter jetzt anlegen</button></div></form>
  </div>`;
 }
 const open=scoped('tasks').filter(t=>!t.done);const boards=scoped('boards');const nextLease=scoped('leases').map(l=>({...l,calc:leaseCalc(l)})).filter(l=>l.calc.remaining>0).sort((a,b)=>a.calc.next.localeCompare(b.calc.next))[0];
 return `${head('Dein Workspace',`Willkommen zurück. Hier haste alles für ${esc(c.name)} auf einen Blick.`,btn('export','↓ JSON-Backup'))}
 <div class="hero"><div><div class="hero-tag">ACTIVE CHARACTER / ${esc(c.name.toUpperCase())}</div><h2>${esc(c.name)}</h2><p>${esc(c.subtitle||'Dein Charakter')}. Organisiere deine RP-Notizen, Aufgaben und Ermittlungen an einer zentralen Stelle – privat und lokal.</p><div class="form-actions">${btn('go-tasks','Aufgaben öffnen','button')}${btn('go-notes','Notizen öffnen','button-quiet')}</div></div><div class="hero-art">RP.</div></div>
 <div class="grid mb-18"><div class="panel stat-card span-6"><div class="stat-caption">OFFENE AUFGABEN</div><div class="stat-icon">${ico('check')}</div><div class="stat-number">${open.length}</div><div class="stat-foot">Auf deiner Liste</div></div><div class="panel stat-card span-6"><div class="stat-caption">PINNWÄNDE</div><div class="stat-icon">${ico('network')}</div><div class="stat-number">${boards.length}</div><div class="stat-foot">Ermittlungsübersichten</div></div></div>
 <div class="grid"><div class="panel panel-pad span-8">${headlinePanel('Schnellzugriff')}<div class="quick-grid">${[['board','Pinnwand','network'],['interviews','Vernehmungen','file'],['timeline','Timeline','calendar'],['leases','Leasing','wallet'],['snippets','Beschlussvorlagen','copy'],['time','Zeitrechner','clock']].map(([p,t,i])=>`<button class="quick-link" data-nav="${p}"><span class="quick-icon">${ico(i)}</span>${t}</button>`).join('')}</div></div>
 <div class="panel panel-pad span-4">${headlinePanel('Anstehend',`<button class="button-link" data-nav="tasks">Alle Aufgaben →</button>`)}<div class="line-list">${open.sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')).slice(0,5).map(t=>`<div class="line-item"><div class="line-item-main"><strong>${esc(t.title)}</strong><small>${t.due?'Fällig '+formatDate(t.due):'Ohne Fälligkeit'}</small></div>${status(t.priority)}</div>`).join('')||'<p class="hint">Keine offenen Aufgaben. Sauber!</p>'}</div>${nextLease?`<hr class="section-separator"><div class="section-caption">NÄCHSTE LEASINGRATE</div><div class="flex-between"><div><strong>${esc(nextLease.vehicle||nextLease.name)}</strong><div class="hint">${formatDate(nextLease.calc.next)}</div></div>${badge(fmtMoney(nextLease.weeklyRate),'amber')}</div>`:''}</div></div>`;
}
function pageCharacters(){
 const c = char();
 return `${head('Charaktere & Datensicherung','Getrennte Daten für jeden Charakter. Sämtliche Module sind dem oben ausgewählten Charakter zugeordnet.')}
 <div class="grid"><div class="panel panel-pad span-8">${headlinePanel('Deine Charaktere')}<div class="grid">${db.characters.map(ch=>`<div class="span-6 character-card"><div class="character-avatar" style="background:${esc(ch.color||'#8aa6ff')}22;color:${esc(ch.color||'#8aa6ff')};border:1px solid ${esc(ch.color||'#8aa6ff')}55">${esc(ch.name.slice(0,2).toUpperCase())}</div><strong>${esc(ch.name)}</strong><div class="hint mt-12">${esc(ch.subtitle||'Ohne Beschreibung')}</div><div class="form-actions"><button class="button button-small ${ch.id===c?.id?'button-quiet':'button-ghost'}" data-action="switch-char" data-id="${esc(ch.id)}">${ch.id===c?.id?'Aktiv':'Auswählen'}</button>${btn('delete-char','Löschen','button-danger button-small',`data-id="${esc(ch.id)}"`)}</div></div>`).join('')||'<div class="span-12 hint">Noch keine Charaktere vorhanden.</div>'}</div>${c ? `<hr class="section-separator">${headlinePanel('Aktiven Charakter bearbeiten')}<div class="form-grid">${field('Name','name',c.name,'text',`data-char-field="name" maxlength="80"`)}${field('Rolle / Beschreibung','subtitle',c.subtitle||'','text','data-char-field="subtitle"')}${textareaField('Biografie / Notizen','bio',c.bio||'',4,'data-char-field="bio"')}${field('Akzentfarbe','color',c.color||'#8aa6ff','color','data-char-field="color"')}</div>` : ''}<hr class="section-separator">${headlinePanel('Neuer Charakter')}<form data-form="character-create"><div class="form-grid">${field('Name','name','','text','required maxlength="80"')}${field('Rolle / Beschreibung','subtitle','')}${field('Farbe','color','#8aa6ff','color')}</div><div class="form-actions"><button class="button">Charakter anlegen</button></div></form></div>
 <div class="panel panel-pad span-4">${headlinePanel('Backup & Datenschutz')}<p class="hint">Alle Daten liegen im lokalen Speicher dieses Browsers und dieses Website-Ursprungs. Auf GitHub Pages wird nichts davon auf den Server hochgeladen.</p><div class="form-actions">${btn('export','↓ Alle Daten sichern','button')}<button class="button button-quiet" data-action="import">↑ JSON wiederherstellen</button></div><hr class="section-separator"><div class="section-caption">SPEICHERN & SYNCHRONISIEREN</div><p class="hint">Auf Handy und PC sind die Speicherstände getrennt. Exportiere das JSON-Backup und importiere es auf dem anderen Gerät. Es findet keine automatische Synchronisierung statt.</p><div class="notice">Deine Browserdaten können beim Löschen von Websitedaten, im Privatmodus oder bei einem Browserwechsel verloren gehen. Regelmäßige Backups sind wichtig.</div><div class="form-actions">${btn('clear-data','Alle lokalen Daten zurücksetzen','button-danger')}</div></div></div>`;
}
const NODE_TYPES={person:['Person','#729df1'],vehicle:['Fahrzeug','#6bdab5'],location:['Ort','#f1bc72'],phone:['Telefon','#d2a0f9'],case:['Aktenzeichen','#f48e9a'],other:['Sonstiges','#a4adc3']};
function pageBoard(){
 if(!char()){
  return `${head('Ermittlungs-Pinnwand','Verbinde Personen, Fahrzeuge, Akten und Tatorte.')}${empty('Bitte lege zuerst einen Charakter an.')}`;
 }
 let boards=scoped('boards');let current=sel('boards');let selected=current?.nodes.find(n=>n.id===ui.selection.node);const nodeOptions=Object.entries(NODE_TYPES).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('');let boardHTML='';
 if(current){
  const bw = current.width || 1200;
  const bh = current.height || 650;
  const zoom = ui.boardZoom || 1;
  const zoomPct = Math.round(zoom * 100);
  const vw = bw / zoom;
  const vh = bh / zoom;
  const panX = ui.boardPanX || 0;
  const panY = ui.boardPanY || 0;

  const toolbar = `<div class="board-toolbar">
   <div class="board-toolbar-group">
    <button type="button" class="button button-quiet button-small" data-action="board-zoom-out" title="Herauszoomen">-</button>
    <span class="board-zoom-text">${zoomPct}%</span>
    <button type="button" class="button button-quiet button-small" data-action="board-zoom-in" title="Hineinzoomen">+</button>
    <button type="button" class="button button-quiet button-small" data-action="board-zoom-reset" title="Zoom & Ansicht zurücksetzen">100%</button>
   </div>
   <div class="board-toolbar-group">
    <span class="hint" style="font-size:11px">Fläche:</span>
    <select class="board-dim-select" data-board-dim="${esc(current.id)}">
     <option value="1100x590" ${bw===1100&&bh===590?'selected':''}>Kompakt (1100×590)</option>
     <option value="1400x800" ${bw===1400&&bh===800?'selected':''}>Standard (1400×800)</option>
     <option value="1800x1000" ${bw===1800&&bh===1000?'selected':''}>Groß (1800×1000)</option>
     <option value="2400x1400" ${bw===2400&&bh===1400?'selected':''}>Riesig (2400×1400)</option>
    </select>
   </div>
  </div>`;

  boardHTML=`<div class="board-wrap"><div>
   ${toolbar}
   <div class="board-viewport" id="board-viewport-container"><svg id="board-svg" viewBox="${panX} ${panY} ${vw} ${vh}" role="img" aria-label="Interaktive Ermittlungs-Pinnwand"><defs><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#283850"/></pattern></defs><rect x="-20000" y="-20000" width="40000" height="40000" fill="url(#dots)"/><rect x="0" y="0" width="${bw}" height="${bh}" fill="none" stroke="#25354c" stroke-width="2" stroke-dasharray="6 4" pointer-events="none"/>${current.edges.map(e=>{let a=current.nodes.find(n=>n.id===e.from),b=current.nodes.find(n=>n.id===e.to);if(!a||!b)return '';const ax=a.image?a.x+105:a.x+90;const ay=a.y+27;const bx=b.image?b.x+105:b.x+90;const by=b.y+27;return `<g data-edge-id="${esc(e.id)}"><line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#6b86bb" stroke-width="2" stroke-dasharray="6 5"/><text x="${(ax+bx)/2}" y="${(ay+by)/2-8}" text-anchor="middle" fill="#9db4d8" font-size="13">${esc(e.label||'')}</text></g>`}).join('')}${current.nodes.map(n=>{let type=NODE_TYPES[n.type]||NODE_TYPES.other;const hasImg=Boolean(n.image);const width=hasImg?210:180;return `<g data-node-id="${esc(n.id)}" data-selected="${selected?.id===n.id?'true':'false'}" class="board-node" transform="translate(${Number(n.x)||0},${Number(n.y)||0})"><rect x="0" y="0" width="${width}" height="55" rx="10" fill="#1b2b40"/>${hasImg?`<image href="${esc(n.image)}" x="8" y="7" width="41" height="41" preserveAspectRatio="xMidYMid slice" rx="7"/>`:''}<rect x="${hasImg?55:10}" y="11" width="5" height="33" rx="2" fill="${type[1]}" stroke="none"/><text x="${hasImg?68:24}" y="18" font-size="10" fill="${type[1]}">${esc(type[0]).toUpperCase()}</text><text x="${hasImg?68:24}" y="38" font-size="14" font-weight="700" fill="#eef4ff">${esc(n.label.length>(hasImg?15:19)?n.label.slice(0,hasImg?14:18)+'…':n.label)}</text></g>`}).join('')}</svg></div><div class="graph-scroll-note">Elemente mit Maus oder Finger verschieben · Strg+Mausrad zum Zoomen · Ziehen auf freier Fläche zum Verschieben.</div><div class="board-legend mt-12">${Object.entries(NODE_TYPES).map(([_,v])=>`<span class="legend-item"><span class="legend-dot" style="background:${v[1]}"></span>${v[0]}</span>`).join('')}</div></div>
 <div class="panel board-tools">
  <div>${headlinePanel('Element hinzufügen')}<form data-form="board-node" class="form-grid">${field('Bezeichnung','label','','text','required maxlength="80"')}<div class="field"><label>Typ</label><select name="type">${nodeOptions}</select></div>${textareaField('Notiz (optional)','notes','',2)}
   <div class="field full">
    <label>Bild / Foto (optional)</label>
    <div style="display:flex;align-items:center;gap:10px">
     <label class="button button-quiet button-small file-upload-btn">📷 Bild wählen<input type="file" accept="image/*" id="node-create-file"></label>
     <img id="node-create-preview" class="node-thumb-preview" style="display:${ui.pendingNodeImage?'block':'none'}" src="${esc(ui.pendingNodeImage||'')}" alt="Vorschau">
     <button type="button" class="button button-danger button-small" id="node-create-clear-img" style="display:${ui.pendingNodeImage?'inline-flex':'none'}" data-action="clear-create-node-image">×</button>
    </div>
   </div>
   <div class="field full"><button class="button">${ico('plus',15)} Element hinzufügen</button></div></form>
  </div>
  <div>${headlinePanel('Verbindung anlegen')}<form data-form="board-edge" class="form-grid"><div class="field full"><label>Von</label><select name="from" required>${current.nodes.map(n=>`<option value="${esc(n.id)}">${esc(n.label)}</option>`).join('')}</select></div><div class="field full"><label>Nach</label><select name="to" required>${current.nodes.map(n=>`<option value="${esc(n.id)}">${esc(n.label)}</option>`).join('')}</select></div>${field('Verbindung (optional)','label','','text','placeholder="z. B. Halter"')}<div class="field full"><button class="button button-quiet" ${current.nodes.length<2?'disabled':''}>Verbinden</button></div></form></div>
  ${selected?`<div>${headlinePanel('Ausgewähltes Element')}<div class="form-grid">${field('Bezeichnung','label',selected.label,'text',`data-node-field="label" data-id="${esc(selected.id)}"`)}${textareaField('Details','notes',selected.notes||'',4,`data-node-field="notes" data-id="${esc(selected.id)}"`)}
   <div class="field full">
    <label>Bild / Foto</label>
    <div style="display:flex;align-items:center;gap:10px">
     <label class="button button-quiet button-small file-upload-btn">📷 Bild ändern<input type="file" accept="image/*" data-node-file="${esc(selected.id)}"></label>
     ${selected.image ? `<img class="node-thumb-preview" src="${esc(selected.image)}" alt="Vorschau"><button type="button" class="button button-danger button-small" data-action="remove-node-image" data-id="${esc(selected.id)}">Bild löschen</button>` : '<span class="hint">Kein Bild</span>'}
    </div>
   </div>
   <div class="field full">${btn('delete-node','Element löschen','button-danger',`data-id="${esc(selected.id)}"`)}</div></div></div>`:''}
  <div>${headlinePanel('Verbindungen')}<div class="line-list">${current.edges.map(e=>{const from=current.nodes.find(n=>n.id===e.from),to=current.nodes.find(n=>n.id===e.to);return `<div class="line-item"><div class="line-item-main"><strong>${esc(from?.label||'')} → ${esc(to?.label||'')}</strong><small>${esc(e.label)}</small></div>${btn('delete-edge','×','button-danger button-small',`data-id="${esc(e.id)}"`)}</div>`}).join('')||'<div class="hint">Noch keine Verbindungen.</div>'}</div></div>
 </div></div>`;
 }
 return `${head('Ermittlungs-Pinnwand','Verbinde Personen, Fahrzeuge, Akten und Tatorte. Verschiebbare Knoten, Beziehungen und mehrere Pinnwände pro Charakter.')}
 <div class="panel panel-pad mb-18"><div class="flex-between" style="flex-wrap:wrap"><div class="input-group"><label class="field-label" for="board-choice">PINNWAND</label><select id="board-choice" class="control board-select">${boards.map(b=>`<option value="${esc(b.id)}" ${current?.id===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div>${current?btn('delete-board','Pinnwand löschen','button-danger button-small'):''}</div>${current?`<div class="field mt-12"><label>Pinnwand umbenennen</label><input data-board-name="${esc(current.id)}" value="${esc(current.name)}" maxlength="90" aria-label="Pinnwand umbenennen"></div>`:''}<hr class="section-separator"><form data-form="board-create" class="field-row"><div class="field" style="flex:1;min-width:180px"><label>Neue Pinnwand</label><input name="name" required maxlength="90" placeholder="Name der Pinnwand"></div><button class="button">${ico('plus',15)} Anlegen</button></form></div>${current?boardHTML:empty('Erstelle eine Pinnwand, um mit Ermittlungsverbindungen loszulegen.')}`;
}
function interviewReport(v){const lines=[`VERNEHMUNGSPROTOKOLL`,`────────────────────────────────`,`Aktenzeichen: ${v.caseNumber||'–'}`,`Befragte Person: ${v.subject||'–'}`,`Ort: ${v.location||'–'}`,`Zeitpunkt: ${formatDate(v.date,true)}`,`Beteiligte: ${v.participants||'–'}`,`Aufnahme durch: ${char().name}`,``,`FRAGEN & ANTWORTEN`,`────────────────────────────────`];(v.questions||[]).forEach((q,i)=>{lines.push(`${i+1}. ${q.question||'Frage'}`,`Antwort: ${q.answer||'–'}`,q.status&&q.status!=='normal'?`Markierung: ${q.status}`:'','')});lines.push('ZUSÄTZLICHE NOTIZEN','────────────────────────────────',v.notes||'–','',`Erstellt mit RP Desk am ${formatDate(new Date().toISOString(),true)}`);return lines.join('\n')}
function pageInterviews(){let entries=scoped('interviews').sort((a,b)=>(b.date||'').localeCompare(a.date||''));let cur=sel('interviews');return `${head('Vernehmungs-Assistent','Fragen, Antworten und Widersprüche strukturiert erfassen und ein fertiges Textprotokoll erzeugen.')}
 <div class="list-detail">${listPane('interviews',entries,v=>v.subject||'Unbenannte Vernehmung',v=>`${v.caseNumber||'Ohne AZ'} · ${formatDate(v.date)}`,'Neue Vernehmung',`<form data-form="interview-create" class="form-grid">${field('Befragte Person','subject','','text','required')}${field('Aktenzeichen','caseNumber','','text','placeholder="2026/638"')}<div class="field full"><button class="button">${ico('plus',15)} Erstellen</button></div></form>`,'interviews')}
 <section class="panel detail-pane">${cur?`${headlinePanel('Vernehmung bearbeiten',`${btn('interview-copy','Protokoll kopieren','button-quiet button-small')}${btn('interview-export','TXT exportieren','button-quiet button-small')}${btn('delete-interview','Löschen','button-danger button-small')}`)}<div class="form-grid">${field('Befragte Person','subject',cur.subject,'text',`data-bind="interviews" data-id="${esc(cur.id)}"`)}${field('Aktenzeichen','caseNumber',cur.caseNumber,'text',`data-bind="interviews" data-id="${esc(cur.id)}"`)}${field('Datum & Uhrzeit','date',datetimeLocal(cur.date),'datetime-local',`data-bind="interviews" data-id="${esc(cur.id)}"`)}${field('Ort','location',cur.location||'','text',`data-bind="interviews" data-id="${esc(cur.id)}"`)}${field('Beteiligte / weitere Personen','participants',cur.participants||'','text',`data-bind="interviews" data-id="${esc(cur.id)}"`)}</div><hr class="section-separator">${headlinePanel('Fragen & Aussagen',badge(`${cur.questions.length} Einträge`))}${cur.questions.map((q,i)=>`<div class="question-item"><div class="question-head"><strong>${String(i+1).padStart(2,'0')}. ${esc(q.question)}</strong>${btn('delete-question','Entfernen','button-danger button-small',`data-id="${esc(q.id)}"`)}</div><textarea class="question-answer" aria-label="Antwort auf Frage ${i+1}" placeholder="Antwort während der Vernehmung notieren ..." data-question-field="answer" data-id="${esc(cur.id)}" data-qid="${esc(q.id)}">${esc(q.answer)}</textarea><div class="question-footer"><span class="hint">Einschätzung</span><select data-question-field="status" data-id="${esc(cur.id)}" data-qid="${esc(q.id)}"><option value="normal" ${q.status==='normal'?'selected':''}>Neutral</option><option value="Widerspruch" ${q.status==='Widerspruch'?'selected':''}>⚠ Widerspruch</option><option value="Nachprüfen" ${q.status==='Nachprüfen'?'selected':''}>Noch prüfen</option><option value="Bestätigt" ${q.status==='Bestätigt'?'selected':''}>Bestätigt</option></select></div></div>`).join('')||empty('Noch keine Fragen vorhanden.')}<form data-form="question-create" class="field-row mt-12"><div class="field" style="flex:1;min-width:200px"><label>Neue Frage</label><input name="question" placeholder="Was haben Sie beobachtet?" required></div><button class="button button-quiet">${ico('plus',15)} Frage hinzufügen</button></form><hr class="section-separator">${textareaField('Freie Notizen / Beobachtungen','notes',cur.notes||'',6,`data-bind="interviews" data-id="${esc(cur.id)}"`)}<div class="notice mt-18">Änderungen werden automatisch gespeichert, sobald du ein Eingabefeld verlässt.</div>`:empty('Neue Vernehmung links anlegen, um Fragen und Antworten festzuhalten.')}</section></div>`;}
function leaseCalc(l){const rate=Math.max(.01,Number(l.weeklyRate)||1);const total=Math.max(0,Number(l.total)||0);const paid=(l.payments||[]).reduce((s,p)=>s+Math.max(0,Number(p.amount)||0),0);const covered=Math.floor((paid+0.000001)/rate);const remaining=Math.max(0,total-paid);let base=new Date((l.startDate||today())+'T12:00:00');if(isNaN(base.getTime()))base=new Date();base.setDate(base.getDate()+7*(Math.max(1,Number(l.intervalWeeks)||1))*covered);const next=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;return {paid,remaining,covered,next,credit:Math.max(0,paid-covered*rate),progress:total?Math.min(100,paid/total*100):100};}
function pageLeases(){let entries=scoped('leases'),cur=sel('leases'),stats=cur?leaseCalc(cur):null;return `${head('Leasing & Raten','Wochenraten, Sonderzahlungen und offene Beträge. Vorauszahlungen verschieben automatisch den nächsten Zahlungstermin.')}
 <div class="list-detail">${listPane('leases',entries,v=>v.vehicle||v.name||'Ohne Fahrzeug',v=>`${v.plate||'Ohne Kennzeichen'} · ${fmtMoney(leaseCalc(v).remaining)} offen`,'Neuer Vertrag',`<form data-form="lease-create" class="form-grid">${field('Fahrzeug','vehicle','','text','required')}${field('Kennzeichen','plate','','text')}${field('Startdatum','startDate',today(),'date','required')}${field('Gesamtbetrag ($)','total','','number','required min="0.01" step="0.01"')}${field('Rate ($)','weeklyRate','','number','required min="0.01" step="0.01"')}<div class="field full"><button class="button">${ico('plus',15)} Vertrag anlegen</button></div></form>`,'leases')}
 <section class="panel detail-pane">${cur?`${headlinePanel('Vertragsdetails',btn('delete-lease','Vertrag löschen','button-danger button-small'))}<div class="form-grid">${field('Fahrzeug','vehicle',cur.vehicle,'text',`data-bind="leases" data-id="${esc(cur.id)}"`)}${field('Kennzeichen','plate',cur.plate||'','text',`data-bind="leases" data-id="${esc(cur.id)}"`)}${field('Gesamtbetrag ($)','total',cur.total,'number',`min="0.01" step="0.01" data-bind="leases" data-id="${esc(cur.id)}" data-number`)}${field('Rate ($)','weeklyRate',cur.weeklyRate,'number',`min="0.01" step="0.01" data-bind="leases" data-id="${esc(cur.id)}" data-number`)}${field('Beginn','startDate',cur.startDate,'date',`data-bind="leases" data-id="${esc(cur.id)}"`)}${field('Ratenabstand in Wochen','intervalWeeks',cur.intervalWeeks||1,'number',`min="1" max="52" step="1" data-bind="leases" data-id="${esc(cur.id)}" data-number`)}</div>
 <div class="form-actions">${btn('refresh-lease','Berechnung aktualisieren','button-quiet button-small')}</div><div class="metric-strip"><div class="metric"><b>${fmtMoney(cur.total)}</b><span>GESAMTBETRAG</span></div><div class="metric"><b class="text-green">${fmtMoney(stats.paid)}</b><span>BEZAHLT</span></div><div class="metric"><b>${fmtMoney(stats.remaining)}</b><span>RESTBETRAG</span></div></div><div class="progress"><div style="width:${stats.progress}%"></div></div><div class="notice mt-18">${stats.remaining<=0?'<strong>Vollständig bezahlt.</strong> Keine weiteren Raten offen.':`<strong>Nächste Zahlung: ${formatDate(stats.next)}</strong><div>Bereits gedeckte Raten: ${stats.covered}. Guthaben auf die nächste Rate: ${fmtMoney(stats.credit)}. Reguläre Rate: ${fmtMoney(cur.weeklyRate)}.</div>`}</div>
 <hr class="section-separator">${headlinePanel('Zahlung verbuchen')}<form class="form-grid" data-form="lease-payment">${field('Zahlungsdatum','date',today(),'date','required')}${field('Betrag ($)','amount','','number','required min="0.01" step="0.01"')}${field('Notiz (optional)','note','','text','placeholder="z. B. Vorauszahlung"')}<div class="field" style="justify-content:end"><button class="button">Zahlung speichern</button></div></form>
 <hr class="section-separator">${headlinePanel('Zahlungshistorie',badge(`${(cur.payments||[]).length} Zahlung(en)`))}<div class="table-wrap"><table class="mini-table"><thead><tr><th>Datum</th><th>Betrag</th><th>Notiz</th><th></th></tr></thead><tbody>${(cur.payments||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).map(p=>`<tr><td class="nowrap">${formatDate(p.date)}</td><td>${fmtMoney(p.amount)}</td><td>${esc(p.note||'–')}</td><td>${btn('delete-payment','×','button-danger button-small',`data-id="${esc(p.id)}"`)}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">Noch keine Zahlungen eingetragen.</td></tr>'}</tbody></table></div><p class="hint mt-18">Berechnung: Jede vollständig bezahlte Rate schiebt den Termin um den eingestellten Ratenabstand weiter. Teilbeträge werden als Guthaben angerechnet. Die Fälligkeit wird rein aus Zahlungsbeträgen und Vertragsbeginn errechnet.</p>`:empty('Erstelle links einen Vertrag und erfasse anschließend deine Zahlungen.')}</section></div>`;}
function pageNotes(){let entries=scoped('notes').sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')),cur=sel('notes');return `${head('Notizen','Private RP-Notizen, Ideen, Ermittlungsansätze und schnelle Gedanken – getrennt nach Charakter.')}
 <div class="list-detail">${listPane('notes',entries,v=>v.title||'Ohne Titel',v=>formatDate(v.updatedAt,true),'Neue Notiz',`<form data-form="note-create" class="field-row"><div class="field" style="flex:1"><label>Titel</label><input name="title" required placeholder="Notiztitel"></div><button class="button">${ico('plus',15)}</button></form>`,'notes')}
 <div class="panel detail-pane">${cur?`${headlinePanel('Notiz bearbeiten',btn('delete-note','Löschen','button-danger button-small'))}<div class="form-grid">${field('Titel','title',cur.title,'text',`data-bind="notes" data-id="${esc(cur.id)}"`)}${textareaField('Inhalt','body',cur.body||'',16,`data-bind="notes" data-id="${esc(cur.id)}"`)}</div><p class="hint mt-18">Zuletzt bearbeitet: ${formatDate(cur.updatedAt,true)} · Automatische Speicherung beim Verlassen des Feldes.</p>`:empty('Lege links eine neue Notiz an.')}</div></div>`;}
function pageTime(){return `${head('RP-Zeitrechner','Zeitunterschiede ausrechnen und Fristen oder Zeitpunkte verschieben. Die Berechnung erfolgt in deiner lokalen Zeitzone.')}
 <div class="grid"><section class="panel panel-pad span-6">${headlinePanel('Zeitdifferenz')}<form data-form="time-diff" class="form-grid">${field('Von','from',ui.timeDiffFrom||datetimeLocal(),'datetime-local','required')}${field('Bis','to',ui.timeDiffTo||datetimeLocal(Date.now()+3600000),'datetime-local','required')}<div class="field full"><button class="button">Differenz berechnen</button></div></form>${ui.timeResult?.type==='diff'?`<div class="metric-strip"><div class="metric"><b>${ui.timeResult.hours}</b><span>STUNDEN</span></div><div class="metric"><b>${ui.timeResult.minutes}</b><span>MINUTEN</span></div><div class="metric"><b>${ui.timeResult.days}</b><span>TAGE</span></div></div>`:''}</section>
 <section class="panel panel-pad span-6">${headlinePanel('Zeitpunkt verschieben')}<form data-form="time-add" class="form-grid">${field('Ausgangszeit','at',ui.timeAt||datetimeLocal(),'datetime-local','required')}${field('Betrag','amount',ui.timeAmount||'1','number','min="0" required')}<div class="field"><label>Einheit</label><select name="unit"><option value="minutes">Minuten</option><option value="hours" selected>Stunden</option><option value="days">Tage</option><option value="weeks">Wochen</option></select></div><div class="field"><label>Operation</label><select name="operation"><option value="add">Addieren</option><option value="subtract">Subtrahieren</option></select></div><div class="field full"><button class="button">Zeitpunkt berechnen</button></div></form>${ui.timeResult?.type==='add'?`<div class="notice mt-18"><strong>Ergebnis: ${esc(ui.timeResult.text)}</strong></div>`:''}</section></div>`;}
const SNIPPET_FIELDS = [
 ['SUSPECT', 'Suspect (Tatverdächtiger)', '[SUSPECT]'],
 ['DURCHSUCHUNGSZIEL', 'Durchsuchungsziel (Adresse / Kennzeichen)', '[DURCHSUCHUNGSZIEL]'],
 ['GEGENSTAND', 'Gegenstand / Gegenstände', '[GEGENSTAND] / [GEGENSTAENDE]'],
 ['PARAGRAPH', 'Verstoß gegen Paragraph', '[PARAGRAPH] (z. B. § 12 Abs. 1 SACC)'],
 ['TICKETNUMMER', 'Ticketnummer(n)', '[TICKETNUMMER]'],
 ['ZEUGE', 'Zeuge (Glaubwürdiger Zeuge)', '[ZEUGE]'],
 ['TATORT', 'Tatort / Ort', '[TATORT]'],
 ['INDIZIEN', 'Indizien (Auflistung)', '[INDIZIEN]'],
 ['AZ', 'Aktenzeichen', '[AZ]'],
 ['NAME', 'Name (Antragsteller / Beamter)', '[NAME]']
];

function resolvedSnippet(s){
 const c = char();
 const defaultName = c?.name || '';
 const vars = {
  DATUM: formatDate(today()),
  SUSPECT: ui.variables.SUSPECT || '[SUSPECT]',
  DURCHSUCHUNGSZIEL: ui.variables.DURCHSUCHUNGSZIEL || ui.variables.ZIEL || '[DURCHSUCHUNGSZIEL]',
  ZIEL: ui.variables.DURCHSUCHUNGSZIEL || ui.variables.ZIEL || '[DURCHSUCHUNGSZIEL]',
  GEGENSTAND: ui.variables.GEGENSTAND || '[GEGENSTAND]',
  GEGENSTAENDE: ui.variables.GEGENSTAND || '[GEGENSTAENDE]',
  PARAGRAPH: ui.variables.PARAGRAPH || '[PARAGRAPH]',
  TICKETNUMMER: ui.variables.TICKETNUMMER || ui.variables.TICKET || '[TICKETNUMMER]',
  TICKET: ui.variables.TICKETNUMMER || ui.variables.TICKET || '[TICKETNUMMER]',
  ZEUGE: ui.variables.ZEUGE || '[ZEUGE]',
  TATORT: ui.variables.TATORT || ui.variables.ORT || '[TATORT]',
  ORT: ui.variables.TATORT || ui.variables.ORT || '[TATORT]',
  INDIZIEN: ui.variables.INDIZIEN || '[INDIZIEN]',
  AZ: ui.variables.AZ || '[AZ]',
  KZ: ui.variables.KZ || '[KZ]',
  NAME: ui.variables.NAME || defaultName || '[NAME]'
 };

 let text = s.body || '';

 text = text
  .replace(/\[weitere illegale Gegenstände analog zum beschlagnahmten Gut\]/gi, vars.GEGENSTAENDE)
  .replace(/\[weitere illegale Gegenstände im Zusammenhang mit der beobachteten Straftat\]/gi, vars.GEGENSTAENDE)
  .replace(/\[weitere illegale Gegenstände im Zusammenhang mit den bereits abgeurteilten Straftaten, Zeitraum max\. 4 Wochen rückwirkend\]/gi, vars.GEGENSTAENDE)
  .replace(/\[illegale\/staatliche Gegenstände analog zum entwendeten \/ für die Straftat verwendeten Gut\]/gi, vars.GEGENSTAENDE)
  .replace(/\[illegaler Gegenstand\]/gi, vars.GEGENSTAND)
  .replace(/\[illegaler\/staatlicher Gegenstand\]/gi, vars.GEGENSTAND)
  .replace(/\[Wohnung\/Haus \(Adresse\) oder Fahrzeug \(Kennzeichen\)\]/gi, vars.DURCHSUCHUNGSZIEL)
  .replace(/\[§ X Abs\. X SACC\]/gi, vars.PARAGRAPH)
  .replace(/\[Ticketnummer Beschlagnahmungsticket\]/gi, vars.TICKETNUMMER)
  .replace(/\[Ticketnummern der abgeurteilten Verstöße\]/gi, vars.TICKETNUMMER)
  .replace(/\[AUFLISTUNG DER INDIZIEN\]/gi, vars.INDIZIEN)
  .replace(/\[Aktenzeichen der Ermittlungsakte\]/gi, vars.AZ);

 for(const [k, v] of Object.entries(vars)){
  text = text.replace(new RegExp(`\\[${k}\\]`, 'gi'), v).replace(new RegExp(`\\{\\{${k}\\}\\}`, 'gi'), v);
 }

 return text;
}
function pageSnippets(){let entries=scoped('snippets'),cur=sel('snippets');return `${head('Beschlussvorlagen','Wiederkehrende Vorlagen und Beschlüsse mit Platzhaltern verwalten, ausfüllen und direkt kopieren.',btn('load-default-snippets','Standard-Vorlagen laden / aktualisieren','button-quiet button-small'))}
 <div class="list-detail">${listPane('snippets',entries,v=>v.title,v=>v.body?.slice(0,75)||'Ohne Inhalt','Neue Beschlussvorlage',`<form data-form="snippet-create" class="field-row"><div class="field" style="flex:1"><label>Titel</label><input name="title" required placeholder="Beschlussvorlage"></div><button class="button">${ico('plus',15)}</button></form>`,'snippets')}
 <section class="panel detail-pane">${cur?`${headlinePanel('Vorlage bearbeiten',`${btn('snippet-copy','Text kopieren','button')}${btn('delete-snippet','Löschen','button-danger button-small')}`)}<div class="form-grid">${field('Titel','title',cur.title,'text',`data-bind="snippets" data-id="${esc(cur.id)}"`)}${textareaField('Vorlage','body',cur.body||'',14,`data-bind="snippets" data-id="${esc(cur.id)}"`)}</div><hr class="section-separator"><div class="flex-between mb-12"><div class="section-caption" style="margin:0">PLATZHALTER BEFÜLLEN</div>${btn('clear-snippet-vars','Felder leeren','button-quiet button-small')}</div><div class="form-grid">${SNIPPET_FIELDS.map(([name,label,ph])=>field(label,name,ui.variables[name]||'','text',`data-variable="${name}" placeholder="${ph}"`)).join('')}</div><p class="hint mt-12">Platzhalter wie [SUSPECT], [DURCHSUCHUNGSZIEL], [GEGENSTAND], [PARAGRAPH], [TICKETNUMMER], [ZEUGE], [TATORT], [INDIZIEN], [AZ], [DATUM] und [NAME] werden beim Kopieren und in der Vorschau automatisch ersetzt.</p><div class="form-actions">${btn('snippet-preview','Vorschau anzeigen','button-quiet')}${btn('snippet-copy','Fertigen Text kopieren','button')}</div>${ui.previewSnippet===cur.id?`<hr class="section-separator"><div class="notice preformatted">${esc(resolvedSnippet(cur))}</div>`:''}`:empty('Neue Beschlussvorlage links erstellen.')}</section></div>`;}
function pageTimeline(){let entries=scoped('timeline').filter(e=>([e.title,e.details,e.caseNumber,e.category].join(' ')).toLowerCase().includes((ui.search.timeline||'').toLowerCase())).sort((a,b)=>(b.at||'').localeCompare(a.at||''));return `${head('Einsatz-Timeline','Einsätze und Ereignisse zeitlich sortiert erfassen – inklusive Ort, Aktenzeichen und Sachverhalt.')}
 <div class="grid"><section class="panel panel-pad span-4">${headlinePanel('Neues Ereignis')}<form data-form="timeline-create" class="form-grid">${field('Titel','title','','text','required')}${field('Datum & Uhrzeit','at',datetimeLocal(),'datetime-local','required')}${field('Kategorie','category','Einsatz','text')}${field('Aktenzeichen','caseNumber','','text')}${textareaField('Beschreibung','details','',4)}<div class="field full"><button class="button">Ereignis speichern</button></div></form></section><section class="panel panel-pad span-8">${headlinePanel('Chronologie',badge(`${entries.length} Ereignisse`))}<input class="search-field mb-12" type="search" data-search="timeline" placeholder="Ereignisse durchsuchen ..." value="${esc(ui.search.timeline||'')}"><div class="line-list">${entries.map(e=>`<div class="task-item"><div style="width:6px;background:#7497e4;border-radius:8px;align-self:stretch;flex-shrink:0"></div><div class="task-main"><div class="flex-between"><strong>${esc(e.title)}</strong>${btn('delete-timeline','×','button-danger button-small',`data-id="${esc(e.id)}"`)}</div><div class="task-meta">${badge(formatDate(e.at,true))}${e.category?badge(e.category):''}${e.caseNumber?badge('AZ '+e.caseNumber):''}</div>${e.details?`<p class="preformatted">${esc(e.details)}</p>`:''}<button class="button-link" data-action="edit-timeline" data-id="${esc(e.id)}">Bearbeiten</button></div></div>${ui.editTimeline===e.id?`<form data-form="timeline-edit" data-id="${esc(e.id)}" class="form-grid mb-18">${field('Titel','title',e.title,'text','required')}${field('Zeitpunkt','at',datetimeLocal(e.at),'datetime-local','required')}${field('Kategorie','category',e.category||'')}${field('Aktenzeichen','caseNumber',e.caseNumber||'')}${textareaField('Beschreibung','details',e.details||'')}<div class="field full"><button class="button button-quiet">Änderung speichern</button></div></form>`:''}`).join('')||empty('Noch keine Ereignisse angelegt.')}</div></section></div>`;}
function pageTasks(){let all=scoped('tasks'),entries=all.filter(t=>ui.taskFilter==='all'||(ui.taskFilter==='done'?t.done:!t.done)).sort((a,b)=>Number(a.done)-Number(b.done)||(a.due||'9999').localeCompare(b.due||'9999'));return `${head('Aufgaben & To-dos','Offene RP-Aufgaben priorisieren, Fälligkeiten festhalten und Erledigtes abhaken.')}
 <div class="grid"><section class="panel panel-pad span-4">${headlinePanel('Neue Aufgabe')}<form data-form="task-create" class="form-grid">${field('Aufgabe','title','','text','required')}${field('Fällig bis','due','','date')}<div class="field full"><label>Priorität</label><select name="priority"><option value="normal">Normal</option><option value="high">Hoch</option><option value="low">Niedrig</option></select></div>${textareaField('Details','details','',3)}<div class="field full"><button class="button">${ico('plus',15)} Aufgabe hinzufügen</button></div></form></section><section class="panel panel-pad span-8">${headlinePanel('Meine Aufgaben',badge(`${all.filter(t=>!t.done).length} offen`))}<div class="chip-row mb-18">${[['open','Offen'],['all','Alle'],['done','Erledigt']].map(([k,t])=>`<button class="button button-small ${ui.taskFilter===k?'button':'button-ghost'}" data-action="task-filter" data-value="${k}">${t}</button>`).join('')}</div><div class="line-list">${entries.map(t=>`<div class="task-item"><label class="checkrow" style="padding-top:2px"><input type="checkbox" data-task-check="${esc(t.id)}" ${t.done?'checked':''} aria-label="${esc(t.title)} erledigt"></label><div class="task-main"><div class="flex-between"><strong class="${t.done?'task-done':''}">${esc(t.title)}</strong>${btn('delete-task','×','button-danger button-small',`data-id="${esc(t.id)}"`)}</div>${t.details?`<p class="preformatted">${esc(t.details)}</p>`:''}<div class="task-meta">${status(t.priority)}${t.due?badge('Fällig '+formatDate(t.due),t.due<today()&&!t.done?'red':''):''}</div></div></div>`).join('')||empty('Hier ist alles erledigt – keine Aufgaben in dieser Ansicht.')}</div></section></div>`;}
function handleForm(f){const kind=f.dataset.form;if(!kind)return;const currentChar=char().id;
 switch(kind){
 case 'character-create': {
  const name=val(f,'name');if(!name)return;
  const ch={id:uid('char'),name,subtitle:val(f,'subtitle'),color:val(f,'color')||'#8aa6ff',bio:''};
  db.characters.push(ch);
  const defaultSnips = defaultSnippetsForChar(ch.id, ch.name);
  db.snippets.push(...defaultSnips);
  ui.charId=ch.id;
  ui.selection={snippets: defaultSnips[0]?.id};
  saveAndRender('Charakter mit Standard-Beschlussvorlagen angelegt.');
  break;
 }
 case 'board-create': {const name=val(f,'name');if(!name)return;const b={id:uid('board'),charId:currentChar,name,nodes:[],edges:[]};db.boards.push(b);ui.selection.boards=b.id;ui.selection.node=null;saveAndRender('Pinnwand angelegt.');break}
 case 'board-node': {let b=sel('boards');if(!b)return;const label=val(f,'label');if(!label)return;b.nodes.push({id:uid('node'),type:val(f,'type'),label,notes:val(f,'notes'),image:ui.pendingNodeImage||null,x:60+(b.nodes.length%4)*230,y:55+(Math.floor(b.nodes.length/4)%5)*100});ui.pendingNodeImage=null;ui.selection.node=b.nodes.at(-1).id;saveAndRender('Element hinzugefügt.');break}
 case 'board-edge': {let b=sel('boards');if(!b)return;const from=val(f,'from'),to=val(f,'to');if(!from||!to||from===to){toast('Bitte zwei unterschiedliche Elemente wählen.',true);return}if(!b.nodes.find(x=>x.id===from)||!b.nodes.find(x=>x.id===to))return;b.edges.push({id:uid('edge'),from,to,label:val(f,'label')});saveAndRender('Verbindung hinzugefügt.');break}
 case 'interview-create': {const v={id:uid('interview'),charId:currentChar,subject:val(f,'subject'),caseNumber:val(f,'caseNumber'),date:datetimeLocal(),location:'',participants:'',notes:'',questions:[]};if(!v.subject)return;db.interviews.push(v);ui.selection.interviews=v.id;saveAndRender('Vernehmung angelegt.');break}
 case 'question-create': {const v=sel('interviews');if(!v)return;const question=val(f,'question');if(!question)return;v.questions.push({id:uid('question'),question,answer:'',status:'normal'});saveAndRender('Frage hinzugefügt.');break}
 case 'lease-create': {const total=Number(val(f,'total')),rate=Number(val(f,'weeklyRate'));if(!(total>0&&rate>0)){toast('Bitte gültige Beträge eingeben.',true);return}const l={id:uid('lease'),charId:currentChar,vehicle:val(f,'vehicle'),plate:val(f,'plate'),startDate:val(f,'startDate'),total,weeklyRate:rate,intervalWeeks:1,payments:[]};db.leases.push(l);ui.selection.leases=l.id;saveAndRender('Vertrag angelegt.');break}
 case 'lease-payment': {const l=sel('leases');if(!l)return;const amount=Number(val(f,'amount'));if(!(amount>0)){toast('Zahlung muss größer als null sein.',true);return}l.payments.push({id:uid('payment'),date:val(f,'date')||today(),amount,note:val(f,'note')});saveAndRender('Zahlung gespeichert – Fälligkeit aktualisiert.');break}
 case 'note-create': {const n={id:uid('note'),charId:currentChar,title:val(f,'title'),body:'',updatedAt:new Date().toISOString()};if(!n.title)return;db.notes.push(n);ui.selection.notes=n.id;saveAndRender('Notiz angelegt.');break}
 case 'time-diff': {const a=val(f,'from'),b=val(f,'to');if(!a||!b)return;const n=Math.abs(new Date(b)-new Date(a));if(!Number.isFinite(n)){toast('Ungültiges Datum.',true);return}ui.timeDiffFrom=a;ui.timeDiffTo=b;ui.timeResult={type:'diff',hours:Math.floor(n/3600000),minutes:Math.floor(n/60000),days:(n/86400000).toLocaleString('de-DE',{maximumFractionDigits:2})};render();break}
 case 'time-add': {const at=val(f,'at'),amount=Number(val(f,'amount'));const ms={minutes:60000,hours:3600000,days:86400000,weeks:7*86400000}[val(f,'unit')]||3600000;const result=new Date(new Date(at).getTime()+(val(f,'operation')==='subtract'?-1:1)*amount*ms);if(isNaN(result.getTime())){toast('Ungültiger Zeitpunkt.',true);return}ui.timeAt=at;ui.timeAmount=String(amount);ui.timeResult={type:'add',text:formatDate(result.toISOString(),true)};render();break}
 case 'snippet-create': {const s={id:uid('snip'),charId:currentChar,title:val(f,'title'),body:''};if(!s.title)return;db.snippets.push(s);ui.selection.snippets=s.id;saveAndRender('Beschlussvorlage angelegt.');break}
 case 'timeline-create': {const title=val(f,'title');if(!title)return;db.timeline.push({id:uid('event'),charId:currentChar,title,at:val(f,'at'),category:val(f,'category'),caseNumber:val(f,'caseNumber'),details:val(f,'details')});saveAndRender('Ereignis gespeichert.');break}
 case 'timeline-edit': {const it=collectionItem('timeline',f.dataset.id);if(!it)return;for(const k of ['title','at','category','caseNumber','details'])it[k]=val(f,k);ui.editTimeline=null;saveAndRender('Ereignis geändert.');break}
 case 'task-create': {const title=val(f,'title');if(!title)return;db.tasks.push({id:uid('task'),charId:currentChar,title,due:val(f,'due'),priority:val(f,'priority'),details:val(f,'details'),done:false});saveAndRender('Aufgabe angelegt.');break}
 }
}
function handleAction(el){const action=el.dataset.action, value=el.dataset.value, itemId=el.dataset.id;
 if(action==='refresh-lease'){render();return}
 if(action.startsWith('go-')){setPage(action.slice(3));return}
 if(action==='export'){download(`rp-desk-backup-${today()}.json`,JSON.stringify(db,null,2),'application/json');toast('JSON-Backup erstellt.');return}
 if(action==='import'){$('#backup-import').click();return}
 if(action==='clear-data'){if(confirm('Wirklich ALLE RP-Desk-Daten aus diesem Browser löschen? Vorher am besten ein JSON-Backup exportieren.')&&confirm('Letzte Bestätigung: Sämtliche Einträge und Charaktere zurücksetzen?')){db=defaultData();ui.charId=null;ui.selection={};persist();render();toast('Lokaler Datenbestand zurückgesetzt.')}return}
 if(action==='board-zoom-in'){
  const b=sel('boards');const bw=b?.width||1200, bh=b?.height||650;
  const oldZoom=ui.boardZoom||1, newZoom=Math.min(3,Math.round((oldZoom+0.15)*100)/100);
  const cx=(ui.boardPanX||0)+(bw/oldZoom)/2, cy=(ui.boardPanY||0)+(bh/oldZoom)/2;
  ui.boardZoom=newZoom;
  ui.boardPanX=Math.round(cx-(bw/newZoom)/2);
  ui.boardPanY=Math.round(cy-(bh/newZoom)/2);
  render();return;
 }
 if(action==='board-zoom-out'){
  const b=sel('boards');const bw=b?.width||1200, bh=b?.height||650;
  const oldZoom=ui.boardZoom||1, newZoom=Math.max(0.3,Math.round((oldZoom-0.15)*100)/100);
  const cx=(ui.boardPanX||0)+(bw/oldZoom)/2, cy=(ui.boardPanY||0)+(bh/oldZoom)/2;
  ui.boardZoom=newZoom;
  ui.boardPanX=Math.round(cx-(bw/newZoom)/2);
  ui.boardPanY=Math.round(cy-(bh/newZoom)/2);
  render();return;
 }
 if(action==='board-zoom-reset'){ui.boardZoom=1;ui.boardPanX=0;ui.boardPanY=0;render();return}
 if(action==='clear-create-node-image'){ui.pendingNodeImage=null;render();return}
 if(action==='remove-node-image'){const b=sel('boards'),n=b?.nodes.find(n=>n.id===itemId);if(n){n.image=null;saveAndRender('Bild entfernt.')}return}
 if(action==='switch-char'){ui.charId=itemId;ui.selection={};render();return}
 if(action==='delete-char'){const c=db.characters.find(c=>c.id===itemId);if(!c||!confirm(`${c.name} und ALLE zugehörigen Einträge endgültig löschen?`))return;db.characters=db.characters.filter(c=>c.id!==itemId);for(const k of REQUIRED_COLLECTIONS.filter(k=>k!=='characters'))db[k]=db[k].filter(x=>x.charId!==itemId);ui.charId=db.characters[0]?.id||null;ui.selection={};saveAndRender('Charakter gelöscht.');return}
 if(action==='delete-board'){let b=sel('boards');if(!b||!confirm(`Pinnwand „${b.name}“ mitsamt Elementen und Verbindungen löschen?`))return;db.boards=db.boards.filter(x=>x.id!==b.id);ui.selection.boards=null;ui.selection.node=null;saveAndRender('Pinnwand gelöscht.');return}
 if(action==='delete-node'){let b=sel('boards');if(!b)return;b.nodes=b.nodes.filter(n=>n.id!==itemId);b.edges=b.edges.filter(e=>e.from!==itemId&&e.to!==itemId);ui.selection.node=null;saveAndRender('Element gelöscht.');return}
 if(action==='delete-edge'){let b=sel('boards');if(!b)return;b.edges=b.edges.filter(e=>e.id!==itemId);saveAndRender('Verbindung gelöscht.');return}
 if(action==='interview-copy'){let v=sel('interviews');if(v)copyText(interviewReport(v));return}
 if(action==='interview-export'){let v=sel('interviews');if(v)download(`Vernehmung-${(v.caseNumber||v.subject).replace(/[^a-z0-9_-]/gi,'-')}.txt`,interviewReport(v));return}
 if(action==='delete-question'){let v=sel('interviews');if(!v)return;v.questions=v.questions.filter(q=>q.id!==itemId);saveAndRender('Frage entfernt.');return}
 if(action==='delete-payment'){let l=sel('leases');if(!l||!confirm('Diese Zahlung löschen?'))return;l.payments=l.payments.filter(p=>p.id!==itemId);saveAndRender('Zahlung entfernt.');return}
 if(action==='snippet-copy'){let s=sel('snippets');if(s)copyText(resolvedSnippet(s));return}
 if(action==='snippet-preview'){let s=sel('snippets');ui.previewSnippet=ui.previewSnippet===s?.id?null:s?.id;render();return}
 if(action==='clear-snippet-vars'){
  for(const k of Object.keys(ui.variables)) ui.variables[k]='';
  render();
  toast('Platzhalter-Felder geleert.');
  return;
 }
 if(action==='load-default-snippets'){
  const c = char();
  if(!c) return;
  if(confirm('Standard-Beschlussvorlagen mit den optimierten Platzhaltern für diesen Charakter aktualisieren / laden?')){
   const templates = defaultSnippetsForChar(c.id, c.name);
   const titles = templates.map(t=>t.title);
   db.snippets = db.snippets.filter(x=>!(x.charId===c.id && (titles.includes(x.title) || x.title.startsWith('Antragsvorlage'))));
   db.snippets.push(...templates);
   ui.selection.snippets = templates[0]?.id;
   saveAndRender('Standard-Beschlussvorlagen mit Platzhaltern aktualisiert.');
  }
  return;
 }
 if(action==='edit-timeline'){ui.editTimeline=ui.editTimeline===itemId?null:itemId;render();return}
 if(action==='task-filter'){ui.taskFilter=value;render();return}
 const toCollection={'delete-interview':'interviews','delete-lease':'leases','delete-note':'notes','delete-snippet':'snippets','delete-timeline':'timeline','delete-task':'tasks'};
 if(toCollection[action]){removeItem(toCollection[action],itemId||sel(toCollection[action])?.id);return}
}
// Einheitliche Interaktionen und Autosave – keine Backend-Requests.
document.addEventListener('click',e=>{const nav=e.target.closest('[data-nav]');if(nav){setPage(nav.dataset.nav);return}const select=e.target.closest('[data-select]');if(select){ui.selection[select.dataset.select]=select.dataset.id;render();return}const a=e.target.closest('[data-action]');if(a){handleAction(a);return}});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();handleForm(f)});
function autosave(t){
 if(t.matches('[data-board-name]')){const b=sel('boards');if(b&&b.id===t.dataset.boardName&&t.value.trim()){b.name=t.value;persist();const opt=$('#board-choice').selectedOptions[0];if(opt)opt.textContent=t.value}return}
 if(t.matches('[data-bind]')){
  const v=t.hasAttribute('data-number')?Number(t.value):t.value;
  if(t.hasAttribute('data-number')&&(!Number.isFinite(v)||v<=0))return;
  dataField(t.dataset.bind,t.name,v,t.dataset.id);return;
 }
 if(t.matches('[data-char-field]')){
  const key=t.dataset.charField;if(key==='name'&&!t.value.trim())return;
  const c = char();if(!c)return;
  c[key]=t.value;persist();
  if(key==='name'){const opt=$('#character-select').selectedOptions[0];if(opt)opt.textContent=t.value}
  if(key==='color'){applyTheme(t.value)}
  return;
 }
 if(t.matches('[data-node-field]')){
  const b=sel('boards'),n=b?.nodes.find(n=>n.id===t.dataset.id);
  if(n){n[t.dataset.nodeField]=t.value;persist();if(t.dataset.nodeField==='label'){
   const element=Array.from(document.querySelectorAll('#board-svg [data-node-id]')).find(g=>g.dataset.nodeId===n.id);
   const label=element?.querySelectorAll('text')[1];if(label)label.textContent=t.value.length>19?t.value.slice(0,18)+'…':t.value;
  }}return;
 }
 if(t.matches('[data-question-field]')){
  const v=collectionItem('interviews',t.dataset.id),q=v?.questions.find(q=>q.id===t.dataset.qid);
  if(q){q[t.dataset.questionField]=t.value;persist()}return;
 }
}
document.addEventListener('input',e=>{const t=e.target;
 if(t.matches('[data-search]')){let key=t.dataset.search;ui.search[key]=t.value;const pos=t.selectionStart;render();const current=$(`[data-search="${key}"]`);if(current){current.focus();try{current.setSelectionRange(pos,pos)}catch(_){}}return}
 if(t.matches('[data-variable]')){ui.variables[t.dataset.variable]=t.value;return}
 autosave(t);
});
document.addEventListener('change',async e=>{const t=e.target;
 if(t.id==='character-select'){ui.charId=t.value;ui.selection={};render();return}
 if(t.id==='board-choice'){ui.selection.boards=t.value;ui.selection.node=null;render();return}
 if(t.matches('[data-board-dim]')){
  const b=sel('boards');if(b&&b.id===t.dataset.boardDim){
   const [w,h]=t.value.split('x').map(Number);
   b.width=w;b.height=h;saveAndRender('Pinnwandgröße angepasst.');
  }
  return;
 }
 if(t.id==='node-create-file'){
  const file=t.files?.[0];
  if(file){
   try{
    ui.pendingNodeImage=await compressImage(file);
    const prev=$('#node-create-preview'), clearBtn=$('#node-create-clear-img');
    if(prev){prev.src=ui.pendingNodeImage;prev.style.display='block'}
    if(clearBtn)clearBtn.style.display='inline-flex';
   }catch(err){toast(err.message,true)}
  }
  return;
 }
 if(t.matches('[data-node-file]')){
  const file=t.files?.[0];
  if(file){
   try{
    const b=sel('boards'),n=b?.nodes.find(n=>n.id===t.dataset.nodeFile);
    if(n){
     n.image=await compressImage(file);
     saveAndRender('Bild aktualisiert.');
    }
   }catch(err){toast(err.message,true)}
  }
  return;
 }
 if(t.matches('[data-task-check]')){const v=collectionItem('tasks',t.dataset.taskCheck);if(v){v.done=t.checked;saveAndRender(v.done?'Aufgabe erledigt.':'Aufgabe wieder geöffnet.')}return}
 autosave(t);
});
$('#backup-import').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!validImport(parsed))throw Error('Unbekanntes Format oder inkompatible Version');if(!confirm('Import ersetzt deinen gesamten aktuellen RP-Desk-Datenbestand. Fortfahren?'))return;db=normalizeData(parsed);ui.charId=db.characters[0]?.id||null;ui.selection={};saveAndRender('Backup erfolgreich wiederhergestellt.')}catch(err){toast('Backup nicht geladen: '+err.message,true)}finally{e.target.value=''}});
$('#mobile-menu').addEventListener('click',()=>{$('#sidebar').classList.add('open');$('#sidebar-backdrop').classList.add('show')});
$('#sidebar-backdrop').addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#sidebar-backdrop').classList.remove('show')});
// Grafikknoten und freies Panning (verschieben der Arbeitsfläche)
let drag=null;
let panDrag=null;
function graphPoint(svg,event){const pt=svg.createSVGPoint();pt.x=event.clientX;pt.y=event.clientY;const inverse=svg.getScreenCTM()?.inverse();return inverse?pt.matrixTransform(inverse):{x:0,y:0}}
document.addEventListener('pointerdown',e=>{
 const svg=$('#board-svg');
 if(!svg)return;
 const g=e.target.closest?.('#board-svg [data-node-id]');
 const b=sel('boards');
 if(g && b){
  const n=b.nodes.find(n=>n.id===g.dataset.nodeId);
  if(!n)return;
  const pt=graphPoint(svg,e);
  drag={id:n.id,startX:pt.x-n.x,startY:pt.y-n.y,pointerId:e.pointerId};
  svg.setPointerCapture(e.pointerId);
  for(const item of svg.querySelectorAll('.board-node'))item.dataset.selected=String(item===g);
  ui.selection.node=n.id;
  e.preventDefault();
  return;
 }
 const container=e.target.closest('#board-viewport-container');
 if(container && b && !g){
  panDrag={
   pointerId:e.pointerId,
   startX:e.clientX,
   startY:e.clientY,
   panX:ui.boardPanX||0,
   panY:ui.boardPanY||0
  };
  svg.setPointerCapture(e.pointerId);
  e.preventDefault();
 }
});
document.addEventListener('pointermove',e=>{
 const svg=$('#board-svg');
 const b=sel('boards');
 if(panDrag && e.pointerId===panDrag.pointerId && svg && b){
  const bw=b.width||1200, bh=b.height||650;
  const zoom=ui.boardZoom||1;
  const vw=bw/zoom, vh=bh/zoom;
  const dx=e.clientX-panDrag.startX;
  const dy=e.clientY-panDrag.startY;
  const scale=vw/Math.max(1,svg.clientWidth);
  ui.boardPanX=Math.round(panDrag.panX - dx*scale);
  ui.boardPanY=Math.round(panDrag.panY - dy*scale);
  svg.setAttribute('viewBox',`${ui.boardPanX} ${ui.boardPanY} ${vw} ${vh}`);
  return;
 }
 if(!drag||e.pointerId!==drag.pointerId)return;
 const n=b?.nodes.find(n=>n.id===drag.id);
 if(!svg||!n||!b)return;
 const p=graphPoint(svg,e);
 const bw=b.width||1200, bh=b.height||650;
 n.x=Math.max(0,Math.min(bw-(n.image?220:190),Math.round(p.x-drag.startX)));
 n.y=Math.max(0,Math.min(bh-65,Math.round(p.y-drag.startY)));
 const node=Array.from(svg.querySelectorAll('[data-node-id]')).find(g=>g.dataset.nodeId===n.id);
 if(node)node.setAttribute('transform',`translate(${n.x},${n.y})`);
 for(const edge of b.edges){
  if(edge.from!==n.id&&edge.to!==n.id)continue;
  const a=b.nodes.find(x=>x.id===edge.from),z=b.nodes.find(x=>x.id===edge.to);
  const group=Array.from(svg.querySelectorAll('[data-edge-id]')).find(g=>g.dataset.edgeId===edge.id);
  if(!group||!a||!z)continue;
  const line=group.querySelector('line'),text=group.querySelector('text');
  const ax=a.image?a.x+105:a.x+90, ay=a.y+27, zx=z.image?z.x+105:z.x+90, zy=z.y+27;
  line.setAttribute('x1',ax);line.setAttribute('y1',ay);line.setAttribute('x2',zx);line.setAttribute('y2',zy);
  text.setAttribute('x',(ax+zx)/2);text.setAttribute('y',(ay+zy)/2-8);
 }
});
function finishDrag(e){
 if(panDrag && e.pointerId===panDrag.pointerId){panDrag=null;persist();return}
 if(!drag||e.pointerId!==drag.pointerId)return;
 drag=null;
 persist();
 render();
}
document.addEventListener('pointerup',finishDrag);document.addEventListener('pointercancel',finishDrag);
document.addEventListener('wheel',e=>{
 const container=e.target.closest('#board-viewport-container');
 if(container && (e.ctrlKey || e.metaKey)){
  e.preventDefault();
  const svg=$('#board-svg');
  const b=sel('boards');
  if(!svg || !b)return;
  const bw=b.width||1200, bh=b.height||650;
  const oldZoom=ui.boardZoom||1;
  const delta=e.deltaY<0?0.15:-0.15;
  const newZoom=Math.max(0.3,Math.min(3,Math.round((oldZoom+delta)*100)/100));
  if(newZoom===oldZoom)return;
  const pt=graphPoint(svg,e);
  ui.boardZoom=newZoom;
  const newVw=bw/newZoom;
  const newVh=bh/newZoom;
  const rect=svg.getBoundingClientRect();
  const ratioX=Math.max(0,Math.min(1,(e.clientX-rect.left)/Math.max(1,rect.width)));
  const ratioY=Math.max(0,Math.min(1,(e.clientY-rect.top)/Math.max(1,rect.height)));
  ui.boardPanX=Math.round(pt.x - ratioX*newVw);
  ui.boardPanY=Math.round(pt.y - ratioY*newVh);
  render();
 }
},{passive:false});
persist();render();
})();
