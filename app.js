(() => {
'use strict';
const {CATEGORIES,TITLES,ICONS,ico,$,esc,id,today,datetimeLocal,formatDate,fmtMoney,empty,field,textareaField,btn,head,uid,THEME_PRESETS,hexToRgb,rgbToHex,mixColors,applyTheme,compressImage,defaultSnippetsForChar,defaultData,REQUIRED_COLLECTIONS,OPTIONAL_COLLECTIONS,validImport,normalizeData,load,db,ui,persist,toast,char,scoped,collectionItem,sel,layoutBoardImages,openImageViewer,updateImageViewer,changeImageZoom,copyText,fallbackCopy,download,dataField,status,val,headlinePanel,listPane,renderDateTimeMeta,badge,replaceData}=window.RPDesk;
const {toolVisible}=window.RPDesk;
const pageModules=Object.assign({},window.RPDeskPages.dashboard,window.RPDeskPages.changelog,window.RPDeskPages.investigations,window.RPDeskPages.workspace,window.RPDeskPages.leisure,window.RPDeskPages.records,window.RPDeskPages.map);
const {APP_VERSION,pageDashboard,pageChangelog,pageCharacters,pageSettings,pageBoard,interviewReport,pageInterviews,evidencePairKey,evidenceResultLabel,evidenceResultKind,parseEvidenceLabReport,pageEvidence,leaseCalc,pageLeases,pageNotes,pageTime,pageMinigolf,pageSnippets,pageTimeline,pageTasks,pageInventory,pageFinances,pageCases,pageDeadlines,pageMap,recordReport}=pageModules;
const pages={dashboard:pageDashboard,changelog:pageChangelog,characters:pageCharacters,settings:pageSettings,cases:pageCases,deadlines:pageDeadlines,map:pageMap,board:pageBoard,interviews:pageInterviews,evidence:pageEvidence,leases:pageLeases,notes:pageNotes,time:pageTime,minigolf:pageMinigolf,snippets:pageSnippets,timeline:pageTimeline,tasks:pageTasks,inventory:pageInventory,finances:pageFinances};
function setPage(page){if(!TITLES[page]||!toolVisible(page))return;ui.page=page;$('#sidebar').classList.remove('open');$('#sidebar-backdrop').classList.remove('show');render();window.scrollTo({top:0,behavior:'auto'});}
function renderNavigation(){let html='';for(const group of CATEGORIES){const items=group.items.filter(([page])=>toolVisible(page));if(!items.length)continue;html+=`<div class="nav-group"><div class="nav-group-label">${esc(group.heading)}</div>`;for(const [p,title,icon] of items)html+=`<button class="nav-item ${ui.page===p?'active':''}" data-nav="${p}" ${ui.page===p?'aria-current="page"':''}>${ico(icon)}<span>${esc(title)}</span></button>`;html+='</div>'; }$('#navigation').innerHTML=html;}
function render(){
 if(db.characters.length>0){if(!char())ui.charId=db.characters[0].id;applyTheme(char());}else{ui.charId=null;applyTheme('#8aa6ff');}
 if(char()?.id!==ui.mapViewCharId){ui.mapViewCharId=char()?.id;ui.mapZoom=char()?.mapView?.zoom||1;ui.mapPanX=char()?.mapView?.panX||0;ui.mapPanY=char()?.mapView?.panY||0}
 if(!toolVisible(ui.page))ui.page='dashboard';
 $('#app-version').textContent=`v${APP_VERSION}`;
 renderNavigation();$('#current-page-name').textContent=TITLES[ui.page];
 $('#character-select').innerHTML=db.characters.length>0?db.characters.map(c=>`<option value="${esc(c.id)}" ${c.id===ui.charId?'selected':''}>${esc(c.name)}</option>`).join(''):'<option value="" disabled selected>Kein Charakter</option>';
 const searchCharacter=$('[data-search-character]');if(searchCharacter){const selected=searchCharacter.value||'current';searchCharacter.innerHTML=`<option value="current">Aktiver Charakter (${esc(char()?.name||'keiner')})</option><option value="all">Alle Charaktere</option>`;searchCharacter.value=selected}
 $('#content').innerHTML=(pages[ui.page]||pageDashboard)();layoutBoardImages();window.RPDeskPages.map?.afterRender();
}
function renderGlobalSearch(){
 const dialog=$('#global-search-dialog'),input=$('[data-global-search]',dialog),results=$('#global-search-results');
 if(!dialog||!input||!results)return;
 const type=$('[data-search-type]',dialog)?.value||'',allCharacters=$('[data-search-character]',dialog)?.value==='all';
 const matches=window.RPDesk.searchEntities(input.value,{type,allCharacters}).slice(0,40);
 ui.searchActiveIndex=Math.min(ui.searchActiveIndex||0,Math.max(0,matches.length-1));
 results.innerHTML=matches.length?matches.map((item,index)=>{const fields=window.RPDesk.entityFields(item);return `<button class="search-result ${index===ui.searchActiveIndex?'active':''}" role="option" aria-selected="${index===ui.searchActiveIndex}" data-open-entity="${esc(item.id)}"><span class="search-result-icon">${esc(({case:'▤',person:'◉',vehicle:'▰',organization:'⌂',evidence:'◇',note:'▤',task:'✓',deadline:'◷',location:'⌖',event:'◷',board:'⌘'})[item.type]||'◇')}</span><span class="search-result-main"><strong>${esc(window.RPDesk.entityLabel(item))}</strong><small>${esc(window.RPDesk.entityDescription(item)||fields.plate||fields.caseNumber||'Kein Kurztext')}</small></span><span class="search-result-meta">${esc(fields.plate||fields.caseNumber||item.type)}${allCharacters?` · ${esc(db.characters.find(character=>character.id===item.charId)?.name||'Gemeinsam')}`:''}</span></button>`}).join(''):`<p class="hint search-empty">${input.value?'Keine passenden Datensätze gefunden.':'Suche Akten, Personen, Fahrzeuge, Kennzeichen, Aufgaben, Notizen und mehr.'}</p>`;
}
function openGlobalSearch(){
 const dialog=$('#global-search-dialog'),input=$('[data-global-search]',dialog);if(!dialog)return;
 if(typeof dialog.showModal==='function'&&!dialog.open)dialog.showModal();else dialog.setAttribute('open','');
 ui.searchActiveIndex=0;renderGlobalSearch();input?.focus();
}
function saveAndRender(message){const saved=persist();render();if(saved&&message)toast(message)}
function clearLeisureState(){ui.editInventory=null;ui.editFinance=null;ui.costCalculation=null}
function removeItem(collection,itemId){const it=collectionItem(collection,itemId);if(!it||!confirm('Eintrag wirklich löschen? Diese Aktion kann nur über ein Backup rückgängig gemacht werden.'))return;db[collection]=db[collection].filter(x=>x.id!==itemId);if(ui.selection[collection]===itemId)delete ui.selection[collection];saveAndRender('Eintrag gelöscht.');}
function openEntity(itemId){
 const item=db.entities.find(entry=>entry.id===itemId);if(!item)return;
 if(item.charId&&db.characters.some(entry=>entry.id===item.charId))ui.charId=item.charId;
 const routes={case:'cases',person:'directory',vehicle:'directory',organization:'directory',deadline:'deadlines',location:'map'};
 if(routes[item.type]){ui.page=routes[item.type];ui.selection[routes[item.type]==='directory'?'directory':item.type]=item.id;render();return}
 const collection=item.fields.legacyCollection,legacyId=item.fields.legacyId;
 const route={boards:'board',interviews:'interviews',leases:'leases',notes:'notes',timeline:'timeline',tasks:'tasks',snippets:'snippets',evidence:'evidence',evidenceReports:'evidence',inventory:'inventory',finances:'finances',minigolf:'minigolf'}[collection];
 if(route){ui.page=route;ui.selection[collection==='evidenceReports'?'evidence':collection]=legacyId;render();return}
 ui.page='dashboard';render();
}
function recordLinks(entityId){return db.relationships.filter(item=>item.sourceId===entityId||item.targetId===entityId)}
function caseChronology(item,text){item.fields.chronology=Array.isArray(item.fields.chronology)?item.fields.chronology:[];item.fields.chronology.push({at:new Date().toISOString(),text});item.updatedAt=new Date().toISOString()}
function createRecordLink(form){
 const sourceId=form.dataset.sourceId,targetId=val(form,'targetId'),type=val(form,'type'),description=val(form,'description');
 try{
  window.RPDesk.linkEntities(sourceId,targetId,type,description);
  for(const [caseId,otherId] of [[sourceId,targetId],[targetId,sourceId]]){const record=window.RPDesk.entity(caseId);if(record?.type==='case')caseChronology(record,`${window.RPDesk.entityLabel(window.RPDesk.entity(otherId))} verknüpft (${type})`)}
  saveAndRender('Datensätze verknüpft.');
 }catch(error){toast(error.message,true)}
}
function recordTaskChange(task,done){
 const taskEntity=window.RPDesk.entityForLegacy('tasks',task.id);if(!taskEntity)return;
 for(const {entity:related} of window.RPDesk.relatedEntities(taskEntity.id))if(related.type==='case')caseChronology(related,`Maßnahme ${done?'abgeschlossen':'wieder geöffnet'}: ${task.title}`);
}
function exportCharacterBackup(characterId){
 const character=db.characters.find(item=>item.id===characterId);if(!character)return;
 const backup=defaultData();backup.characters=[character];
 for(const key of [...REQUIRED_COLLECTIONS,...OPTIONAL_COLLECTIONS])if(key!=='characters')backup[key]=[...new Set(backup[key])].concat(db[key]?.filter(item=>item.charId===characterId)||[]);
 const included=new Set(db.entities.filter(item=>item.charId===characterId).map(item=>item.id));let changed=true;
 while(changed){changed=false;for(const link of db.relationships){if(included.has(link.sourceId)||included.has(link.targetId)){const other=window.RPDesk.entity(included.has(link.sourceId)?link.targetId:link.sourceId);if(other&&(other.charId===null||other.charId===characterId)&&!included.has(other.id)){included.add(other.id);changed=true}}}}
 backup.entities=db.entities.filter(item=>included.has(item.id));backup.relationships=db.relationships.filter(item=>included.has(item.sourceId)&&included.has(item.targetId));
 download(`rp-desk-${character.name.replace(/[^a-z0-9_-]/gi,'-')}-${today()}.json`,JSON.stringify(backup,null,2),'application/json');toast('Charakter-Backup erstellt.');
}
function exportModuleBackup(module){
 const character=char();if(!character)return;
 const backup=defaultData();backup.characters=[character];
 for(const key of [...new Set([...REQUIRED_COLLECTIONS,...OPTIONAL_COLLECTIONS])])if(key!=='characters')backup[key]=key===module&&Array.isArray(db[key])?db[key].filter(item=>item.charId===character.id):[];
 if(module==='evidence')backup.evidenceReports=db.evidenceReports.filter(item=>item.charId===character.id);
 const seedTypes={cases:['case'],deadlines:['deadline'],map:['location'],directory:['person','vehicle','organization']};
 const included=new Set(db.entities.filter(item=>module==='map'?item.type==='location'&&(item.charId===character.id||item.charId===null):item.charId===character.id&&(item.fields.legacyCollection===module||(seedTypes[module]||[]).includes(item.type))).map(item=>item.id));let changed=true;
 while(changed){changed=false;for(const link of db.relationships){if(included.has(link.sourceId)||included.has(link.targetId)){const other=window.RPDesk.entity(included.has(link.sourceId)?link.targetId:link.sourceId);if(other&&(other.charId===null||other.charId===character.id)&&!included.has(other.id)){included.add(other.id);changed=true}}}}
 backup.entities=db.entities.filter(item=>included.has(item.id));const ids=new Set(backup.entities.map(item=>item.id));backup.relationships=db.relationships.filter(item=>ids.has(item.sourceId)&&ids.has(item.targetId));
 for(const item of backup.entities){const collection=item.fields.legacyCollection,recordId=item.fields.legacyId;if(!collection||!recordId||!Array.isArray(db[collection])||collection===module)continue;const record=db[collection].find(value=>value.id===recordId&&value.charId===character.id);if(record)backup[collection].push(record)}
 download(`rp-desk-${module}-${character.name.replace(/[^a-z0-9_-]/gi,'-')}-${today()}.json`,JSON.stringify(backup,null,2),'application/json');toast('Modul-Backup erstellt.');
}
function mergeBackups(current,incoming){
 const merged=JSON.parse(JSON.stringify(current));
 for(const key of new Set([...REQUIRED_COLLECTIONS,...OPTIONAL_COLLECTIONS,'entities','relationships'])){
  if(!Array.isArray(merged[key]))merged[key]=[];
  const existing=new Set(merged[key].map(item=>item.id));
  for(const item of incoming[key]||[])if(!existing.has(item.id)){merged[key].push(item);existing.add(item.id)}
 }
 merged.schemaVersion=window.RPDesk.SCHEMA_VERSION;merged.version=1;
 if(!validImport(merged))throw new Error('Das zusammengeführte Backup enthält ungültige oder verwaiste Verknüpfungen.');
 return merged;
}
function showBackupPreview(data){
 ui.pendingBackup=data;const summary=[...new Set([...REQUIRED_COLLECTIONS,...OPTIONAL_COLLECTIONS,'entities','relationships'])].filter(key=>Array.isArray(data[key])&&data[key].length).map(key=>`<div class="line-item"><strong>${esc(TITLES[key]||({entities:'Entitäten',relationships:'Verknüpfungen'})[key]||key)}</strong><span>${data[key].length}</span></div>`).join('');
 $('#backup-preview-content').innerHTML=`<p class="hint">Formatversion ${esc(data.version)} · Datenschema ${esc(data.schemaVersion||1)} · ${data.characters.length} Charakter(e)</p><div class="line-list">${summary||'<p class="hint">Keine Einträge im Backup.</p>'}</div><p class="notice mt-12">„Zusammenführen“ behält vorhandene Einträge mit gleicher ID und ergänzt neue Datensätze. „Ersetzen“ ersetzt alle lokalen Daten.</p>`;
 const dialog=$('#backup-preview-dialog');if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
}
function completeBackupImport(mode){
 const incoming=ui.pendingBackup;if(!incoming)return;
 try{
  if(mode==='merge')replaceData(mergeBackups(db,incoming));else replaceData(incoming);
  ui.charId=db.characters[0]?.id||null;ui.selection={};clearLeisureState();ui.pendingBackup=null;$('#backup-preview-dialog').close();saveAndRender(mode==='merge'?'Backup zusammengeführt.':'Backup wiederhergestellt.');
 }catch(error){toast('Backup-Import fehlgeschlagen: '+error.message,true)}
}
function handleForm(f){if(window.RPDeskPages.map?.handleSubmit(f))return;const kind=f.dataset.form;if(!kind)return;const currentChar=char()?.id;
 switch(kind){
 case 'relationship-create':createRecordLink(f);break;
 case 'case-create': {
  if(!currentChar)return;
  const title=val(f,'title');if(!title){toast('Bitte einen Titel eingeben.',true);return}
  const record=window.RPDesk.createEntity('case',currentChar,{caseNumber:val(f,'caseNumber'),title,description:val(f,'description'),occurredAt:val(f,'occurredAt'),investigator:val(f,'investigator'),status:val(f,'status')||'Offen',priority:val(f,'priority')||'Normal',location:val(f,'location'),chronology:[{at:new Date().toISOString(),text:'Akte erstellt'}]});
  ui.selection.case=record.id;saveAndRender('Akte angelegt.');break
 }
 case 'quick-link-create': {
  const label=val(f,'label'),page=val(f,'page'),current=char();if(!current||!label||!TITLES[page]||!toolVisible(page)){toast('Bitte einen gültigen Namen und ein sichtbares Modul auswählen.',true);return}
  const links=[...(current.quickLinks||[])];if(links.length>=20){toast('Maximal 20 eigene Schnellzugriffe.',true);return}
  links.push({id:uid('quick-link'),label,page});current.quickLinks=links;saveAndRender('Schnellzugriff gespeichert.');break
 }
 case 'case-save': {
  const record=db.entities.find(item=>item.id===f.dataset.id&&item.type==='case'&&item.charId===currentChar);if(!record)return;
  const next={caseNumber:val(f,'caseNumber'),title:val(f,'title'),description:val(f,'description'),occurredAt:val(f,'occurredAt'),investigator:val(f,'investigator'),status:val(f,'status'),priority:val(f,'priority'),location:val(f,'location')};
  if(!next.title){toast('Bitte einen Titel eingeben.',true);return}
  if(record.fields.status!==next.status)caseChronology(record,`Status geändert: ${record.fields.status||'Offen'} → ${next.status}`);
  Object.assign(record.fields,next);record.updatedAt=new Date().toISOString();saveAndRender('Akte aktualisiert.');break
 }
 case 'case-task': {
  const record=db.entities.find(item=>item.id===f.dataset.caseId&&item.type==='case'&&item.charId===currentChar),title=val(f,'title');if(!record||!title)return;
  const task={id:uid('task'),charId:currentChar,title,details:val(f,'details'),due:val(f,'due'),priority:val(f,'priority')||'Normal',done:false,createdAt:new Date().toISOString()};
  db.tasks.push(task);persist();const taskEntity=window.RPDesk.entityForLegacy('tasks',task.id);
  window.RPDesk.linkEntities(record.id,taskEntity.id,'Maßnahme');caseChronology(record,`Maßnahme angelegt: ${title}`);saveAndRender('Maßnahme angelegt.');break
 }
 case 'case-event': {
  const record=db.entities.find(item=>item.id===f.dataset.id&&item.type==='case'&&item.charId===currentChar),text=val(f,'entry');if(!record||!text)return;caseChronology(record,text);saveAndRender('Chronologie ergänzt.');break
 }
 case 'record-create': {
  const type=val(f,'type'),name=val(f,'name');if(!currentChar||!['person','vehicle','organization'].includes(type)||!name){toast('Bitte Typ und Namen für den Datensatz angeben.',true);return}
  const aliases=val(f,'aliases').split(',').map(value=>value.trim()).filter(Boolean),item=window.RPDesk.createEntity(type,currentChar,{name,aliases,plate:val(f,'plate'),relatedName:val(f,'relatedName'),description:val(f,'description')});ui.selection.directory=item.id;saveAndRender('Datensatz angelegt.');break
 }
 case 'record-save': {
  const record=window.RPDesk.entity(f.dataset.id);if(!record||record.charId!==currentChar)return;
  const name=val(f,'name');if(!name){toast('Bitte einen Namen eingeben.',true);return}
  try{window.RPDesk.updateEntity(record.id,{name,aliases:val(f,'aliases').split(',').map(value=>value.trim()).filter(Boolean),plate:val(f,'plate'),relatedName:val(f,'relatedName'),description:val(f,'description')});saveAndRender('Datensatz aktualisiert.')}catch(error){toast(error.message,true)}break
 }
 case 'deadline-create': {
  if(!currentChar)return;
  const title=val(f,'title'),dueAt=val(f,'dueAt');if(!title||!dueAt||!Number.isFinite(Date.parse(dueAt))){toast('Bitte Titel und einen gültigen Fälligkeitszeitpunkt eingeben.',true);return}
  const type=val(f,'deadlineTypeCustom')||val(f,'deadlineType')||'Sonstige';if(val(f,'deadlineTypeCustom')&&!char().deadlineTypes?.includes(type))char().deadlineTypes=[...(char().deadlineTypes||[]),type];
  const item=window.RPDesk.createEntity('deadline',currentChar,{title,description:val(f,'description'),deadlineType:type,dueAt,status:'open',priority:val(f,'priority')||'Normal',reminderHours:[Number(val(f,'reminderHours'))||24]});
  const caseId=val(f,'caseId');if(caseId){window.RPDesk.linkEntities(item.id,caseId,'Frist für');const caseRecord=window.RPDesk.entity(caseId);if(caseRecord)caseChronology(caseRecord,`Frist erstellt: ${title}`)}
  ui.selection.deadline=item.id;saveAndRender('Frist angelegt.');break
 }
 case 'deadline-save': {
  const item=window.RPDesk.entity(f.dataset.id);if(!item||item.type!=='deadline'||item.charId!==currentChar)return;
  const title=val(f,'title'),dueAt=val(f,'dueAt');if(!title||!Number.isFinite(Date.parse(dueAt))){toast('Bitte Titel und gültigen Fälligkeitszeitpunkt angeben.',true);return}
  const type=val(f,'deadlineTypeCustom')||val(f,'deadlineType')||'Sonstige';if(val(f,'deadlineTypeCustom')&&!char().deadlineTypes?.includes(type))char().deadlineTypes=[...(char().deadlineTypes||[]),type];
  const status=val(f,'status');if(!['open','done','cancelled'].includes(status)){toast('Ungültiger Fristenstatus.',true);return}
  Object.assign(item.fields,{title,dueAt,deadlineType:type,priority:val(f,'priority')||'Normal',description:val(f,'description'),status,completedAt:status==='done'?(item.fields.completedAt||new Date().toISOString()):undefined,reminderHours:[Number(val(f,'reminderHours'))||24]});item.updatedAt=new Date().toISOString();saveAndRender('Frist aktualisiert.');break
 }
 case 'location-save': {
  if(!currentChar)return;
  const name=val(f,'name'),x=Number(val(f,'x')),y=Number(val(f,'y'));
  if(!name||!Number.isFinite(x)||x<0||x>100||!Number.isFinite(y)||y<0||y>100){toast('Bitte einen Namen und Kartenpositionen zwischen 0 und 100 eingeben.',true);return}
  const fields={name,category:val(f,'category')||'Sonstiges',x,y,eventDate:val(f,'eventDate'),description:val(f,'description')};
  let item;
  if(f.dataset.id){item=db.entities.find(entry=>entry.id===f.dataset.id&&entry.type==='location'&&entry.charId===currentChar);if(!item)return;Object.assign(item.fields,fields);item.updatedAt=new Date().toISOString()}
  else item=window.RPDesk.createEntity('location',currentChar,fields);
  ui.selection.location=item.id;ui.mapAddMode=false;ui.mapEditing=null;ui.pendingMapPosition=null;saveAndRender('Kartenmarker gespeichert.');break
 }
 case 'inventory-save':
 case 'cost-calculate': {
  if(!currentChar)return;
  const rawQuantity=val(f,'quantity'),rawPrice=val(f,'price'),quantity=Number(rawQuantity),price=Number(rawPrice);
  if(!rawQuantity||!rawPrice||!Number.isInteger(quantity)||quantity<0||quantity>100000||!Number.isFinite(price)||price<0||price>1000000||Math.abs(price*100-Math.round(price*100))>0.000001){toast('Bitte eine gültige Menge und einen Stückpreis mit höchstens zwei Nachkommastellen eingeben.',true);return}
  if(kind==='cost-calculate'){ui.costCalculation={quantity,price,total:quantity*Math.round(price*100)/100};render();break}
  const name=val(f,'name');if(!name){toast('Bitte einen Artikelnamen eingeben.',true);return}
  const item=f.dataset.id?collectionItem('inventory',f.dataset.id):null;
  if(f.dataset.id&&!item){toast('Artikel nicht gefunden.',true);return}
  if(item)Object.assign(item,{name,quantity,price});else db.inventory.push({id:uid('inventory'),charId:currentChar,name,quantity,price});
  ui.editInventory=null;saveAndRender('Artikel gespeichert.');break
 }
 case 'finance-save': {
  if(!currentChar)return;
  const description=val(f,'description'),type=val(f,'type'),rawAmount=val(f,'amount'),amount=Number(rawAmount),date=val(f,'date');
  if(!description||!['income','expense'].includes(type)||!rawAmount||!Number.isFinite(amount)||amount<0.01||amount>1000000||Math.abs(amount*100-Math.round(amount*100))>0.000001||!date){toast('Bitte eine gültige Buchung mit Betrag und Datum eingeben.',true);return}
  const item=f.dataset.id?collectionItem('finances',f.dataset.id):null;
  if(f.dataset.id&&!item){toast('Buchung nicht gefunden.',true);return}
  if(item)Object.assign(item,{description,type,amount,date});else db.finances.push({id:uid('finance'),charId:currentChar,description,type,amount,date});
  ui.editFinance=null;saveAndRender('Buchung gespeichert.');break
 }
 case 'character-create': {
  const name=val(f,'name');if(!name)return;
  const ch={
   id: uid('char'),
   name,
   subtitle: val(f,'subtitle'),
   color: val(f,'color')||'#8aa6ff',
   bgColor: val(f,'bgColor')||'#0b1019',
   sidebarColor: '',
   cardColor: '',
   borderColor: '',
   bio: ''
  };
  db.characters.push(ch);
  const defaultSnips = defaultSnippetsForChar(ch.id, ch.name);
  db.snippets.push(...defaultSnips);
  ui.charId=ch.id;
  clearLeisureState();
  ui.selection={snippets: defaultSnips[0]?.id};
  saveAndRender('Charakter mit Farbschema angelegt.');
  break;
 }
 case 'board-create': {const name=val(f,'name');if(!name||!currentChar)return;const b={id:uid('board'),charId:currentChar,name,nodes:[],edges:[]};db.boards.push(b);ui.selection.boards=b.id;ui.selection.node=null;saveAndRender('Pinnwand angelegt.');break}
 case 'board-node': {let b=sel('boards');if(!b)return;const label=val(f,'label');if(!label)return;const image=ui.pendingNodeImage||null,width=b.width||1200,height=b.height||650,x=Math.min(width-(image?240:190),60+(b.nodes.length%4)*250),y=Math.min(height-(image?200:65),55+Math.floor(b.nodes.length/4)*200);b.nodes.push({id:uid('node'),type:val(f,'type'),label,notes:val(f,'notes'),image,x,y});ui.pendingNodeImage=null;ui.selection.node=b.nodes.at(-1).id;saveAndRender('Element hinzugefügt.');break}
 case 'board-edge': {let b=sel('boards');if(!b)return;const from=val(f,'from'),to=val(f,'to');if(!from||!to||from===to){toast('Bitte zwei unterschiedliche Elemente wählen.',true);return}if(!b.nodes.find(x=>x.id===from)||!b.nodes.find(x=>x.id===to))return;b.edges.push({id:uid('edge'),from,to,label:val(f,'label')});saveAndRender('Verbindung hinzugefügt.');break}
 case 'interview-create': {if(!currentChar)return;const v={id:uid('interview'),charId:currentChar,subject:val(f,'subject'),caseNumber:val(f,'caseNumber'),date:datetimeLocal(),location:'',participants:'',notes:'',questions:[]};if(!v.subject)return;db.interviews.push(v);ui.selection.interviews=v.id;saveAndRender('Vernehmung angelegt.');break}
 case 'question-create': {const v=sel('interviews');if(!v)return;const question=val(f,'question');if(!question)return;v.questions.push({id:uid('question'),question,answer:'',status:'normal'});saveAndRender('Frage hinzugefügt.');break}
 case 'lease-create': {if(!currentChar)return;const total=Number(val(f,'total')),rate=Number(val(f,'weeklyRate'));if(!(total>0&&rate>0)){toast('Bitte gültige Beträge eingeben.',true);return}const l={id:uid('lease'),charId:currentChar,vehicle:val(f,'vehicle'),plate:val(f,'plate'),startDate:val(f,'startDate'),total,weeklyRate:rate,intervalWeeks:1,payments:[]};db.leases.push(l);ui.selection.leases=l.id;saveAndRender('Vertrag angelegt.');break}
 case 'lease-payment': {const l=sel('leases');if(!l)return;const amount=Number(val(f,'amount'));if(!(amount>0)){toast('Zahlung muss größer als null sein.',true);return}l.payments.push({id:uid('payment'),date:val(f,'date')||today(),amount,note:val(f,'note')});saveAndRender('Zahlung gespeichert – Fälligkeit aktualisiert.');break}
 case 'note-create': {if(!currentChar)return;const n={id:uid('note'),charId:currentChar,title:val(f,'title'),body:'',updatedAt:new Date().toISOString()};if(!n.title)return;db.notes.push(n);ui.selection.notes=n.id;saveAndRender('Notiz angelegt.');break}
 case 'time-diff': {const a=val(f,'from'),b=val(f,'to');if(!a||!b)return;const n=Math.abs(new Date(b)-new Date(a));if(!Number.isFinite(n)){toast('Ungültiges Datum.',true);return}ui.timeDiffFrom=a;ui.timeDiffTo=b;ui.timeResult={type:'diff',hours:Math.floor(n/3600000),minutes:Math.floor(n/60000),days:(n/86400000).toLocaleString('de-DE',{maximumFractionDigits:2})};render();break}
 case 'time-add': {const at=val(f,'at'),amount=Number(val(f,'amount'));const ms={minutes:60000,hours:3600000,days:86400000,weeks:7*86400000}[val(f,'unit')]||3600000;const result=new Date(new Date(at).getTime()+(val(f,'operation')==='subtract'?-1:1)*amount*ms);if(isNaN(result.getTime())){toast('Ungültiger Zeitpunkt.',true);return}ui.timeAt=at;ui.timeAmount=String(amount);ui.timeResult={type:'add',text:formatDate(result.toISOString(),true)};render();break}
 case 'snippet-create': {if(!currentChar)return;const s={id:uid('snip'),charId:currentChar,title:val(f,'title'),body:''};if(!s.title)return;db.snippets.push(s);ui.selection.snippets=s.id;saveAndRender('Beschlussvorlage angelegt.');break}
 case 'timeline-create': {if(!currentChar)return;const title=val(f,'title');if(!title)return;db.timeline.push({id:uid('event'),charId:currentChar,title,at:val(f,'at'),category:val(f,'category'),caseNumber:val(f,'caseNumber'),details:val(f,'details')});saveAndRender('Ereignis gespeichert.');break}
 case 'timeline-edit': {const it=collectionItem('timeline',f.dataset.id);if(!it)return;for(const k of ['title','at','category','caseNumber','details'])it[k]=val(f,k);ui.editTimeline=null;saveAndRender('Ereignis geändert.');break}
 case 'task-create': {if(!currentChar)return;const title=val(f,'title');if(!title)return;db.tasks.push({id:uid('task'),charId:currentChar,title,due:val(f,'due'),priority:val(f,'priority'),details:val(f,'details'),done:false});saveAndRender('Aufgabe angelegt.');break}
 case 'evidence-create': {
  if(!currentChar)return;
  const caseId=val(f,'caseId');
  if(!caseId){toast('Bitte eine Evidence-ID angeben.',true);return}
  if(scoped('evidence').some(item=>item.caseId.toLowerCase()===caseId.toLowerCase())){toast('Diese Evidence-ID ist für den Charakter bereits vorhanden.',true);return}
  db.evidence.push({id:uid('evidence'),charId:currentChar,caseId,weaponType:val(f,'weaponType'),serialNumber:val(f,'serialNumber'),suspect:val(f,'suspect'),notes:val(f,'notes'),createdAt:new Date().toISOString()});
  saveAndRender('Evidence gespeichert.');
  break
 }
 case 'evidence-compare': {
  if(!currentChar)return;
  const first=collectionItem('evidence',val(f,'case1')),second=collectionItem('evidence',val(f,'case2')),result=val(f,'result');
  if(!first||!second){toast('Bitte zwei erfasste Hülsen auswählen.',true);return}
  if(first.id===second.id){toast('Eine Hülse kann nicht mit sich selbst verglichen werden.',true);return}
  if(!['MATCH','NO_MATCH','DIFFERENT_WEAPON'].includes(result)){toast('Ungültiges Vergleichsergebnis.',true);return}
  db.evidenceReports.push({id:uid('evidence-report'),charId:currentChar,caseId1:first.caseId,caseId2:second.caseId,result,reportId:val(f,'reportId'),importedAt:new Date().toISOString(),source:'manual'});
  saveAndRender('Vergleich dokumentiert.');
  break
 }
 case 'evidence-report-import': {
  if(!currentChar)return;
  const rawText=val(f,'reportText'),parsed=parseEvidenceLabReport(rawText);
  if(!parsed){toast('Bericht nicht erkannt. Es müssen zwei siebenstellige Evidence-IDs enthalten sein.',true);return}
  let first=db.evidence.find(item=>item.charId===currentChar&&item.caseId.toLowerCase()===parsed.caseId1.toLowerCase());
  let second=db.evidence.find(item=>item.charId===currentChar&&item.caseId.toLowerCase()===parsed.caseId2.toLowerCase());
  if(parsed.caseId1===parsed.caseId2){toast('Der Bericht enthält zweimal dieselbe Evidence-ID.',true);return}
  if(!first){first={id:uid('evidence'),charId:currentChar,caseId:parsed.caseId1,weaponType:parsed.weaponType1,serialNumber:'',suspect:'',notes:'',createdAt:new Date().toISOString()};db.evidence.push(first)}
  else if(parsed.weaponType1)first.weaponType=parsed.weaponType1;
  if(!second){second={id:uid('evidence'),charId:currentChar,caseId:parsed.caseId2,weaponType:parsed.weaponType2,serialNumber:'',suspect:'',notes:'',createdAt:new Date().toISOString()};db.evidence.push(second)}
  else if(parsed.weaponType2)second.weaponType=parsed.weaponType2;
  db.evidenceReports.push({id:uid('evidence-report'),charId:currentChar,caseId1:first.caseId,caseId2:second.caseId,result:parsed.result,reportId:'',importedAt:new Date().toISOString(),source:'import',rawText});
  saveAndRender('Laborbericht importiert.');
  break
 }
 case 'golf-create': {if(!currentChar)return;const course=val(f,'course'),names=[...new Set(val(f,'players').split(',').map(name=>name.trim()).filter(Boolean))];if(!course||!names.length){toast('Bitte einen Platz und mindestens einen Namen angeben.',true);return}const requestedHoles=Number(val(f,'holes')),holes=[9,12,18].includes(requestedHoles)?requestedHoles:12;const round={id:uid('golf'),charId:currentChar,course,createdAt:datetimeLocal(),holes:Array.from({length:holes},()=>({par:2})),players:names.map(name=>({id:uid('player'),name,scores:Array(holes).fill(null)}))};db.minigolf.push(round);ui.selection.minigolf=round.id;saveAndRender('Minigolf-Runde angelegt.');break}
 }
}
function handleAction(el){const action=el.dataset.action, value=el.dataset.value, itemId=el.dataset.id;
 if(action==='open-search'){openGlobalSearch();return}
 if(action==='export-character'){exportCharacterBackup(char()?.id);return}
 if(action==='export-module'){exportModuleBackup($('#backup-module-select')?.value);return}
 if(action==='confirm-import-merge'){completeBackupImport('merge');return}
 if(action==='confirm-import-replace'){completeBackupImport('replace');return}
 if(action==='cancel-backup-import'){ui.pendingBackup=null;$('#backup-preview-dialog').close();return}
 if(action==='reload-app'){location.reload();return}
 if(action==='case-delete'){
  const record=window.RPDesk.entity(itemId);if(!record||record.type!=='case'||!confirm(`Akte „${window.RPDesk.entityLabel(record)}“ löschen? Verknüpfte Datensätze bleiben erhalten.`))return;
  db.entities=db.entities.filter(item=>item.id!==itemId);db.relationships=db.relationships.filter(item=>item.sourceId!==itemId&&item.targetId!==itemId);
  delete ui.selection.case;saveAndRender('Akte gelöscht.');return
 }
 if(action==='record-delete'){
  const record=window.RPDesk.entity(itemId);if(!record||!['person','vehicle','organization'].includes(record.type)||record.charId!==char()?.id||!confirm(`Datensatz „${window.RPDesk.entityLabel(record)}“ löschen? Verknüpfungen werden entfernt, andere Datensätze bleiben erhalten.`))return;
  db.entities=db.entities.filter(item=>item.id!==itemId);db.relationships=db.relationships.filter(item=>item.sourceId!==itemId&&item.targetId!==itemId);delete ui.selection.directory;saveAndRender('Datensatz gelöscht.');return
 }
 if(action==='case-export-txt'||action==='case-copy'||action==='case-export-json'||action==='case-print'){
  const record=window.RPDesk.entity(itemId);if(!record||record.type!=='case')return;
  if(action==='case-export-txt')download(`Akte-${(record.fields.caseNumber||record.fields.title||'Bericht').replace(/[^a-z0-9_-]/gi,'-')}.txt`,recordReport(record));
  if(action==='case-export-json')download(`Akte-${(record.fields.caseNumber||'Bericht').replace(/[^a-z0-9_-]/gi,'-')}.json`,JSON.stringify({case:record,relationships:recordLinks(itemId).map(link=>({relationship:link,record:window.RPDesk.entity(link.sourceId===itemId?link.targetId:link.sourceId)}))},null,2),'application/json');
  if(action==='case-copy')copyText(recordReport(record));
  if(action==='case-print')window.print();
  return
 }
 if(action==='unlink-record'){
  const relation=db.relationships.find(item=>item.id===itemId);if(relation){const left=window.RPDesk.entity(relation.sourceId),right=window.RPDesk.entity(relation.targetId);for(const [record,other] of [[left,right],[right,left]])if(record?.type==='case'&&other)caseChronology(record,`${window.RPDesk.entityLabel(other)} Verknüpfung entfernt (${relation.type})`)}
  if(window.RPDesk.unlinkRelationship(itemId))saveAndRender('Verknüpfung entfernt.');return
 }
 if(action.startsWith('deadline-')){
  const item=window.RPDesk.entity(itemId);if(!item||item.type!=='deadline'||item.charId!==char()?.id)return;
  if(action==='deadline-done'){item.fields.status='done';item.fields.completedAt=new Date().toISOString();item.updatedAt=new Date().toISOString();saveAndRender('Frist erledigt.');return}
  if(action==='deadline-cancel'){item.fields.status='cancelled';item.fields.completedAt=undefined;item.updatedAt=new Date().toISOString();saveAndRender('Frist abgebrochen.');return}
  if(action==='deadline-postpone'){const due=Date.parse(item.fields.dueAt);if(!Number.isFinite(due)){toast('Fälligkeitsdatum ist ungültig.',true);return}item.fields.dueAt=new Date(due+24*60*60*1000).toISOString().slice(0,16);item.fields.status='open';item.updatedAt=new Date().toISOString();saveAndRender('Frist um 24 Stunden verschoben.');return}
  if(action==='deadline-duplicate'){const duplicate=window.RPDesk.createEntity('deadline',item.charId,{...item.fields,status:'open',completedAt:undefined});ui.selection.deadline=duplicate.id;saveAndRender('Frist dupliziert.');return}
  if(action==='deadline-delete'){if(!confirm(`Frist „${window.RPDesk.entityLabel(item)}“ löschen?`))return;db.entities=db.entities.filter(entry=>entry.id!==itemId);db.relationships=db.relationships.filter(link=>link.sourceId!==itemId&&link.targetId!==itemId);delete ui.selection.deadline;saveAndRender('Frist gelöscht.');return}
 }
 if(action==='map-add-mode'){ui.mapAddMode=!ui.mapAddMode;ui.pendingMapPosition=null;render();return}
 if(action==='map-edit'){ui.mapEditing=itemId;ui.selection.location=itemId;render();return}
 if(action==='map-edit-cancel'){ui.mapEditing=null;render();return}
 if(action==='map-center'){const item=window.RPDesk.entity(itemId),surface=$('[data-map-surface]'),zoom=ui.mapZoom||1;if(item&&surface){ui.mapPanX=(50-Number(item.fields.x||0))*surface.clientWidth*zoom/100;ui.mapPanY=(50-Number(item.fields.y||0))*surface.clientHeight*zoom/100}const current=char();if(current)current.mapView={zoom,panX:ui.mapPanX||0,panY:ui.mapPanY||0};ui.selection.location=itemId;ui.mapCenterId=itemId;persist();render();return}
 if(action==='map-delete'){const item=window.RPDesk.entity(itemId);if(!item||item.type!=='location'||!confirm(`Marker „${window.RPDesk.entityLabel(item)}“ löschen? Verknüpfte Datensätze bleiben erhalten.`))return;db.entities=db.entities.filter(entry=>entry.id!==itemId);db.relationships=db.relationships.filter(link=>link.sourceId!==itemId&&link.targetId!==itemId);delete ui.selection.location;saveAndRender('Marker gelöscht.');return}
 if(action==='widget-up'||action==='widget-down'||action==='widget-remove'){
  const current=char();if(!current)return;const widgets=[...(current.dashboardWidgets||['cases','deadlines','tasks','activity','quick','finances','leases','inventory','note'])],at=widgets.indexOf(value);
  if(action==='widget-remove')widgets.splice(at,1);
  else{const next=at+(action==='widget-up'?-1:1);if(at<0||next<0||next>=widgets.length)return;[widgets[at],widgets[next]]=[widgets[next],widgets[at]]}
  current.dashboardWidgets=widgets;saveAndRender('Dashboard angepasst.');return
 }
 if(action==='widget-size'){
  const current=char();if(!current)return;const sizes={...(current.dashboardWidgetSizes||{})},cycle=['normal','large','compact'];sizes[value]=cycle[(cycle.indexOf(sizes[value]||'normal')+1)%cycle.length];current.dashboardWidgetSizes=sizes;saveAndRender('Widgetgröße geändert.');return
 }
 if(action==='favorite-module-add'){
  const current=char(),page=$('[data-dashboard-favorite-module]')?.value;if(!current||!TITLES[page]||!toolVisible(page))return;
  const favorites=new Set(current.favoriteModules||[]);favorites.add(page);current.favoriteModules=[...favorites];saveAndRender('Modul favorisiert.');return
 }
 if(action==='favorite-module-remove'){
  const current=char();if(current){current.favoriteModules=(current.favoriteModules||[]).filter(page=>page!==value);saveAndRender('Modul-Favorit entfernt.')}return
 }
 if(action==='favorite-record-toggle'){
  const current=char();if(current){const favorites=new Set(current.favoriteRecords||[]);if(favorites.has(value))favorites.delete(value);else favorites.add(value);current.favoriteRecords=[...favorites];saveAndRender('Akte-Favorit aktualisiert.')}return
 }
 if(action==='quick-link-delete'){
  const current=char();if(current){current.quickLinks=(current.quickLinks||[]).filter(link=>link.id!==value);saveAndRender('Eigener Schnellzugriff entfernt.')}return
 }
 if(action==='widget-add'){
  const current=char(),select=$('#dashboard-widget-select'),widget=select?.value;if(!current||!widget)return;
  const widgets=[...(current.dashboardWidgets||['cases','deadlines','tasks','activity','quick','finances','leases','inventory','note'])];if(!widgets.includes(widget))widgets.push(widget);current.dashboardWidgets=widgets;saveAndRender('Widget hinzugefügt.');return
 }
 if(action==='widget-reset'){const current=char();if(current){delete current.dashboardWidgets;saveAndRender('Standardlayout wiederhergestellt.')}return}
 if(action==='edit-inventory'||action==='edit-finance'){const collection=action==='edit-inventory'?'inventory':'finances';if(!collectionItem(collection,itemId))return;ui[collection==='inventory'?'editInventory':'editFinance']=itemId;render();return}
 if(action==='cancel-inventory-edit'||action==='cancel-finance-edit'){ui[action==='cancel-inventory-edit'?'editInventory':'editFinance']=null;render();return}
 if(action==='golf-stroke'||action==='golf-undo'){const round=collectionItem('minigolf',el.dataset.roundId),holeIndex=Number(el.dataset.holeIndex),player=round?.players.find(item=>item.id===el.dataset.playerId);if(!player||!Number.isInteger(holeIndex)||holeIndex<0||holeIndex>=round.holes.length)return;const currentScore=Number(player.scores[holeIndex])||0;if(action==='golf-stroke'){if(currentScore>=20){toast('Maximal 20 Schläge pro Bahn.',true);return}player.scores[holeIndex]=currentScore+1}else{if(currentScore<=0)return;player.scores[holeIndex]=currentScore===1?null:currentScore-1}persist();render();return}
 if(action==='delete-golf-round'){const round=collectionItem('minigolf',itemId);if(!round||!confirm(`Minigolf-Runde „${round.course}“ löschen?`))return;db.minigolf=db.minigolf.filter(item=>item.id!==itemId);ui.selection.minigolf=null;saveAndRender('Minigolf-Runde gelöscht.');return}
 if(action==='refresh-lease'){render();return}
 if(action.startsWith('go-')){setPage(action.slice(3));return}
 if(action==='export'){download(`rp-desk-backup-${today()}.json`,JSON.stringify(db,null,2),'application/json');toast('JSON-Backup erstellt.');return}
 if(action==='import'){$('#backup-import').click();return}
 if(action==='clear-data'){if(confirm('Wirklich ALLE RP-Desk-Daten aus diesem Browser löschen? Vorher am besten ein JSON-Backup exportieren.')&&confirm('Letzte Bestätigung: Sämtliche Einträge und Charaktere zurücksetzen?')){replaceData(defaultData());ui.charId=null;ui.selection={};clearLeisureState();saveAndRender('Lokaler Datenbestand zurückgesetzt.')}return}
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
 if(action==='switch-char'){ui.charId=itemId;ui.selection={};clearLeisureState();render();return}
 if(action==='delete-char'){const c=db.characters.find(c=>c.id===itemId);if(!c||!confirm(`${c.name} und ALLE zugehörigen Einträge endgültig löschen?`))return;db.characters=db.characters.filter(c=>c.id!==itemId);for(const k of [...REQUIRED_COLLECTIONS.filter(k=>k!=='characters'),...OPTIONAL_COLLECTIONS])db[k]=db[k].filter(x=>x.charId!==itemId);const removed=new Set(db.entities.filter(x=>x.charId===itemId).map(x=>x.id));db.entities=db.entities.filter(x=>!removed.has(x.id));db.relationships=db.relationships.filter(x=>!removed.has(x.sourceId)&&!removed.has(x.targetId));ui.charId=db.characters[0]?.id||null;ui.selection={};clearLeisureState();saveAndRender('Charakter gelöscht.');return}
 if(action==='evidence-prefill'){
  const first=$('#evidence-case-1'),second=$('#evidence-case-2');
  if(first&&second){first.value=el.dataset.caseA;second.value=el.dataset.caseB;first.focus()}
  return
 }
 if(action==='delete-evidence'){
  const item=collectionItem('evidence',itemId);
  if(!item||!confirm(`Evidence „${item.caseId}“ und zugehörige Vergleiche löschen?`))return;
  db.evidence=db.evidence.filter(entry=>entry.id!==itemId);
  db.evidenceReports=db.evidenceReports.filter(report=>report.charId!==char()?.id||(report.caseId1!==item.caseId&&report.caseId2!==item.caseId));
  saveAndRender('Evidence und zugehörige Vergleiche gelöscht.');
  return
 }
 if(action==='delete-evidence-report'){
  const report=collectionItem('evidenceReports',itemId);
  if(!report||!confirm('Vergleichsbericht wirklich löschen?'))return;
  db.evidenceReports=db.evidenceReports.filter(entry=>entry.id!==itemId);
  saveAndRender('Vergleichsbericht gelöscht.');
  return
 }
 if(action==='apply-theme-preset'){
  const c = char();
  if(!c) return;
  const preset = THEME_PRESETS.find(p=>p.id===itemId);
  if(preset){
   c.color = preset.accent;
   c.bgColor = preset.bg;
   c.sidebarColor = preset.sidebar;
   c.cardColor = preset.card;
   c.borderColor = preset.border;
   applyTheme(c);
   saveAndRender(`Farbschema „${preset.name}“ angewendet.`);
  }
  return;
 }
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
 const toCollection={'delete-interview':'interviews','delete-lease':'leases','delete-note':'notes','delete-snippet':'snippets','delete-timeline':'timeline','delete-task':'tasks','delete-inventory':'inventory','delete-finance':'finances'};
 if(toCollection[action]){removeItem(toCollection[action],itemId||sel(toCollection[action])?.id);return}
}
// Einheitliche Interaktionen und Autosave – keine Backend-Requests.
document.addEventListener('click',e=>{
 if(window.RPDeskPages.map?.handleClick(e))return;
 const boardImage=e.target.closest?.('#board-svg image');if(boardImage){const node=sel('boards')?.nodes.find(item=>item.id===boardImage.closest('[data-node-id]')?.dataset.nodeId);if(node?.image)openImageViewer(node.image,node.label);return}
 const result=e.target.closest?.('[data-open-entity]');if(result){$('#global-search-dialog')?.close?.();openEntity(result.dataset.openEntity);return}
 const entitySelect=e.target.closest?.('[data-select-entity]');if(entitySelect){ui.selection[entitySelect.dataset.selectEntity]=entitySelect.dataset.id;render();return}
 const cluster=e.target.closest?.('[data-map-cluster]');if(cluster){const [x,y]=cluster.dataset.mapCluster.split(',').map(Number),surface=$('[data-map-surface]');ui.mapZoom=Math.min(3,(ui.mapZoom||1)+0.6);if(surface){ui.mapPanX=(50-x)*surface.clientWidth*ui.mapZoom/100;ui.mapPanY=(50-y)*surface.clientHeight*ui.mapZoom/100}const current=char();if(current)current.mapView={zoom:ui.mapZoom,panX:ui.mapPanX,panY:ui.mapPanY};persist();render();return}
 const marker=e.target.closest?.('[data-map-marker]');if(marker){ui.selection.location=marker.dataset.mapMarker;ui.mapCenterId=marker.dataset.mapMarker;render();return}
 const map=e.target.closest?.('[data-map-surface]');if(map&&ui.mapAddMode){
  const rect=map.getBoundingClientRect();ui.pendingMapPosition={x:Math.round(Math.max(0,Math.min(100,(e.clientX-rect.left)/rect.width*100))*10)/10,y:Math.round(Math.max(0,Math.min(100,(e.clientY-rect.top)/rect.height*100))*10)/10};
  const x=$('[data-form="location-save"] [name="x"]'),y=$('[data-form="location-save"] [name="y"]');if(x)x.value=ui.pendingMapPosition.x;if(y)y.value=ui.pendingMapPosition.y;ui.mapAddMode=false;map.classList.remove('map-add-mode');$('[data-form="location-save"] [name="name"]')?.focus();return
 }
 const nav=e.target.closest?.('[data-nav]');if(nav){setPage(nav.dataset.nav);return}
 const select=e.target.closest?.('[data-select]');if(select){ui.selection[select.dataset.select]=select.dataset.id;render();return}
 const a=e.target.closest?.('[data-action]');if(a){handleAction(a);return}
 if(e.target.id==='global-search-dialog')e.target.close();
});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();handleForm(f)});
document.addEventListener('keydown',e=>{
 if(window.RPDeskPages.map?.handleKeydown(e))return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openGlobalSearch();return}
 const dialog=$('#global-search-dialog');if(!dialog?.open)return;
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){
  const list=$$('#global-search-results [data-open-entity]');if(!list.length)return;e.preventDefault();
  ui.searchActiveIndex=(ui.searchActiveIndex+(e.key==='ArrowDown'?1:-1)+list.length)%list.length;
  list.forEach((item,index)=>{item.classList.toggle('active',index===ui.searchActiveIndex);item.setAttribute('aria-selected',String(index===ui.searchActiveIndex))});
 }else if(e.key==='Enter'){
  const item=$$('#global-search-results [data-open-entity]')[ui.searchActiveIndex||0];if(item){e.preventDefault();openEntity(item.dataset.openEntity);dialog.close()}
 }
});
function $$(selector){return Array.from(document.querySelectorAll(selector))}
function updateLinkTarget(sourceId){
 const form=$(`[data-form="relationship-create"][data-source-id="${sourceId}"]`),select=$('[data-link-target]',form),filter=$(`[data-link-filter="${sourceId}"]`)?.value||'',query=$(`[data-link-search="${sourceId}"]`)?.value||'';
 const source=window.RPDesk.entity(sourceId),scope=source?.charId||char()?.id;
 const allowed=query?new Set(window.RPDesk.searchEntities(query,{type:filter,characterId:scope}).map(item=>item.id)):null;
 const matches=(query?db.entities.filter(item=>allowed.has(item.id)):db.entities.filter(item=>(!filter||item.type===filter)&&window.RPDesk.visibleEntity(item,scope))).filter(item=>item.id!==sourceId&&(!source?.charId||!item.charId||source.charId===item.charId));
 for(const row of $(`[data-link-list="${sourceId}"]`)?.querySelectorAll('[data-link-row]')||[])row.hidden=Boolean((filter&&row.dataset.recordType!==filter)||(allowed&&!allowed.has(row.dataset.recordId)));
 if(!select)return;
 select.innerHTML=`<option value="">Auswählen …</option>${matches.map(item=>`<option value="${esc(item.id)}">${esc(item.type)} · ${esc(window.RPDesk.entityLabel(item))}</option>`).join('')}`;
}
function autosave(t){
 if(t.matches('[data-golf-par]')){const round=collectionItem('minigolf',t.dataset.roundId),holeIndex=Number(t.dataset.holeIndex),value=Number(t.value);if(!round||!Number.isInteger(holeIndex)||!round.holes[holeIndex]||!Number.isFinite(value)||value<1||value>5)return;round.holes[holeIndex].par=value;persist();return}
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
  if(['color','bgColor','sidebarColor','cardColor','borderColor'].includes(key)){
   applyTheme(c);
  }
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
 if(window.RPDeskPages.map?.handleInput(e))return;
 if(t.matches('.color-native-input')){
  const wrap = t.closest('.color-input-wrap');
  if(wrap){
   const chip = wrap.querySelector('.color-preview-chip');
   const text = wrap.querySelector('.color-hex-text');
   if(chip) chip.style.background = t.value;
   if(text) text.textContent = t.value.toUpperCase();
  }
 }
 if(t.matches('[data-search]')){let key=t.dataset.search;ui.search[key]=t.value;const pos=t.selectionStart;render();const current=$(`[data-search="${key}"]`);if(current){current.focus();try{current.setSelectionRange(pos,pos)}catch(_){}}return}
 if(t.matches('[data-global-search]')){ui.searchActiveIndex=0;renderGlobalSearch();return}
 if(t.matches('[data-link-search]')){updateLinkTarget(t.dataset.linkSearch);return}
 if(t.matches('[data-map-search]')){ui.mapSearch=t.value;const pos=t.selectionStart;render();const current=$('[data-map-search]');if(current){current.focus();current.setSelectionRange(pos,pos)}return}
 if(t.matches('[data-map-zoom]')){ui.mapZoom=Number(t.value);const content=$('.map-content');if(content)content.style.transform=`translate(${ui.mapPanX||0}px,${ui.mapPanY||0}px) scale(${ui.mapZoom})`;const current=char();if(current){current.mapView={...(current.mapView||{}),zoom:ui.mapZoom};persist()}return}
 if(t.matches('[data-dashboard-note]')){const current=char();if(current){current.dashboardNote=t.value;persist()}return}
 if(t.matches('[data-directory-search]')){ui.directorySearch=t.value;const pos=t.selectionStart;render();const current=$('[data-directory-search]');if(current){current.focus();current.setSelectionRange(pos,pos)}return}
 if(t.matches('[data-variable]')){ui.variables[t.dataset.variable]=t.value;return}
 autosave(t);
});
document.addEventListener('change',async e=>{const t=e.target;
 if(window.RPDeskPages.map?.handleChange(e))return;
 if(t.matches('[data-tool-visibility]')){
  const c=char(),page=t.dataset.toolVisibility;
  if(!c||!CATEGORIES.slice(1).some(group=>group.items.some(([id])=>id===page)))return;
  const hidden=new Set(c.hiddenTools||[]);if(t.checked)hidden.delete(page);else hidden.add(page);
  c.hiddenTools=[...hidden];saveAndRender();return;
 }
 if(t.matches('[data-search-type]')||t.matches('[data-search-character]')){renderGlobalSearch();return}
 if(t.matches('[data-link-filter]')){updateLinkTarget(t.dataset.linkFilter);return}
 if(t.matches('[data-deadline-filter]')){ui.deadlineFilter=t.value;render();return}
 if(t.matches('[data-map-category]')){ui.mapCategory=t.value;render();return}
 if(t.matches('[data-map-group]')){ui.mapGroupId=t.value;render();return}
 if(t.matches('[data-map-date-from]')){ui.mapDateFrom=t.value;render();return}
 if(t.matches('[data-map-date-to]')){ui.mapDateTo=t.value;render();return}
 if(t.matches('[data-directory-filter]')){ui.directoryFilter=t.value;render();return}
 if(t.matches('[data-golf-par]')){render();return}
 if(t.id==='character-select'){ui.charId=t.value;ui.selection={};clearLeisureState();render();return}
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
 if(t.matches('[data-task-check]')){const v=collectionItem('tasks',t.dataset.taskCheck);if(v){v.done=t.checked;recordTaskChange(v,v.done);saveAndRender(v.done?'Aufgabe erledigt.':'Aufgabe wieder geöffnet.')}return}
 if(t.matches('[data-case-task-check]')){const v=collectionItem('tasks',t.dataset.caseTaskCheck);if(v){v.done=t.checked;recordTaskChange(v,v.done);saveAndRender(v.done?'Maßnahme erledigt.':'Maßnahme wieder geöffnet.')}return}
 autosave(t);
});
$('#backup-import').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!validImport(parsed))throw Error('Unbekanntes Format oder inkompatible Version');showBackupPreview(parsed)}catch(err){toast('Backup nicht geladen: '+err.message,true)}finally{e.target.value=''}});
$('#mobile-menu').addEventListener('click',()=>{$('#sidebar').classList.add('open');$('#sidebar-backdrop').classList.add('show')});
$('#sidebar-backdrop').addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#sidebar-backdrop').classList.remove('show')});
// Grafikknoten und freies Panning (verschieben der Arbeitsfläche)
let drag=null;
let mapDrag=null;
let panDrag=null;
function graphPoint(svg,event){const pt=svg.createSVGPoint();pt.x=event.clientX;pt.y=event.clientY;const inverse=svg.getScreenCTM()?.inverse();return inverse?pt.matrixTransform(inverse):{x:0,y:0}}
document.addEventListener('pointerdown',e=>{
 if(window.RPDeskPages.map?.handlePointerDown(e))return;
 const map=e.target.closest?.('[data-map-surface]'),marker=e.target.closest?.('[data-map-marker]');
 if(map&&!marker&&!ui.mapAddMode){mapDrag={pointerId:e.pointerId,x:e.clientX,y:e.clientY,panX:ui.mapPanX||0,panY:ui.mapPanY||0};map.setPointerCapture?.(e.pointerId);e.preventDefault();return}
 const svg=$('#board-svg');
 if(!svg)return;
 const g=e.target.closest?.('#board-svg [data-node-id]');
 const b=sel('boards');
 if(g && b){
  const n=b.nodes.find(n=>n.id===g.dataset.nodeId);
  if(!n)return;
  if(e.target.closest?.('#board-svg image'))return;
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
 if(window.RPDeskPages.map?.handlePointerMove(e))return;
 if(mapDrag&&e.pointerId===mapDrag.pointerId){ui.mapPanX=mapDrag.panX+e.clientX-mapDrag.x;ui.mapPanY=mapDrag.panY+e.clientY-mapDrag.y;const content=$('.map-content');if(content)content.style.transform=`translate(${ui.mapPanX}px,${ui.mapPanY}px) scale(${ui.mapZoom||1})`;return}
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
 n.x=Math.max(0,Math.min(bw-(n.image?240:190),Math.round(p.x-drag.startX)));
 n.y=Math.max(0,Math.min(bh-(n.image?200:65),Math.round(p.y-drag.startY)));
 const node=Array.from(svg.querySelectorAll('[data-node-id]')).find(g=>g.dataset.nodeId===n.id);
 if(node)node.setAttribute('transform',`translate(${n.x},${n.y})`);
 for(const edge of b.edges){
  if(edge.from!==n.id&&edge.to!==n.id)continue;
  const a=b.nodes.find(x=>x.id===edge.from),z=b.nodes.find(x=>x.id===edge.to);
  const group=Array.from(svg.querySelectorAll('[data-edge-id]')).find(g=>g.dataset.edgeId===edge.id);
  if(!group||!a||!z)continue;
  const line=group.querySelector('line'),text=group.querySelector('text');
  const ax=a.x+(a.image?115:90), ay=a.y+(a.image?95:27), zx=z.x+(z.image?115:90), zy=z.y+(z.image?95:27);
  line.setAttribute('x1',ax);line.setAttribute('y1',ay);line.setAttribute('x2',zx);line.setAttribute('y2',zy);
  text.setAttribute('x',(ax+zx)/2);text.setAttribute('y',(ay+zy)/2-8);
 }
});
function finishDrag(e){
 if(window.RPDeskPages.map?.handlePointerUp(e))return;
 if(mapDrag&&e.pointerId===mapDrag.pointerId){mapDrag=null;const current=char();if(current)current.mapView={...(current.mapView||{}),zoom:ui.mapZoom||1,panX:ui.mapPanX||0,panY:ui.mapPanY||0};persist();return}
 if(panDrag && e.pointerId===panDrag.pointerId){panDrag=null;persist();return}
 if(!drag||e.pointerId!==drag.pointerId)return;
 drag=null;
 persist();
 render();
}
document.addEventListener('pointerup',finishDrag);document.addEventListener('pointercancel',finishDrag);
document.addEventListener('wheel',e=>{
 if(window.RPDeskPages.map?.handleWheel(e))return;
 const viewer=e.target.closest?.('#image-viewer-stage');
 if(viewer){e.preventDefault();changeImageZoom(e.deltaY<0?0.2:-0.2);return}
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
document.addEventListener('dblclick',e=>window.RPDeskPages.map?.handleDoubleClick(e));
const imageViewer=$('#image-viewer');
$('#image-viewer-close').addEventListener('click',()=>imageViewer.close());
$('#image-viewer-zoom-in').addEventListener('click',()=>changeImageZoom(0.25));
$('#image-viewer-zoom-out').addEventListener('click',()=>changeImageZoom(-0.25));
$('#image-viewer-zoom-reset').addEventListener('click',()=>{ui.viewerZoom=1;ui.viewerX=0;ui.viewerY=0;updateImageViewer()});
imageViewer.addEventListener('click',e=>{if(e.target===imageViewer)imageViewer.close()});
const viewerPointers=new Map();
let viewerPinchStart=0,viewerZoomStart=1,viewerPanStart=null;
$('#image-viewer-stage').addEventListener('pointerdown',e=>{
 viewerPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 e.currentTarget.setPointerCapture(e.pointerId);
 if(viewerPointers.size===2){const points=[...viewerPointers.values()];viewerPinchStart=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);viewerZoomStart=ui.viewerZoom||1;viewerPanStart=null}
 else if((ui.viewerZoom||1)>1){viewerPanStart={x:e.clientX-(ui.viewerX||0),y:e.clientY-(ui.viewerY||0)}}
});
$('#image-viewer-stage').addEventListener('pointermove',e=>{
 if(!viewerPointers.has(e.pointerId))return;
 viewerPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(viewerPointers.size===2&&viewerPinchStart){const points=[...viewerPointers.values()],distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);ui.viewerZoom=Math.max(1,Math.min(5,viewerZoomStart*distance/viewerPinchStart));updateImageViewer();e.preventDefault()}
 else if(viewerPanStart&&(ui.viewerZoom||1)>1){ui.viewerX=e.clientX-viewerPanStart.x;ui.viewerY=e.clientY-viewerPanStart.y;updateImageViewer();e.preventDefault()}
});
for(const eventName of ['pointerup','pointercancel'])$('#image-viewer-stage').addEventListener(eventName,e=>{viewerPointers.delete(e.pointerId);if(viewerPointers.size<2)viewerPinchStart=0;if(!viewerPointers.size)viewerPanStart=null});
persist();render();
if(navigator.serviceWorker&&location.protocol!=='file:'&&window.isSecureContext!==false){
 navigator.serviceWorker.register('./sw.js').then(registration=>{
  registration.addEventListener('updatefound',()=>{
   const worker=registration.installing;if(!worker)return;
   worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)$('#app-update-notice').hidden=false});
  });
 }).catch(error=>console.warn('Offline-Service-Worker konnte nicht registriert werden',error));
}

})();
