const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function app(initialData) {
 const listeners = {};
 const elements = {};
 const storage = {};
 const downloads=[];
 if(initialData)storage['rp-desk-data-v1']=typeof initialData==='string'?initialData:JSON.stringify(initialData);
 function element(selector) {
  if(!elements[selector])elements[selector]={
   innerHTML:'',textContent:'',value:'',dataset:{},style:{setProperty(){}},
   classList:{add(){},remove(){}},addEventListener(type,fn){this[type]=fn},
   append(){},remove(){},click(){},querySelector(selector){return element(selector)},setAttribute(){},focus(){},showModal(){this.open=true},close(){this.open=false}
  };
  return elements[selector];
 }
 const document = {
  querySelector:element,querySelectorAll(selector){if(selector==='#global-search-results [data-open-entity]')return [...(element('#global-search-results').innerHTML.matchAll(/data-open-entity="([^"]+)"/g))].map((match)=>({dataset:{openEntity:match[1]},classList:{toggle(){}},setAttribute(){}}));return []},
  createElement(){return element('created')},
  addEventListener(type,fn){listeners[type]=fn},
  documentElement:element('root'),body:{appendChild(){}}
 };
 const window = {scrollTo(){}};
 const context = vm.createContext({
  window,document,localStorage:{getItem:key=>storage[key]||null,setItem:(key,value)=>{storage[key]=value}},
  FormData:class {constructor(form){this.values=form.values} get(key){return this.values[key]??null} has(key){return Object.prototype.hasOwnProperty.call(this.values,key)}},
  confirm:()=>true,console:{warn(){}},setTimeout(){},navigator:{},location:{protocol:'file:'},Intl,Date,Math,JSON,Number,String,Set,Map,Blob:globalThis.Blob,
  URL:{createObjectURL(blob){downloads.push(blob);return`blob:test-${downloads.length}`},revokeObjectURL(){}}
 });
 for(const file of ['js/core.js','js/pages/dashboard.js','js/pages/changelog.js','js/pages/investigations.js','js/pages/workspace.js','js/pages/leisure.js','js/pages/records.js','js/pages/map-engine.js','js/pages/map.js','app.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
 }
 function submit(kind,values,id,attrs={}) {
  const form={dataset:{form:kind,...(id?{id}:{}),...attrs},values,closest:()=>form};
  listeners.submit({target:form,preventDefault(){}});
 }
 function click(selector,dataset) {
  const target={dataset,closest(query){return query===selector?this:null}};
  listeners.click({target});
 }
 function change(id,value) {
  listeners.change({target:{id,value,matches:()=>false}});
 }
 function visibility(page,checked) {
  listeners.change({target:{dataset:{toolVisibility:page},checked,matches:query=>query==='[data-tool-visibility]'}});
 }
 function input(selector,value){
  const target=element(selector);target.value=value;target.matches=query=>query===selector;target.selectionStart=String(value).length;
  listeners.input({target});
 }
 function keydown(event){listeners.keydown({...event,preventDefault:event.preventDefault||function(){}})}
 return {rp:window.RPDesk,pages:window.RPDeskPages,submit,click,change,visibility,input,keydown,elements,storage,downloads};
}

test('Changelog ist ohne Charakter erreichbar und zeigt die aktuelle Version',()=>{
 const a=app();
 assert.match(a.elements['#navigation'].innerHTML,/data-nav="changelog"/);
 assert.equal(a.elements['#app-version'].textContent,'v2.1');
 a.click('[data-nav]',{nav:'changelog'});
 assert.match(a.elements['#content'].innerHTML,/Version 2\.1/);
 assert.match(a.elements['#content'].innerHTML,/Version 2\.0/);
 assert.match(a.elements['#content'].innerHTML,/Changelog-Reiter sowie ein Release-Befehl/);
 assert.match(a.elements['#content'].innerHTML,/Version 1\.1/);
});

test('Lager, Rechner und Finanzen sind bearbeitbar und nach Charakter getrennt',()=>{
 const a=app();
 a.submit('character-create',{name:'Racer',color:'#8aa6ff'});
 const first=a.rp.char().id;
 a.submit('inventory-save',{name:'Turbolader',quantity:'3',price:'12.35'});
 const item=a.rp.db.inventory[0];
 a.submit('cost-calculate',{quantity:'3',price:'12.35'});
 assert.equal(a.rp.ui.costCalculation.total,37.05);
 a.click('[data-nav]',{nav:'inventory'});
 assert.match(a.elements['#content'].innerHTML,/37,05 \$/);
 a.submit('inventory-save',{name:'Turbo',quantity:'2',price:'15.50'},item.id);
 assert.equal(item.quantity,2);
 assert.match(a.elements['#content'].innerHTML,/31 \$/);
 a.submit('finance-save',{description:'Rennen',type:'income',amount:'100.10',date:'2026-11-12'});
 a.submit('finance-save',{description:'Tuning',type:'expense',amount:'25.05',date:'2026-11-12'});
 const expense=a.rp.db.finances[1];
 a.click('[data-nav]',{nav:'finances'});
 assert.match(a.elements['#content'].innerHTML,/75,05 \$/);
 a.submit('finance-save',{description:'Tuning',type:'expense',amount:'30.10',date:'2026-11-12'},expense.id);
 assert.match(a.elements['#content'].innerHTML,/70 \$/);
 a.submit('inventory-save',{name:'Fehler',quantity:'-1',price:'1'});
 assert.equal(a.rp.db.inventory.length,1);
 a.submit('character-create',{name:'Officer',color:'#8aa6ff'});
 assert.equal(a.rp.scoped('inventory').length,0);
 assert.equal(a.rp.scoped('finances').length,0);
 assert.equal(a.rp.ui.costCalculation,null);
 a.change('character-select',first);
 assert.equal(a.rp.scoped('inventory').length,1);
 a.click('[data-action]',{action:'delete-inventory',id:item.id});
 assert.equal(a.rp.db.inventory.length,0);
 a.click('[data-action]',{action:'delete-finance',id:expense.id});
 assert.equal(a.rp.db.finances.length,1);
});

test('Sichtbarkeit gilt pro Charakter, einschließlich Dashboard und Wechsel der aktiven Seite',()=>{
 const a=app();
 a.submit('character-create',{name:'A'});
 const first=a.rp.char().id;
 a.click('[data-nav]',{nav:'settings'});
 a.visibility('board',false);
 a.visibility('tasks',false);
 assert.doesNotMatch(a.elements['#navigation'].innerHTML,/data-nav="board"/);
 a.click('[data-nav]',{nav:'dashboard'});
 assert.doesNotMatch(a.elements['#content'].innerHTML,/data-nav="board"|go-tasks|OFFENE AUFGABEN/);
 a.submit('character-create',{name:'B'});
 assert.match(a.elements['#navigation'].innerHTML,/data-nav="board"/);
 a.click('[data-nav]',{nav:'board'});
 a.change('character-select',first);
 assert.equal(a.rp.ui.page,'dashboard');
 a.click('[data-nav]',{nav:'settings'});
 a.visibility('board',true);
 assert.match(a.elements['#navigation'].innerHTML,/data-nav="board"/);
 assert.equal(JSON.parse(a.storage['rp-desk-data-v1']).characters[0].hiddenTools.includes('board'),false);
});

test('Ältere Backups bleiben lesbar und neue Daten überstehen einen Neustart',()=>{
 const a=app();
 a.submit('character-create',{name:'A'});
 a.submit('inventory-save',{name:'Reifen',quantity:'4',price:'10'});
 a.submit('finance-save',{description:'Kauf',type:'expense',amount:'40',date:'2026-11-12'});
 a.visibility('evidence',false);
 const saved=JSON.parse(a.storage['rp-desk-data-v1']);
 const reloaded=app(saved);
 assert.equal(reloaded.rp.db.inventory[0].name,'Reifen');
 assert.equal(reloaded.rp.db.finances[0].amount,40);
 assert.equal(reloaded.rp.toolVisible('evidence'),false);
 delete saved.inventory;
 delete saved.finances;
 delete saved.characters[0].hiddenTools;
 assert.ok(reloaded.rp.validImport(saved));
 const legacy=app(saved);
 assert.equal(legacy.rp.db.inventory.length,0);
 assert.equal(legacy.rp.db.finances.length,0);
 assert.equal(legacy.rp.toolVisible('evidence'),true);
 saved.inventory=[{id:'bad'}];
 assert.equal(Boolean(reloaded.rp.validImport(saved)),false);
});

test('Schema-Migration ergänzt die Architekturversion idempotent und erhält alte Sammlungen',()=>{
 const legacy={
  version:1,
  characters:[{id:'char-1',name:'A'}],
  boards:[],interviews:[],leases:[],notes:[{id:'note-1',charId:'char-1',title:'Alt',body:'Notiz'}],
  timeline:[],tasks:[],snippets:[],minigolf:[]
 };
 const migrated=app(legacy);
 assert.equal(migrated.rp.db.schemaVersion,4);
 assert.equal(migrated.rp.db.entities.length,1);
 assert.equal(migrated.rp.db.entities[0].fields.legacyId,'note-1');
 assert.equal(migrated.rp.db.entities[0].fields.body,undefined);
 assert.equal(migrated.rp.entityLabel(migrated.rp.db.entities[0]),'Alt');
 assert.deepEqual(JSON.parse(JSON.stringify(migrated.rp.db.relationships)),[]);
 assert.equal(migrated.rp.db.notes[0].body,'Notiz');
 const stored=JSON.parse(migrated.storage['rp-desk-data-v1']);
 assert.equal(stored.schemaVersion,4);

 const reloaded=app(stored);
 assert.equal(reloaded.rp.db.schemaVersion,4);
 assert.equal(reloaded.rp.db.notes[0].id,'note-1');
 assert.equal(reloaded.rp.db.notes.length,1);
});

test('Ungültige oder unbekannte gespeicherte Daten werden beim Start nicht überschrieben',()=>{
 const raw=JSON.stringify({version:99,characters:[{id:'char-1',name:'A'}]});
 const a=app(raw);
 assert.equal(a.storage['rp-desk-data-v1'],raw);
 assert.equal(a.rp.persist(),false);
 assert.equal(a.storage['rp-desk-data-v1'],raw);

 a.rp.replaceData(a.rp.defaultData());
 assert.equal(a.rp.persist(),true);
 assert.equal(JSON.parse(a.storage['rp-desk-data-v1']).schemaVersion,4);
});

test('Zentrale Entitäten und Beziehungen werden im Backup strukturell validiert',()=>{
 const a=app();
 const backup=a.rp.defaultData();
 backup.entities=[{id:'entity-1',type:'person',charId:null,createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z',fields:{name:'A'}}];
 backup.relationships=[{id:'link-1',sourceId:'entity-1',targetId:'entity-1',type:'related',createdAt:'2026-01-01T00:00:00.000Z'}];
 assert.equal(a.rp.validImport(backup),true);
 backup.relationships[0].targetId='missing-entity';
 assert.equal(a.rp.validImport(backup),false);
 backup.relationships[0].targetId='entity-1';
 backup.entities[0].type='unknown';
 assert.equal(a.rp.validImport(backup),false);
});

test('Backup-Import ersetzt den Datenstand und Charakterlöschung entfernt nur eigene Einträge',async()=>{
 const a=app();
 a.submit('character-create',{name:'A'});
 const first=a.rp.char().id;
 a.submit('inventory-save',{name:'Reifen',quantity:'4',price:'10'});
 a.submit('finance-save',{description:'Kauf',type:'expense',amount:'40',date:'2026-11-12'});
 const backup=a.storage['rp-desk-data-v1'];
 a.submit('character-create',{name:'B'});
 const second=a.rp.char().id;
 a.submit('inventory-save',{name:'Motor',quantity:'1',price:'100'});
 a.submit('finance-save',{description:'Rennen',type:'income',amount:'200',date:'2026-11-12'});
 a.click('[data-action]',{action:'delete-char',id:first});
 assert.equal(a.rp.db.inventory.length,1);
 assert.equal(a.rp.db.inventory[0].charId,second);
 assert.equal(a.rp.db.finances.length,1);
 assert.equal(a.rp.db.finances[0].charId,second);
 const input=a.elements['#backup-import'];
 input.files=[{text:async()=>backup}];
 await input.change({target:input});
 a.click('[data-action]',{action:'confirm-import-replace'});
 assert.equal(a.rp.char().id,first);
 assert.equal(a.rp.db.inventory[0].name,'Reifen');
 assert.equal(a.rp.db.finances[0].description,'Kauf');
 assert.equal(JSON.parse(a.storage['rp-desk-data-v1']).characters.length,1);
});

test('Dashboard zeigt bestehende Leasingverträge weiterhin an',()=>{
 const a=app();
 a.submit('character-create',{name:'A'});
 a.submit('lease-create',{vehicle:'Auto',total:'100',weeklyRate:'10',startDate:'2026-11-12'});
 assert.match(a.elements['#content'].innerHTML,/Leasingübersicht/);
 assert.match(a.elements['#content'].innerHTML,/Auto/);
 assert.match(a.elements['#content'].innerHTML,/Restbetrag 100 \$/);
});

test('Akten, Maßnahmen, zentrale Verknüpfungen, Alias-/Kennzeichensuche und Fristen funktionieren',()=>{
 const a=app();
 a.submit('character-create',{name:'Detective'});
 const charId=a.rp.char().id;
 a.submit('record-create',{type:'vehicle',name:'Buffalo',aliases:'Betsy, B-Unit',plate:'LS-123-AB',description:'Blau'},undefined);
 const car=a.rp.db.entities.find(item=>item.type==='vehicle');
 a.submit('case-create',{caseNumber:'2026-42',title:'Hafenüberfall',description:'Überfall am Hafen',occurredAt:'2026-11-12',investigator:'Detective',status:'Offen',priority:'Hoch',location:'Hafen'});
 const caseRecord=a.rp.db.entities.find(item=>item.type==='case');
 assert.equal(caseRecord.charId,charId);
 a.submit('relationship-create',{targetId:car.id,type:'Fahrzeug',description:'Sichtungsfahrzeug'},undefined,{sourceId:caseRecord.id});
 assert.equal(a.rp.relatedEntities(caseRecord.id)[0].entity.id,car.id);
 assert.equal(a.rp.relatedEntities(car.id)[0].entity.id,caseRecord.id);
 assert.equal(a.rp.searchEntities('123ab')[0].id,car.id);
 assert.equal(a.rp.searchEntities('Betsy')[0].id,car.id);
 a.submit('case-task',{title:'Fahrzeughalter überprüfen',details:'Halterdaten anfordern',due:'2026-11-13',priority:'Hoch'},undefined,{caseId:caseRecord.id});
 assert.equal(a.rp.db.tasks.length,1);
 assert.equal(a.rp.relatedEntities(caseRecord.id).some(link=>link.entity.type==='task'),true);
 a.submit('deadline-create',{title:'Beschluss läuft ab',dueAt:'2000-01-01T10:00',deadlineType:'Beschluss',priority:'Kritisch',reminderHours:'6'},undefined);
 const deadline=a.rp.db.entities.find(item=>item.type==='deadline');
 assert.equal(a.pages.records.deadlineState(deadline),'Überfällig');
 assert.deepEqual(JSON.parse(JSON.stringify(deadline.fields.reminderHours)),[6]);
 assert.equal(a.rp.validImport(JSON.parse(a.storage['rp-desk-data-v1'])),true);
});

test('RP-Karte speichert normalisierte Marker und die globale Suche öffnet Datensätze per Tastatur',()=>{
 const a=app();
 a.submit('character-create',{name:'Mapper'});
 a.submit('record-create',{type:'person',name:'Avery North',aliases:'Schatten'});
 const person=a.rp.db.entities.find(item=>item.type==='person');
 a.submit('location-save',{name:'Pier 400',category:'Tatort',x:'23.5',y:'71.2',description:'Lagerhalle'});
 const marker=a.rp.db.entities.find(item=>item.type==='location');
 assert.equal(marker.fields.x,23.5);
 assert.equal(marker.fields.y,71.2);
 a.click('[data-nav]',{nav:'map'});
 assert.match(a.elements['#content'].innerHTML,/data-map-marker=/);
 assert.equal(a.rp.searchEntities('Schatten')[0].id,person.id);
 a.keydown({key:'k',ctrlKey:true});
 assert.equal(a.elements['#global-search-dialog'].open,true);
 a.input('[data-global-search]','Schatten');
 assert.equal(a.elements['[data-global-search]'].value,'Schatten');
 assert.match(a.elements['#global-search-results'].innerHTML,/Avery North/);
 a.keydown({key:'Enter'});
 assert.equal(a.rp.ui.page,'directory');
 assert.equal(a.rp.ui.selection.directory,person.id);
});

test('Kartenkategorien speichern eigene Farben und Symbole; Marker-Backups importieren ohne Teiländerungen',async()=>{
 const a=app();
 a.submit('character-create',{name:'Mapper'});
 a.submit('map-settings',{
  markerSize:'32',labels:'on',markerScale:'on',showCoordinates:'on',animations:'on',boundaries:'on',cluster:'on',
  areaOpacity:'0.3',routeWidth:'5',zoomSpeed:'0.2',minZoom:'1',maxZoom:'8',background:'#101722',
  categoryColor0:'#123456',categoryIcon0:'▲'
 });
 assert.equal(a.rp.char().mapCategoryStyles.Tatort.color,'#123456');
 assert.equal(a.rp.char().mapCategoryStyles.Tatort.icon,'▲');
 a.submit('map-marker',{title:'Eigener Ort',category:'Tatort',x:'23',y:'71',customStyle:'on',color:'#abcdef',icon:'✦'});
 assert.equal(a.rp.db.entities.find(item=>item.type==='location').fields.customStyle,true);
 const incoming={
  format:'rp-desk-map',version:1,
  markers:[{id:'map-import',type:'location',charId:null,fields:{name:'Gemeinsamer Marker',coordinates:{system:'image',x:0.5,y:0.6}}}],
  relationships:[],areas:[],routes:[],categoryStyles:{Tatort:{color:'#654321',icon:'!'}}
 };
 await a.pages.map.readMapBackup({size:1,text:async()=>JSON.stringify(incoming)});
 assert.equal(a.rp.db.entities.find(item=>item.id==='map-import').charId,null);
 assert.equal(a.rp.char().mapCategoryStyles.Tatort.color,'#654321');
 const invalid={...incoming,markers:[{...incoming.markers[0],id:'must-not-import'}],relationships:[{id:'broken-link',sourceId:'must-not-import',targetId:'missing',type:'map'}]};
 const before=a.rp.db.entities.length;
 await a.pages.map.readMapBackup({size:1,text:async()=>JSON.stringify(invalid)});
 assert.equal(a.rp.db.entities.length,before);
 assert.equal(a.rp.db.entities.some(item=>item.id==='must-not-import'),false);
});

test('GTA-Koordinaten werden erst nach Nutzerkalibrierung berechnet',()=>{
 const a=app();
 a.submit('character-create',{name:'Mapper'});
 a.rp.ui.page='map';
 for(const point of [
  {imageX:0.1,imageY:0.2,gtaX:100,gtaY:500},
  {imageX:0.9,imageY:0.2,gtaX:900,gtaY:500},
  {imageX:0.1,imageY:0.8,gtaX:100,gtaY:-100}
 ]){
  a.rp.ui.mapPendingReference={x:point.imageX,y:point.imageY};
  a.submit('map-reference',{gtaX:String(point.gtaX),gtaY:String(point.gtaY)});
 }
 a.pages.map.handleAction({dataset:{mapAction:'calibration-fit'}});
 a.submit('map-marker',{title:'Kalibrierter Ort',category:'Tatort',coordinateSystem:'gta',x:'350',y:'100',z:'25'});
 const marker=a.rp.db.entities.find(item=>item.type==='location');
 assert.deepEqual(JSON.parse(JSON.stringify(marker.fields.coordinates)),{system:'gta',x:350,y:100,z:25});
 assert.equal(marker.fields.x,35);
 assert.ok(Math.abs(marker.fields.y-60)<1e-10);
});

test('Modul-Backup der Karte umfasst eigene und gemeinsame Marker, nicht fremde private Marker',async()=>{
 const a=app();
 a.submit('character-create',{name:'Eigener Charakter'});
 const ownId=a.rp.char().id;
 a.submit('character-create',{name:'Anderer Charakter'});
 const otherId=a.rp.db.characters.find(item=>item.name==='Anderer Charakter').id;
 a.rp.ui.charId=ownId;
 const own=a.rp.createEntity('location',ownId,{name:'Eigener Marker',coordinates:{system:'image',x:0.1,y:0.2}});
 const shared=a.rp.createEntity('location',null,{name:'Gemeinsamer Marker',coordinates:{system:'image',x:0.3,y:0.4}});
 a.rp.createEntity('location',otherId,{name:'Privater fremder Marker',coordinates:{system:'image',x:0.5,y:0.6}});
 a.rp.$('#backup-module-select').value='map';
 a.click('[data-action]',{action:'export-module'});
 const backup=JSON.parse(await a.downloads[0].text());
 assert.deepEqual(backup.entities.map(item=>item.id).sort(),[own.id,shared.id].sort());
});

test('Backup-Vorschau kann Daten zusammenführen, ohne vorhandene Charaktere oder Einträge zu verlieren',async()=>{
 const a=app();
 a.submit('character-create',{name:'Bestehend'});
 a.submit('note-create',{title:'Vorhanden'});
 const incoming=a.rp.defaultData();
 incoming.characters=[{id:'char-import',name:'Importiert'}];
 incoming.notes=[{id:'note-import',charId:'char-import',title:'Importnotiz',body:'Bleibt erhalten'}];
 const input=a.elements['#backup-import'];
 input.files=[{text:async()=>JSON.stringify(incoming)}];
 await input.change({target:input});
 a.click('[data-action]',{action:'confirm-import-merge'});
 assert.deepEqual(a.rp.db.characters.map(item=>item.name).sort(),['Bestehend','Importiert']);
 assert.deepEqual(a.rp.db.notes.map(item=>item.title).sort(),['Importnotiz','Vorhanden']);
 assert.equal(a.rp.validImport(JSON.parse(a.storage['rp-desk-data-v1'])),true);
});

test('Dashboard-Widgets, Favoriten und eigene Schnellzugriffe bleiben charakterbezogen',()=>{
 const a=app();
 a.submit('character-create',{name:'A'});
 const first=a.rp.char();
 a.click('[data-action]',{action:'widget-remove',value:'note'});
 assert.equal(first.dashboardWidgets.includes('note'),false);
 a.submit('quick-link-create',{label:'Akten',page:'cases'});
 assert.equal(first.quickLinks[0].page,'cases');
 a.submit('character-create',{name:'B'});
 assert.equal(a.rp.char().dashboardWidgets,undefined);
 assert.equal(a.rp.char().quickLinks,undefined);
 a.click('[data-action]',{action:'switch-char',id:first.id});
 assert.equal(a.rp.char().dashboardWidgets.includes('note'),false);
 assert.equal(a.rp.char().quickLinks[0].label,'Akten');
});
