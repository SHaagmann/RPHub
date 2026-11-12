const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function app(initialData) {
 const listeners = {};
 const elements = {};
 const storage = {};
 if(initialData)storage['rp-desk-data-v1']=typeof initialData==='string'?initialData:JSON.stringify(initialData);
 function element(selector) {
  if(!elements[selector])elements[selector]={
   innerHTML:'',textContent:'',value:'',dataset:{},style:{setProperty(){}},
   classList:{add(){},remove(){}},addEventListener(type,fn){this[type]=fn},
   append(){},remove(){},querySelector(){return null}
  };
  return elements[selector];
 }
 const document = {
  querySelector:element,querySelectorAll(){return []},
  createElement(){return element('created')},
  addEventListener(type,fn){listeners[type]=fn},
  documentElement:element('root'),body:{appendChild(){}}
 };
 const window = {scrollTo(){}};
 const context = vm.createContext({
  window,document,localStorage:{getItem:key=>storage[key]||null,setItem:(key,value)=>{storage[key]=value}},
  FormData:class {constructor(form){this.values=form.values} get(key){return this.values[key]??null}},
  confirm:()=>true,console:{warn(){}},setTimeout(){},navigator:{},location:{protocol:'file:'},Intl,Date,Math,JSON,Number,String,Set,Map
 });
 for(const file of ['js/core.js','js/pages/dashboard.js','js/pages/investigations.js','js/pages/workspace.js','js/pages/leisure.js','app.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
 }
 function submit(kind,values,id) {
  const form={dataset:{form:kind,...(id?{id}:{})},values,closest:()=>form};
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
 return {rp:window.RPDesk,submit,click,change,visibility,elements,storage};
}

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
 assert.equal(migrated.rp.db.schemaVersion,2);
 assert.deepEqual(JSON.parse(JSON.stringify(migrated.rp.db.entities)),[]);
 assert.deepEqual(JSON.parse(JSON.stringify(migrated.rp.db.relationships)),[]);
 assert.equal(migrated.rp.db.notes[0].body,'Notiz');
 const stored=JSON.parse(migrated.storage['rp-desk-data-v1']);
 assert.equal(stored.schemaVersion,2);

 const reloaded=app(stored);
 assert.equal(reloaded.rp.db.schemaVersion,2);
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
 assert.equal(JSON.parse(a.storage['rp-desk-data-v1']).schemaVersion,2);
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
 assert.equal(a.rp.char().id,first);
 assert.equal(a.rp.db.inventory[0].name,'Reifen');
 assert.equal(a.rp.db.finances[0].description,'Kauf');
 assert.equal(JSON.parse(a.storage['rp-desk-data-v1']).characters.length,1);
});

test('Dashboard zeigt bestehende Leasingverträge weiterhin an',()=>{
 const a=app();
 a.submit('character-create',{name:'A'});
 a.submit('lease-create',{vehicle:'Auto',total:'100',weeklyRate:'10',startDate:'2026-11-12'});
 assert.match(a.elements['#content'].innerHTML,/NÄCHSTE LEASINGRATE/);
});
