window.RPDeskPages = window.RPDeskPages || {};
window.RPDeskPages.dashboard = (() => {
'use strict';
const {CATEGORIES,TITLES,ICONS,ico,$,esc,id,today,datetimeLocal,formatDate,fmtMoney,empty,field,textareaField,btn,head,uid,THEME_PRESETS,hexToRgb,rgbToHex,mixColors,applyTheme,compressImage,defaultSnippetsForChar,defaultData,REQUIRED_COLLECTIONS,OPTIONAL_COLLECTIONS,validImport,normalizeData,load,db,ui,persist,toast,char,scoped,collectionItem,sel,layoutBoardImages,openImageViewer,updateImageViewer,changeImageZoom,copyText,fallbackCopy,download,dataField,status,val,headlinePanel,listPane,renderDateTimeMeta,badge,entityLabel}=window.RPDesk;
const {toolVisible}=window.RPDesk;
const DEFAULT_DASHBOARD_WIDGETS=['cases','deadlines','tasks','activity','quick','finances','leases','inventory','note'];
const DASHBOARD_WIDGET_NAMES={cases:'Offene Ermittlungen',deadlines:'Anstehende Fristen',tasks:'Meine Aufgaben',activity:'Letzte Aktivitäten',quick:'Schnellzugriff',finances:'Finanzübersicht',leases:'Leasingübersicht',inventory:'Lagerübersicht',note:'Notiz-Widget'};
function dashboardWidget(type,index,total){
 const current=char(),items=window.RPDesk.db.entities.filter(item=>item.charId===null||item.charId===current?.id);
 const moduleByWidget={cases:'cases',deadlines:'deadlines',tasks:'tasks',finances:'finances',leases:'leases',inventory:'inventory'};
 if(moduleByWidget[type]&&!toolVisible(moduleByWidget[type]))return '';
 if(!DASHBOARD_WIDGET_NAMES[type])return '';
 const size=current.dashboardWidgetSizes?.[type]||'normal';
 const cases=items.filter(item=>item.type==='case'),deadlines=items.filter(item=>item.type==='deadline');
 const tasks=scoped('tasks'),openTasks=tasks.filter(item=>!item.done);
 const tools=[['cases','Ermittlungsakten','file'],['deadlines','Fristen','calendar'],['map','RP-Karte','pin'],['board','Pinnwand','network'],['interviews','Vernehmungen','file'],['evidence','Evidence-Vergleich','search'],['timeline','Timeline','calendar'],['leases','Leasing','wallet'],['inventory','Lager & Rechner','wallet'],['finances','Einnahmen & Ausgaben','wallet'],['minigolf','Minigolf','flag'],['snippets','Beschlussvorlagen','copy'],['time','Zeitrechner','clock']].filter(([page])=>toolVisible(page));
 let content='';
 if(type==='cases'){
  const active=cases.filter(item=>!['Abgeschlossen','Archiviert'].includes(item.fields.status));
  const favorites=new Set(current.favoriteRecords||[]);
  content=`<div class="stat-number">${active.length}</div><div class="line-list">${active.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,3).map(item=>`<div class="line-item"><button class="link-result" data-open-entity="${esc(item.id)}"><strong>${esc(item.fields.caseNumber||item.fields.title||'Akte')}</strong><small>${esc(item.fields.status||'Offen')} · ${esc(item.fields.title||'')}</small></button><button class="button button-quiet button-small" data-action="favorite-record-toggle" data-value="${esc(item.id)}" aria-label="${favorites.has(item.id)?'Favorit entfernen':'Akte favorisieren'}">${favorites.has(item.id)?'★':'☆'}</button></div>`).join('')||'<p class="hint">Keine offenen Akten.</p>'}<div class="section-caption mt-12">FAVORISIERTE AKTEN</div>${cases.filter(item=>favorites.has(item.id)).map(item=>`<button class="button-link" data-open-entity="${esc(item.id)}">${esc(item.fields.caseNumber||item.fields.title)}</button>`).join(' · ')||'<p class="hint">Noch keine favorisierten Akten.</p>'}</div>`;
 }else if(type==='deadlines'){
  const pending=deadlines.filter(item=>!['done','cancelled'].includes(item.fields.status)).sort((a,b)=>Date.parse(a.fields.dueAt)-Date.parse(b.fields.dueAt));
  content=`<div class="line-list">${pending.slice(0,4).map(item=>{const late=Date.parse(item.fields.dueAt)<Date.now();return `<div class="line-item"><button class="link-result" data-open-entity="${esc(item.id)}"><strong>${esc(item.fields.title)}</strong><small>${late?'Überfällig · ':''}${esc(formatDate(item.fields.dueAt,true))}</small></button>${late?badge('Überfällig','red'):''}</div>`}).join('')||'<p class="hint">Keine offenen Fristen.</p>'}</div>`;
 }else if(type==='tasks'){
  const rank={critical:0,Kritisch:0,high:1,Hoch:1,normal:2,Normal:2,low:3,Niedrig:3},sorted=openTasks.slice().sort((a,b)=>(rank[a.priority]??4)-(rank[b.priority]??4));
  content=`<div class="stat-number">${openTasks.length}</div><p class="hint">Nach Priorität sortiert</p>${sorted.slice(0,3).map(item=>`<div class="line-item"><strong>${esc(item.title)}</strong>${badge(item.priority||'Normal')}</div>`).join('')}`;
 }else if(type==='activity'){
  content=`<div class="line-list">${items.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,5).map(item=>`<div class="line-item"><div class="line-item-main"><strong>${esc(entityLabel(item))}</strong><small>${esc(item.type)} · ${esc(formatDate(item.updatedAt,true))}</small></div></div>`).join('')||'<p class="hint">Noch keine Aktivitäten.</p>'}</div>`;
 }else if(type==='quick'){
  const favorites=new Set(current.favoriteModules||tools.slice(0,6).map(([page])=>page)),favoriteTools=tools.filter(([page])=>favorites.has(page)),quickLinks=current.quickLinks||[];
  content=`<div class="quick-grid">${favoriteTools.map(([page,title,icon])=>`<button class="quick-link" data-nav="${page}"><span class="quick-icon">${ico(icon)}</span>${esc(title)}</button>`).join('')||'<p class="hint">Noch keine Module favorisiert.</p>'}</div>
   <div class="field-row mt-12"><select class="control" data-dashboard-favorite-module>${tools.filter(([page])=>!favorites.has(page)).map(([page,title])=>`<option value="${page}">${esc(title)}</option>`).join('')||'<option value="">Alle Module favorisiert</option>'}</select>${btn('favorite-module-add','Modul hinzufügen','button-small')}</div>
   ${favoriteTools.length?`<div class="chip-row mt-12">${favoriteTools.map(([page,title])=>`<button class="chip" data-action="favorite-module-remove" data-value="${page}">★ ${esc(title)} ×</button>`).join('')}</div>`:''}
   <hr class="section-separator"><div class="section-caption">EIGENE VERKNÜPFUNGEN</div>${quickLinks.map(link=>`<div class="line-item"><button class="button-link" data-nav="${esc(link.page)}">${esc(link.label)}</button><button class="button button-danger button-small" data-action="quick-link-delete" data-value="${esc(link.id)}" aria-label="Verknüpfung löschen">×</button></div>`).join('')||'<p class="hint">Eigene Schnellzugriffe auf Module hinzufügen.</p>'}
   <form data-form="quick-link-create" class="form-grid mt-12">${field('Anzeigename','label','','text','required maxlength="60"')}<div class="field"><label>Modul</label><select name="page">${tools.map(([page,title])=>`<option value="${page}">${esc(title)}</option>`).join('')}</select></div><div class="field full"><button class="button button-small">Schnellzugriff hinzufügen</button></div></form>`;
 }else if(type==='finances'){
  const entries=scoped('finances'),income=entries.filter(item=>item.type==='income').reduce((sum,item)=>sum+item.amount,0),expenses=entries.filter(item=>item.type==='expense').reduce((sum,item)=>sum+item.amount,0);
  content=`<div class="metric-strip"><div class="metric"><b>${fmtMoney(income-expenses)}</b><span>Saldo</span></div><div class="metric"><b>${fmtMoney(income)}</b><span>Einnahmen</span></div><div class="metric"><b>${fmtMoney(expenses)}</b><span>Ausgaben</span></div></div>`;
 }else if(type==='leases'){
  const leases=scoped('leases').map(item=>({...item,calc:window.RPDeskPages.workspace.leaseCalc(item)})),open=leases.filter(item=>item.calc.remaining>0);
  content=`<div class="stat-number">${open.length}</div><p class="hint">Offene Verträge · Restbetrag ${fmtMoney(open.reduce((sum,item)=>sum+item.calc.remaining,0))}</p>${open.slice(0,3).map(item=>`<div class="line-item"><div class="line-item-main"><strong>${esc(item.vehicle||item.name)}</strong><small>Nächste Rate ${esc(formatDate(item.calc.next))}</small></div>${badge(fmtMoney(item.calc.remaining),'amber')}</div>`).join('')}`;
 }else if(type==='inventory'){
  const entries=scoped('inventory');
  content=`<div class="metric-strip"><div class="metric"><b>${entries.length}</b><span>Artikel</span></div><div class="metric"><b>${fmtMoney(entries.reduce((sum,item)=>sum+item.quantity*item.price,0))}</b><span>Gesamtwert</span></div></div><p class="hint">${entries.filter(item=>item.quantity<=2).length} Artikel mit niedrigem Bestand (≤ 2)</p>`;
 }else if(type==='note'){
  content=`<textarea class="field dashboard-note" data-dashboard-note aria-label="Kurznotiz für dieses Dashboard" placeholder="Kurznotiz für ${esc(current?.name||'diesen Charakter')} …">${esc(current?.dashboardNote||'')}</textarea>`;
 }
 const controls=`<div class="dashboard-widget-tools">${index?`<button type="button" data-action="widget-up" data-value="${type}" aria-label="Widget nach oben">↑</button>`:''}${index<total-1?`<button type="button" data-action="widget-down" data-value="${type}" aria-label="Widget nach unten">↓</button>`:''}<button type="button" data-action="widget-size" data-value="${type}" aria-label="Widgetgröße ändern">↔</button><button type="button" data-action="widget-remove" data-value="${type}" aria-label="Widget entfernen">×</button></div>`;
 return `<section class="panel panel-pad dashboard-widget ${size==='large'?'large':size==='compact'?'compact':''}"><div class="dashboard-widget-head"><h3>${esc(DASHBOARD_WIDGET_NAMES[type])}</h3>${controls}</div>${content}</section>`;
}
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
 const selected=c.dashboardWidgets||DEFAULT_DASHBOARD_WIDGETS,available=Object.keys(DASHBOARD_WIDGET_NAMES).filter(name=>!selected.includes(name));
 return `${head('Dein Workspace',`Dein persönliches Dashboard für ${esc(c.name)}. Widgets und Reihenfolge werden separat pro Charakter gespeichert.`,btn('export','↓ JSON-Backup'))}
 <div class="hero"><div><div class="hero-tag">ACTIVE CHARACTER / ${esc(c.name.toUpperCase())}</div><h2>${esc(c.name)}</h2><p>${esc(c.subtitle||'Dein Charakter')}. Organisiere dein Rollenspiel an einer zentralen Stelle – privat und lokal.</p></div><div class="hero-art">RP.</div></div>
 <div class="dashboard-controls"><select class="control" id="dashboard-widget-select" aria-label="Widget hinzufügen">${available.map(name=>`<option value="${name}">${esc(DASHBOARD_WIDGET_NAMES[name])}</option>`).join('')||'<option value="">Alle Widgets hinzugefügt</option>'}</select>${btn('widget-add','Widget hinzufügen','button-small',available.length?'':'disabled')}${btn('widget-reset','Standardlayout','button-quiet button-small')}</div>
 <div class="dashboard-grid">${selected.map((name,index)=>dashboardWidget(name,index,selected.length)).join('')}</div>`;
}
function pageSettings(){
 if(!char())return `${head('Tool-Einstellungen','Wähle für jeden Charakter die benötigten Tools aus.')}${empty('Bitte lege zuerst einen Charakter an.')}`;
 return `${head('Tool-Einstellungen','Tools für den aktiven Charakter ein- oder ausblenden. Die gespeicherten Daten bleiben erhalten.')}<div class="panel panel-pad">${CATEGORIES.slice(1).map(group=>`<div class="section-caption">${esc(group.heading)}</div><div class="tool-settings">${group.items.map(([page,title])=>`<label class="tool-setting"><input type="checkbox" data-tool-visibility="${esc(page)}" ${toolVisible(page)?'checked':''}> ${esc(title)}</label>`).join('')}</div><hr class="section-separator">`).join('')}</div>`;
}
function pageCharacters(){
 const c = char();
 const presetsHtml = THEME_PRESETS.map(p => `
  <button type="button" class="theme-preset-btn" data-action="apply-theme-preset" data-id="${esc(p.id)}">
   <span class="theme-preset-dot" style="background:${esc(p.accent)}"></span>
   <span>${esc(p.name)}</span>
  </button>
 `).join('');

 return `${head('Charaktere & Farbschema','Getrennte Daten für jeden Charakter. Sämtliche Module sind dem oben ausgewählten Charakter zugeordnet.')}
 <div class="grid"><div class="panel panel-pad span-8">${headlinePanel('Deine Charaktere')}<div class="grid">${db.characters.map(ch=>`<div class="span-6 character-card"><div class="character-avatar" style="background:${esc(ch.color||'#8aa6ff')}22;color:${esc(ch.color||'#8aa6ff')};border:1px solid ${esc(ch.color||'#8aa6ff')}55">${esc(ch.name.slice(0,2).toUpperCase())}</div><strong>${esc(ch.name)}</strong><div class="hint mt-12">${esc(ch.subtitle||'Ohne Beschreibung')}</div><div class="form-actions"><button class="button button-small ${ch.id===c?.id?'button-quiet':'button-ghost'}" data-action="switch-char" data-id="${esc(ch.id)}">${ch.id===c?.id?'Aktiv':'Auswählen'}</button>${btn('delete-char','Löschen','button-danger button-small',`data-id="${esc(ch.id)}"`)}</div></div>`).join('')||'<div class="span-12 hint">Noch keine Charaktere vorhanden.</div>'}</div>${c ? `<hr class="section-separator">${headlinePanel('Aktiven Charakter bearbeiten')}<div class="form-grid">${field('Name','name',c.name,'text',`data-char-field="name" maxlength="80"`)}${field('Rolle / Beschreibung','subtitle',c.subtitle||'','text','data-char-field="subtitle"')}${textareaField('Biografie / Notizen','bio',c.bio||'',4,'data-char-field="bio"')}</div><hr class="section-separator"><div class="section-caption">FARBSCHEMA ANPASSEN</div><div class="theme-presets-row">${presetsHtml}</div><div class="form-grid">${field('Akzentfarbe','color',c.color||'#8aa6ff','color','data-char-field="color"')}${field('Hintergrundfarbe (App)','bgColor',c.bgColor||'#0b1019','color','data-char-field="bgColor"')}${field('Karten / Boxen','cardColor',c.cardColor||'#121b29','color','data-char-field="cardColor"')}${field('Seitenleiste','sidebarColor',c.sidebarColor||'#0e1420','color','data-char-field="sidebarColor"')}${field('Rahmenfarbe (Borders)','borderColor',c.borderColor||'#273448','color','data-char-field="borderColor"')}</div>` : ''}<hr class="section-separator">${headlinePanel('Neuer Charakter')}<form data-form="character-create"><div class="form-grid">${field('Name','name','','text','required maxlength="80"')}${field('Rolle / Beschreibung','subtitle','')}${field('Akzentfarbe','color','#8aa6ff','color')}${field('Hintergrundfarbe','bgColor','#0b1019','color')}</div><div class="form-actions"><button class="button">Charakter anlegen</button></div></form></div>
 <div class="panel panel-pad span-4">${headlinePanel('Backup & Datenschutz')}<p class="hint">Alle Daten liegen im lokalen Speicher dieses Browsers und dieses Website-Ursprungs. Auf GitHub Pages wird nichts davon auf den Server hochgeladen.</p><div class="form-actions">${btn('export','↓ Alle Daten sichern','button')}<button class="button button-quiet" data-action="export-character">Aktiven Charakter sichern</button><button class="button button-quiet" data-action="import">↑ JSON wiederherstellen</button></div><hr class="section-separator"><div class="section-caption">AUSGEWÄHLTES MODUL EXPORTIEREN</div><div class="field"><label for="backup-module-select">Modul</label><select class="control" id="backup-module-select">${Object.entries({cases:'Ermittlungsakten',directory:'Personen & Fahrzeuge',deadlines:'Fristen',map:'RP-Karte',boards:'Pinnwände',interviews:'Vernehmungen',evidence:'Evidence',notes:'Notizen',timeline:'Timeline',tasks:'Aufgaben',leases:'Leasing',inventory:'Lager',finances:'Finanzen',minigolf:'Minigolf',snippets:'Textbausteine'}).map(([key,title])=>`<option value="${key}">${esc(title)}</option>`).join('')}</select></div><div class="form-actions">${btn('export-module','Modul-Backup herunterladen','button-quiet')}</div><hr class="section-separator"><div class="section-caption">SPEICHERN & SYNCHRONISIEREN</div><p class="hint">Auf Handy und PC sind die Speicherstände getrennt. Exportiere das JSON-Backup und importiere es auf dem anderen Gerät. Es findet keine automatische Synchronisierung statt.</p><div class="notice">Deine Browserdaten können beim Löschen von Websitedaten, im Privatmodus oder bei einem Browserwechsel verloren gehen. Regelmäßige Backups sind wichtig.</div><div class="form-actions">${btn('clear-data','Alle lokalen Daten zurücksetzen','button-danger')}</div></div></div>`;
}

return {pageDashboard,pageCharacters,pageSettings};
})();
