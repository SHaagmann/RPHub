window.RPDesk = (() => {
/* RP Desk – Vanilla JS, keine externen Abhängigkeiten, alle Daten nur lokal. */
'use strict';
const STORAGE_KEY = 'rp-desk-data-v1';
const VERSION = 1;
const SCHEMA_VERSION = 2;
const ENTITY_TYPES = ['case','person','vehicle','organization','evidence','note','task','deadline','location','event','board'];
const CATEGORIES = [
  {heading:'ALLGEMEIN',items:[['dashboard','Übersicht','home'],['characters','Charaktere','users'],['settings','Tool-Einstellungen','check'],['changelog','Changelog','file']]},
  {heading:'PD-HUB',items:[['board','Ermittlungs-Pinnwand','network'],['interviews','Vernehmungen','file'],['evidence','Evidence-Vergleich','search'],['timeline','Einsatz-Timeline','calendar'],['snippets','Beschlussvorlagen','copy']]},
  {heading:'FREIZEIT',items:[['inventory','Lager & Rechner','wallet'],['finances','Einnahmen & Ausgaben','wallet'],['minigolf','Minigolf-Tracking','flag']]},
  {heading:'ORGANISATION & TOOLS',items:[['tasks','Aufgaben','check'],['notes','Notizen','note'],['leases','Leasing & Raten','wallet'],['time','Zeitrechner','clock']]}
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
  flag:'<path d="M4 22V4m0 0c5-4 10 4 16 0v12c-6 4-11-4-16 0"/>',
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
const field = (label,name,value='',type='text',extra='')=> {
 if(type==='color'){
  const val = value || '#8aa6ff';
  return `<div class="field"><label>${esc(label)}</label><div class="color-input-wrap"><span class="color-preview-chip" style="background:${esc(val)}"></span><input class="color-native-input" name="${esc(name)}" type="color" value="${esc(val)}" ${extra}><span class="color-hex-text">${esc(val)}</span></div></div>`;
 }
 return `<div class="field"><label>${esc(label)}</label><input name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${extra}></div>`;
};
const textareaField = (label,name,value='',rows=4,extra='')=>`<div class="field full"><label>${esc(label)}</label><textarea name="${esc(name)}" rows="${rows}" ${extra}>${esc(value)}</textarea></div>`;
const btn = (action,label,cls='button-quiet',attr='')=>`<button type="button" class="button ${cls}" data-action="${esc(action)}" ${attr}>${label}</button>`;
const head = (title,description,actions='') => `<div class="page-head"><div><div class="eyebrow">RP DESK / ${esc(TITLES[ui.page]||'WORKSPACE')}</div><h1>${esc(title)}</h1><p>${description}</p></div><div class="head-actions">${actions}</div></div>`;
const uid = (p) => `${p}-${id()}`;
const THEME_PRESETS = [
 { id: 'midnight', name: 'Midnight Blue', bg: '#0b1019', sidebar: '#0e1420', card: '#121b29', border: '#273448', accent: '#8aa6ff' },
 { id: 'emerald', name: 'Emerald / LSPD Green', bg: '#0b1612', sidebar: '#0e1c17', card: '#13261f', border: '#234438', accent: '#41aa5b' },
 { id: 'crimson', name: 'Crimson Wine', bg: '#180b0f', sidebar: '#200e14', card: '#29121b', border: '#482734', accent: '#f87171' },
 { id: 'amber', name: 'Amber Gold', bg: '#18120b', sidebar: '#20180e', card: '#292012', border: '#483827', accent: '#fbbf24' },
 { id: 'cyber', name: 'Cyber Purple', bg: '#120b18', sidebar: '#180e20', card: '#221229', border: '#3d2748', accent: '#c084fc' },
 { id: 'stealth', name: 'Stealth Dark', bg: '#0f1115', sidebar: '#14171d', card: '#1c2028', border: '#2d3340', accent: '#94a3b8' }
];

function hexToRgb(hex){
 const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
 return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [138,166,255];
}
function rgbToHex(r,g,b){
 return '#' + [r,g,b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2,'0')).join('');
}
function mixColors(c1, c2, weight){
 const rgb1 = hexToRgb(c1), rgb2 = hexToRgb(c2);
 return rgbToHex(
  rgb1[0] * (1-weight) + rgb2[0] * weight,
  rgb1[1] * (1-weight) + rgb2[1] * weight,
  rgb1[2] * (1-weight) + rgb2[2] * weight
 );
}

function applyTheme(charObjOrColor){
 const root = document.documentElement;
 let accent = '#8aa6ff';
 let bg = '#0b1019';
 let sidebar = null;
 let card = null;
 let border = null;

 if(typeof charObjOrColor === 'string'){
  accent = charObjOrColor;
 } else if(charObjOrColor && typeof charObjOrColor === 'object'){
  accent = charObjOrColor.color || charObjOrColor.accent || '#8aa6ff';
  bg = charObjOrColor.bgColor || '#0b1019';
  sidebar = charObjOrColor.sidebarColor || null;
  card = charObjOrColor.cardColor || null;
  border = charObjOrColor.borderColor || null;
 }

 if(!sidebar) sidebar = mixColors(bg, '#ffffff', 0.04);
 if(!card) card = mixColors(bg, '#ffffff', 0.08);
 if(!border) border = mixColors(bg, '#ffffff', 0.22);
 const cardHi = mixColors(card, '#ffffff', 0.08);
 const topbar = mixColors(bg, '#ffffff', 0.05);
 const inputBg = mixColors(bg, '#ffffff', 0.03);

 root.style.setProperty('--accent', accent);
 const rgb = hexToRgb(accent);
 root.style.setProperty('--accent-dim', `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.15)`);
 root.style.setProperty('--bg', bg);
 root.style.setProperty('--sidebar', sidebar);
 root.style.setProperty('--topbar', topbar);
 root.style.setProperty('--card', card);
 root.style.setProperty('--card-hi', cardHi);
 root.style.setProperty('--input-bg', inputBg);
 root.style.setProperty('--border', border);
}
function compressImage(file, maxDimension = 1600, quality = 0.82){
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
  },
  {
     id: uid('snip'),
     charId,
     title: 'Antragsvorlage – Ausbau illegaler Fahrzeugveränderungen',
    body: `Greetings,\n\naufgrund des Verdachts auf illegales Tuning beantragt das SAPD den Ausbau potenziell gefundener illegaler Veränderungen aus dem Fahrzeug [FAHRZEUG] mit dem Kennzeichen [KENNZEICHEN] von [SUSPECT].\n\nBegründung:\n\n[SACHVERHALT]\n\nWeitere Details können dem entsprechenden Eintrag in der Akte "[SAMMELAKTE]" entnommen werden.\n\nVorwurf:\nVerstoß gegen [PARAGRAPH]\n\nBest regards,\n\n[NAME]`
    }
   ];
  }
const defaultData = () => ({
 version: VERSION,
 schemaVersion: SCHEMA_VERSION,
 characters: [],
 boards: [],
 interviews: [],
 leases: [],
 notes: [],
 timeline: [],
 tasks: [],
  snippets: [],
  minigolf: [],
  evidence: [],
  evidenceReports: [],
  inventory: [],
  finances: [],
  entities: [],
  relationships: []
});
const REQUIRED_COLLECTIONS = ['characters','boards','interviews','leases','notes','timeline','tasks','snippets','minigolf'];
const OPTIONAL_COLLECTIONS = ['minigolf','evidence','evidenceReports','inventory','finances'];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function validEntity(entity){
 return isRecord(entity)
  && typeof entity.id === 'string' && entity.id.length > 0
  && ENTITY_TYPES.includes(entity.type)
  && (entity.charId === null || typeof entity.charId === 'string')
  && typeof entity.createdAt === 'string'
  && typeof entity.updatedAt === 'string'
  && isRecord(entity.fields);
}
function validRelationship(relationship){
 return isRecord(relationship)
  && typeof relationship.id === 'string' && relationship.id.length > 0
  && typeof relationship.sourceId === 'string' && relationship.sourceId.length > 0
  && typeof relationship.targetId === 'string' && relationship.targetId.length > 0
  && typeof relationship.type === 'string' && relationship.type.length > 0
  && (relationship.description === undefined || typeof relationship.description === 'string')
  && typeof relationship.createdAt === 'string';
}
function validImport(v){
 if(!isRecord(v)||v.version!==VERSION
  ||(v.schemaVersion!==undefined&&(!Number.isInteger(v.schemaVersion)||v.schemaVersion<1||v.schemaVersion>SCHEMA_VERSION))
  ||!REQUIRED_COLLECTIONS.filter(k=>k!=='minigolf').every(k=>Array.isArray(v[k]))
  ||!OPTIONAL_COLLECTIONS.every(k=>v[k]===undefined||Array.isArray(v[k]))
  ||!Array.isArray(v.characters)
  ||!v.characters.every(c=>typeof c?.id==='string'&&typeof c?.name==='string'&&(c.hiddenTools===undefined||(Array.isArray(c.hiddenTools)&&c.hiddenTools.every(t=>typeof t==='string'))))
  ||!v.boards.every(b=>Array.isArray(b?.nodes)&&Array.isArray(b?.edges))
  ||(v.entities!==undefined&&(!Array.isArray(v.entities)||!v.entities.every(validEntity)))
  ||(v.relationships!==undefined&&(!Array.isArray(v.relationships)||!v.relationships.every(validRelationship)))
  ||(v.entities||[]).some(entity=>entity.charId!==null&&!v.characters.some(character=>character.id===entity.charId))
  ||(v.inventory&&!v.inventory.every(i=>typeof i?.id==='string'&&typeof i.charId==='string'&&typeof i.name==='string'&&Number.isInteger(i.quantity)&&i.quantity>=0&&i.quantity<=100000&&Number.isFinite(i.price)&&i.price>=0&&i.price<=1000000&&Math.abs(i.price*100-Math.round(i.price*100))<0.000001))
  ||(v.finances&&!v.finances.every(i=>typeof i?.id==='string'&&typeof i.charId==='string'&&typeof i.description==='string'&&['income','expense'].includes(i.type)&&Number.isFinite(i.amount)&&i.amount>=0.01&&i.amount<=1000000&&Math.abs(i.amount*100-Math.round(i.amount*100))<0.000001&&typeof i.date==='string')))return false;
 const ids=[...(v.entities||[]),...(v.relationships||[])].map(item=>item.id);
 const entityIds=new Set((v.entities||[]).map(entity=>entity.id));
 return new Set(ids).size===ids.length
  &&(v.relationships||[]).every(relationship=>entityIds.has(relationship.sourceId)&&entityIds.has(relationship.targetId));
}
function migrateData(data){
 const migrated={...data};
 let version=migrated.schemaVersion??1;
 while(version<SCHEMA_VERSION){
  if(version===1){
   migrated.entities=Array.isArray(migrated.entities)?migrated.entities:[];
   migrated.relationships=Array.isArray(migrated.relationships)?migrated.relationships:[];
   version=2;
   migrated.schemaVersion=version;
  }else throw new Error(`Nicht unterstützte Speicherversion: ${version}`);
 }
 migrated.schemaVersion=SCHEMA_VERSION;
 for(const key of ['contacts','duties','plates','radio'])delete migrated[key];
 for(const key of OPTIONAL_COLLECTIONS)if(!Array.isArray(migrated[key]))migrated[key]=[];
 return migrated;
}
function normalizeData(data){return migrateData(data)}
let persistenceBlocked=false;
function load(){
 let raw;
 try{raw=localStorage.getItem(STORAGE_KEY)}catch(error){persistenceBlocked=true;console.warn('Lokaler Speicher konnte nicht gelesen werden',error);return defaultData()}
 if(raw===null)return defaultData();
 let data;
 try{data=JSON.parse(raw)}catch(error){persistenceBlocked=true;console.warn('Lokale Daten sind kein gültiges JSON und wurden beibehalten',error);return defaultData()}
 if(!validImport(data)){persistenceBlocked=true;console.warn('Lokale Daten haben ein unbekanntes Format und wurden beibehalten');return defaultData()}
 try{return migrateData(data)}catch(error){persistenceBlocked=true;console.warn('Lokale Daten konnten nicht migriert werden und wurden beibehalten',error);return defaultData()}
}
let db=load();
let ui={page:'dashboard',charId:db.characters[0]?.id||null,selection:{},search:{},taskFilter:'open',variables:{AZ:'',KZ:'',NAME:'',ORT:'',SUSPECT:'',DURCHSUCHUNGSZIEL:'',GEGENSTAND:'',PARAGRAPH:'',TICKETNUMMER:'',ZEUGE:'',TATORT:'',INDIZIEN:'',FAHRZEUG:'',KENNZEICHEN:'',SACHVERHALT:'',SAMMELAKTE:''},timeResult:null,boardZoom:1,boardPanX:0,boardPanY:0,pendingNodeImage:null};
function persist(){
 if(persistenceBlocked){toast('Speichern blockiert: Unbekannte oder beschädigte vorhandene Daten wurden geschützt. Importiere ein Backup oder setze die Daten nach Prüfung bewusst zurück.',true);return false}
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db));return true}catch(error){toast('Speichern fehlgeschlagen. Browser-Speicher prüfen oder Backup exportieren.',true);return false}
}
function toast(message,error=false){const target=$('#toasts');const item=document.createElement('div');item.className='toast'+(error?' error':'');item.textContent=message;target.append(item);setTimeout(()=>item.remove(),3800)}
const char = () => db.characters.find(c=>c.id===ui.charId)||db.characters[0]||null;
const toolVisible = page => CATEGORIES[0].items.some(([id])=>id===page)||!char()?.hiddenTools?.includes(page);
const scoped = name => db[name].filter(x=>x.charId===char()?.id);
const collectionItem=(name,itemId)=>db[name].find(x=>x.id===itemId && x.charId===char()?.id);
function sel(name){const entries=scoped(name);const existing=entries.find(e=>e.id===ui.selection[name]);if(existing)return existing;ui.selection[name]=entries[0]?.id||null;return entries[0]||null;}
function layoutBoardImages(){
 const svg=$('#board-svg');
 const b=sel('boards');
 if(!svg||!b)return;
 for(const node of b.nodes){
  if(!node.image)continue;
  const group=Array.from(svg.querySelectorAll('[data-node-id]')).find(item=>item.dataset.nodeId===node.id);
  if(!group)continue;
  const rects=group.querySelectorAll('rect'),image=group.querySelector('image'),texts=group.querySelectorAll('text');
  if(rects[0]){rects[0].setAttribute('width','230');rects[0].setAttribute('height','190')}
  if(image){image.setAttribute('x','8');image.setAttribute('y','8');image.setAttribute('width','214');image.setAttribute('height','132');image.setAttribute('tabindex','0');image.setAttribute('role','button');image.setAttribute('aria-label',`Bild vergrößern: ${node.label}`);image.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openImageViewer(node.image,node.label)}})}
  if(rects[1]){rects[1].setAttribute('x','12');rects[1].setAttribute('y','151');rects[1].setAttribute('height','28')}
  if(texts[0]){texts[0].setAttribute('x','25');texts[0].setAttribute('y','162')}
  if(texts[1]){texts[1].setAttribute('x','25');texts[1].setAttribute('y','181')}
 }
 for(const edge of b.edges){
  const from=b.nodes.find(node=>node.id===edge.from),to=b.nodes.find(node=>node.id===edge.to);
  const group=Array.from(svg.querySelectorAll('[data-edge-id]')).find(item=>item.dataset.edgeId===edge.id);
  const line=group?.querySelector('line'),text=group?.querySelector('text');
  if(!from||!to||!line||!text)continue;
  const ax=from.x+(from.image?115:90),ay=from.y+(from.image?95:27),bx=to.x+(to.image?115:90),by=to.y+(to.image?95:27);
  line.setAttribute('x1',ax);line.setAttribute('y1',ay);line.setAttribute('x2',bx);line.setAttribute('y2',by);
  text.setAttribute('x',(ax+bx)/2);text.setAttribute('y',(ay+by)/2-8);
 }
}
function openImageViewer(source,label){
 const dialog=$('#image-viewer'),image=$('#image-viewer-img');
 if(!dialog||!image)return;
 image.src=source;image.alt=label||'Pinnwand-Bild';
 $('#image-viewer-title').textContent=label||'Pinnwand-Bild';
 ui.viewerZoom=1;ui.viewerX=0;ui.viewerY=0;
 updateImageViewer();
 dialog.showModal();
}
function updateImageViewer(){
 const image=$('#image-viewer-img');
 if(!image)return;
 image.style.transform=`translate(${ui.viewerX||0}px,${ui.viewerY||0}px) scale(${ui.viewerZoom||1})`;
 $('#image-viewer-zoom').textContent=`${Math.round((ui.viewerZoom||1)*100)}%`;
}
function changeImageZoom(amount){
 ui.viewerZoom=Math.max(1,Math.min(5,Math.round(((ui.viewerZoom||1)+amount)*100)/100));
 if(ui.viewerZoom===1){ui.viewerX=0;ui.viewerY=0}
 updateImageViewer();
}
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

function replaceData(data){
 if(!validImport(data))throw new Error('Datenformat oder Speicherversion ist ungültig.');
 const normalized=normalizeData(data);
 for(const key of Object.keys(db))delete db[key];
 Object.assign(db,normalized);
 persistenceBlocked=false;
 return db;
}
return {CATEGORIES,TITLES,ICONS,ico,$,esc,id,today,datetimeLocal,formatDate,fmtMoney,empty,field,textareaField,btn,head,uid,THEME_PRESETS,hexToRgb,rgbToHex,mixColors,applyTheme,compressImage,defaultSnippetsForChar,defaultData,SCHEMA_VERSION,ENTITY_TYPES,REQUIRED_COLLECTIONS,OPTIONAL_COLLECTIONS,validImport,normalizeData,load,db,ui,persist,toast,char,toolVisible,scoped,collectionItem,sel,layoutBoardImages,openImageViewer,updateImageViewer,changeImageZoom,copyText,fallbackCopy,download,dataField,status,val,headlinePanel,listPane,renderDateTimeMeta,badge,replaceData};
})();
