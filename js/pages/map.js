window.RPDeskPages=window.RPDeskPages||{};
window.RPDeskPages.map=(()=>{
'use strict';
const rp=window.RPDesk,engine=window.RPDeskMapEngine;
const {$,esc,head,empty,btn,db,ui,char,entity,entityLabel,entityFields,relatedEntities,createEntity,linkEntities,persist,toast,copyText,download,formatDate}=rp;
const CATEGORIES=[
 {name:'Tatort',color:'#ef5350',icon:'!'},
 {name:'Schussabgabe',color:'#ff7043',icon:'✦'},
 {name:'Fahrzeugfundort',color:'#42a5f5',icon:'▰'},
 {name:'Fahrzeugbeobachtung',color:'#26c6da',icon:'◉'},
 {name:'Gruppierungsgebiet',color:'#ab70e8',icon:'⬟'},
 {name:'Treffpunkt',color:'#66bb6a',icon:'◆'},
 {name:'Einsatzort',color:'#ffca28',icon:'▲'},
 {name:'Polizeistandort',color:'#78909c',icon:'✚'},
 {name:'Beobachtungspunkt',color:'#ec407a',icon:'◎'},
 {name:'Sonstiges',color:'#b0bec5',icon:'●'}
];
const ICONS=['!','✦','▰','◉','⬟','◆','▲','✚','◎','●'];
const MAX_FILE_SIZE=10*1024*1024;
let viewObserver=null,raf=0,pointers=new Map(),gesture=null,viewSaveTimer=null,suppressMapClick=false;
const expandedMarkerIds=new Set();

const activeCharacter=()=>char();
const currentCalibration=()=>activeCharacter()?.mapCalibration?.transform||null;
const calibrationPoints=()=>Array.isArray(activeCharacter()?.mapCalibration?.points)?activeCharacter().mapCalibration.points.filter(point=>point&&['imageX','imageY','gtaX','gtaY'].every(key=>Number.isFinite(Number(point[key])))):[];
const mapSettings=()=>activeCharacter()?.mapSettings||{};
const mapView=()=>activeCharacter()?.mapView||{zoom:1,panX:0,panY:0};
const allEntities=()=>db.entities.filter(item=>item.type==='location');
const allMapItems=(characterId=activeCharacter()?.mapFilters?.characterId)=>{
 return allEntities().filter(item=>item.charId===null||item.charId===(characterId||activeCharacter()?.id));
};
const linkedItems=id=>relatedEntities(id).map(link=>link.entity);
const category=name=>{
 const base=CATEGORIES.find(item=>item.name===name)||CATEGORIES[CATEGORIES.length-1];
 return{...base,...(activeCharacter()?.mapCategoryStyles?.[base.name]||{})};
};
const markerColor=item=>item.fields?.customStyle?colorValue(item.fields.color,category(item.fields.category).color):category(item.fields.category).color;
const markerIcon=item=>item.fields?.customStyle&&item.fields.icon?item.fields.icon:category(item.fields.category).icon;
const validShapes=(items,minimum)=>Array.isArray(items)?items.filter(item=>typeof item?.id==='string'&&typeof item.name==='string'&&Array.isArray(item.points)&&item.points.length>=minimum&&item.points.every(point=>point&&Number.isFinite(Number(point.x))&&Number(point.x)>=0&&Number(point.x)<=1&&Number.isFinite(Number(point.y))&&Number(point.y)>=0&&Number(point.y)<=1)):[];
const normalizedNumber=value=>{
 const text=String(value??'').trim();
 if(!text)return NaN;
 return Number(text.includes(',')&&!text.includes('.')?text.replace(',','.'):text);
};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const textFields=item=>{
 const fields=entityFields(item),links=linkedItems(item.id);
 return [entityLabel(item),JSON.stringify(fields),...links.map(link=>entityLabel(link)),...links.map(link=>JSON.stringify(entityFields(link)))].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
};
function calibrationValid(){
 const calibration=activeCharacter()?.mapCalibration;
 if(!calibration?.transform||!Array.isArray(calibration.points)||calibration.points.length<3)return false;
 try{
  const fitted=engine.fitAffine(calibration.points);
  return ['a','b','c','d','e','f'].every(key=>Number.isFinite(calibration.transform[key])&&Math.abs(calibration.transform[key]-fitted[key])<1e-7);
 }catch(_){return false}
}
function imagePosition(item){
 const coordinates=item.fields.coordinates;
 if(coordinates?.system==='gta'&&calibrationValid()){
  try{const point=engine.gtaToImage(coordinates.x,coordinates.y,currentCalibration());return point.x>=0&&point.x<=1&&point.y>=0&&point.y<=1?point:null}catch(_){return null}
 }
 if(coordinates?.system==='image'&&Number.isFinite(Number(coordinates.x))&&Number.isFinite(Number(coordinates.y)))return{x:Number(coordinates.x),y:Number(coordinates.y)};
 if(Number.isFinite(Number(item.fields.x))&&Number.isFinite(Number(item.fields.y)))return{x:Number(item.fields.x)/100,y:Number(item.fields.y)/100};
 return null;
}
function markerCoordinates(fields,image){
 if(fields.coordinateSystem==='gta'&&calibrationValid()){
  const x=normalizedNumber(fields.gtaX),y=normalizedNumber(fields.gtaY);
  if(Number.isFinite(x)&&Number.isFinite(y))return{system:'gta',x,y,...(fields.gtaZ!==''&&Number.isFinite(normalizedNumber(fields.gtaZ))?{z:normalizedNumber(fields.gtaZ)}:{})};
 }
 return{system:'image',x:image.x,y:image.y};
}
function coordinateText(item){
 const coordinates=item.fields.coordinates;
 if(coordinates?.system==='gta'&&Number.isFinite(Number(coordinates.x))&&Number.isFinite(Number(coordinates.y)))return`GTA X ${Number(coordinates.x).toFixed(2)}, Y ${Number(coordinates.y).toFixed(2)}${Number.isFinite(Number(coordinates.z))?`, Z ${Number(coordinates.z).toFixed(2)}`:''}`;
 const position=imagePosition(item);
 return position?`Bild X ${(position.x*100).toFixed(2)}%, Y ${(position.y*100).toFixed(2)}%`:'Position unbekannt';
}
function mapTransforms(){
 const world=$('[data-map-world]'),stage=$('[data-map-stage]');
 if(!world||!stage)return;
 const settings=mapSettings(),view=mapView();
 let zoom=Number(view.zoom)||1;
 const min=Number(settings.minZoom)||1,max=Number(settings.maxZoom)||6;
 zoom=clamp(zoom,min,max);
 const maxX=Math.max(0,(world.offsetWidth*zoom-stage.clientWidth)/2),maxY=Math.max(0,(world.offsetHeight*zoom-stage.clientHeight)/2);
 let panX=Number(view.panX)||0,panY=Number(view.panY)||0;
 if(settings.boundaries!==false){panX=clamp(panX,-maxX,maxX);panY=clamp(panY,-maxY,maxY)}
 world.style.transform=`translate(-50%,-50%) translate(${panX}px,${panY}px) scale(${zoom})`;
 const current=activeCharacter();
 if(current)current.mapView={zoom,panX,panY};
 const zoomLabel=$('[data-map-zoom-label]');if(zoomLabel)zoomLabel.textContent=`${Math.round(zoom*100)}%`;
 const zoomInput=$('[data-map-zoom-input]');if(zoomInput&&document.activeElement!==zoomInput)zoomInput.value=String(zoom);
}
function scheduleTransform(){
 if(raf)return;
 const run=()=>{raf=0;mapTransforms()};
 if(typeof requestAnimationFrame==='function')raf=requestAnimationFrame(run);else run();
}
function scheduleViewSave(){
 if(viewSaveTimer)clearTimeout(viewSaveTimer);
 viewSaveTimer=setTimeout(()=>{viewSaveTimer=null;persist()},220);
}
function pointFromClient(clientX,clientY){
 const stage=$('[data-map-stage]'),world=$('[data-map-world]');
 if(!stage||!world||!world.offsetWidth||!world.offsetHeight)return null;
 const rect=stage.getBoundingClientRect(),view=mapView(),zoom=Number(view.zoom)||1;
 return{
  x:clamp(0.5+(clientX-rect.left-rect.width/2-(Number(view.panX)||0))/(world.offsetWidth*zoom),0,1),
  y:clamp(0.5+(clientY-rect.top-rect.height/2-(Number(view.panY)||0))/(world.offsetHeight*zoom),0,1)
 };
}
function panTo(imageX,imageY,zoom=Number(mapView().zoom)||1){
 const stage=$('[data-map-stage]'),world=$('[data-map-world]'),current=activeCharacter();
 if(!stage||!world||!current)return false;
 const width=world.offsetWidth,height=world.offsetHeight;
 current.mapView={zoom,panX:(0.5-imageX)*width*zoom,panY:(0.5-imageY)*height*zoom};
 mapTransforms();persist();return true;
}
function zoomAt(clientX,clientY,nextZoom){
 const stage=$('[data-map-stage]'),world=$('[data-map-world]'),current=activeCharacter();
 if(!stage||!world||!current)return;
 const rect=stage.getBoundingClientRect(),view=mapView(),settings=mapSettings();
 const min=Number(settings.minZoom)||1,max=Number(settings.maxZoom)||6,oldZoom=Number(view.zoom)||1,newZoom=clamp(nextZoom,min,max);
 const imageX=0.5+(clientX-rect.left-rect.width/2-(Number(view.panX)||0))/(world.offsetWidth*oldZoom);
 const imageY=0.5+(clientY-rect.top-rect.height/2-(Number(view.panY)||0))/(world.offsetHeight*oldZoom);
 current.mapView={zoom:newZoom,panX:clientX-rect.left-rect.width/2-(imageX-0.5)*world.offsetWidth*newZoom,panY:clientY-rect.top-rect.height/2-(imageY-0.5)*world.offsetHeight*newZoom};
 scheduleTransform();
 scheduleViewSave();
}
function filteredMarkers(){
 const filters=activeCharacter()?.mapFilters||{},settings=mapSettings(),query=String(filters.query||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return allMapItems().filter(item=>{
  const fields=item.fields||{},date=String(fields.eventDate||'').slice(0,10),position=imagePosition(item);
  if(fields.hidden&&!filters.includeHidden||!position)return false;
  if(filters.category&&fields.category!==filters.category)return false;
  if(filters.favoritesOnly&&!fields.favorite)return false;
  if(filters.dateFrom&&(!date||date<filters.dateFrom)||filters.dateTo&&(!date||date>filters.dateTo))return false;
  if(filters.owner==='mine'&&item.charId!==activeCharacter()?.id)return false;
  if(filters.owner==='shared'&&item.charId!==null)return false;
  if(filters.characterId&&item.charId!==filters.characterId)return false;
  if(filters.groupId&&!linkedItems(item.id).some(link=>link.id===filters.groupId))return false;
  if(query&&!textFields(item).includes(query))return false;
  return true;
 });
}
function colorValue(value,fallback='#8aa6ff'){return /^#[0-9a-f]{6}$/i.test(String(value||''))?value:fallback}
function markerMarkup(item,selected,zoom,settings){
 const point=imagePosition(item);if(!point)return'';
 const fields=item.fields||{},cat=category(fields.category),fixed=settings.markerScale!==false,scale=fixed?1/(Number(zoom)||1):1;
 return`<button class="map-marker ${selected?.id===item.id?'selected':''} ${fields.favorite?'is-favorite':''}" data-map-marker="${esc(item.id)}" data-map-searchable="${esc(textFields(item))}" style="left:${point.x*100}%;top:${point.y*100}%;--marker-color:${esc(markerColor(item))};--marker-scale:${scale}" title="${esc(entityLabel(item))} · ${esc(fields.category||'Sonstiges')}" aria-label="${esc(entityLabel(item))}"><span class="map-marker-glyph">${esc(markerIcon(item))}</span>${settings.labels!==false?`<span class="map-marker-label">${esc(entityLabel(item))}</span>`:''}</button>`;
}
function polygonMarkup(areas,selected){
 return areas.filter(area=>area.visible!==false&&Array.isArray(area.points)&&area.points.length>=3).map(area=>{
  const points=area.points.map(point=>`${Number(point.x)*1000},${Number(point.y)*1000}`).join(' ');
  const handles=selected?.id===area.id&&ui.mapVertexEdit?area.points.map((point,index)=>`<circle class="map-vertex" cx="${Number(point.x)*1000}" cy="${Number(point.y)*1000}" r="11" data-map-vertex="${index}" data-map-shape-id="${esc(area.id)}" aria-label="Eckpunkt ${index+1} verschieben"/>`).join(''):'';
  return`<polygon points="${points}" fill="${esc(colorValue(area.color,'#8aa6ff'))}" fill-opacity="${clamp(Number(area.opacity??mapSettings().areaOpacity??0.22),0,0.8)}" stroke="${esc(colorValue(area.color,'#8aa6ff'))}" stroke-width="4" vector-effect="non-scaling-stroke" data-map-shape="area" data-map-shape-id="${esc(area.id)}"/>${handles}`;
 }).join('');
}
function routeMarkup(routes,selected){
 return routes.filter(route=>route.visible!==false&&Array.isArray(route.points)&&route.points.length>=2).map(route=>{
  const points=route.points.map(point=>`${Number(point.x)*1000},${Number(point.y)*1000}`).join(' ');
  const handles=selected?.id===route.id&&ui.mapVertexEdit?route.points.map((point,index)=>`<circle class="map-vertex" cx="${Number(point.x)*1000}" cy="${Number(point.y)*1000}" r="11" data-map-vertex="${index}" data-map-shape-id="${esc(route.id)}" aria-label="Routenpunkt ${index+1} verschieben"/>`).join(''):'';
  return`<polyline points="${points}" fill="none" stroke="${esc(colorValue(route.color,'#42a5f5'))}" stroke-width="${clamp(Number(route.width)||Number(mapSettings().routeWidth)||4,1,16)}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" marker-end="url(#map-arrow)" data-map-shape="route" data-map-shape-id="${esc(route.id)}"/>${handles}`;
 }).join('');
}
function mapShapeForm(){
 const drawing=ui.mapDrawing;
 if(!drawing)return'';
 const minimum=drawing.type==='area'?3:2;
 return`<form class="map-shape-editor panel panel-pad" data-form="map-shape"><div class="panel-head"><h3>${drawing.type==='area'?'Gebiet':'Route'} speichern</h3><span class="badge">${drawing.points.length} Punkte</span></div><div class="form-grid"><div class="field"><label>Name</label><input name="name" required maxlength="100" value="${esc(drawing.name||'')}"></div><div class="field"><label>Farbe</label><input name="color" type="color" value="${esc(colorValue(drawing.color,drawing.type==='area'?'#ab70e8':'#42a5f5'))}"></div>${drawing.type==='area'?'<div class="field"><label>Flächentransparenz</label><input name="opacity" type="range" min="0.05" max="0.8" step="0.05" value="0.25"></div>':'<div class="field"><label>Linienstärke</label><input name="width" type="number" min="1" max="16" value="4"></div>'}<div class="field full"><label>Beschreibung</label><textarea name="description" rows="2" maxlength="500"></textarea></div></div><p class="hint">${drawing.points.length<minimum?`Noch ${minimum-drawing.points.length} Punkt(e) auf der Karte setzen.`:'Punkte werden relativ zum Originalbild gespeichert.'}</p><div class="form-actions"><button class="button" ${drawing.points.length<minimum?'disabled':''}>Speichern</button><button type="button" class="button button-quiet" data-map-action="draw-undo" ${drawing.points.length?'':'disabled'}>Letzten Punkt entfernen</button><button type="button" class="button button-quiet" data-map-action="draw-cancel">Abbrechen</button></div></form>`;
}
function relatedOptions(type,selectedId){
 return`<option value="">Keine Verknüpfung</option>${db.entities.filter(item=>item.type===type&&(item.charId===activeCharacter()?.id||item.charId===null)).map(item=>`<option value="${esc(item.id)}" ${item.id===selectedId?'selected':''}>${esc(entityLabel(item))}</option>`).join('')}`;
}
function markerForm(selected,position){
 const item=selected&&ui.mapEditing===selected.id?selected:null;
 if(!item&&!ui.mapDraft)return'';
 const fields=item?.fields||{},point=item?imagePosition(item):ui.mapDraft,coordinates=fields.coordinates||{},calibrated=calibrationValid(),gta=item&&coordinates.system==='gta'?coordinates:null;
 const related= item?linkedItems(item.id):[];
 const idFor=type=>related.find(link=>link.type===type)?.id||'';
 const privateSelected=item?item.charId!==null:true;
 const xValue=gta?.x??(item?point?.x*100:position?.x*100),yValue=gta?.y??(item?point?.y*100:position?.y*100);
 const selectedSystem=gta?'gta':'image';
 return`<form class="map-marker-editor panel panel-pad" data-form="map-marker" ${item?`data-id="${esc(item.id)}"`:''}><div class="panel-head"><h3>${item?'Marker bearbeiten':'Neuen Marker anlegen'}</h3><button type="button" class="icon-button" data-map-action="close-editor" aria-label="Bearbeitung schließen">×</button></div><div class="form-grid"><div class="field"><label>Titel</label><input name="title" required maxlength="120" value="${esc(fields.name||'')}"></div><div class="field"><label>Kategorie</label><select name="category">${CATEGORIES.map(value=>{const style=category(value.name);return`<option value="${esc(value.name)}" ${value.name===(fields.category||'Tatort')?'selected':''}>${esc(style.icon)} ${esc(value.name)}</option>`}).join('')}</select></div><label class="tool-setting full"><input name="customStyle" type="checkbox" ${fields.customStyle?'checked':''}> Individuelle Markerfarbe und Symbol verwenden</label><div class="field"><label>Markerfarbe</label><input name="color" type="color" value="${esc(colorValue(fields.color,category(fields.category).color))}"></div><div class="field"><label>Symbol</label><select name="icon">${ICONS.map(icon=>`<option value="${esc(icon)}" ${icon===(fields.icon||category(fields.category).icon)?'selected':''}>${esc(icon)}</option>`).join('')}</select></div>${calibrated?`<div class="field full"><label>Koordinatensystem</label><select name="coordinateSystem"><option value="image" ${selectedSystem==='image'?'selected':''}>Bildposition (%)</option><option value="gta" ${selectedSystem==='gta'?'selected':''}>GTA-X/Y (kalibriert)</option></select></div>`:''}<div class="field"><label data-map-coordinate-label="x">${gta?'GTA-X':'Bild-X (%)'}</label><input name="x" inputmode="decimal" value="${Number.isFinite(Number(xValue))?esc(Number(xValue).toFixed(3)):''}" required></div><div class="field"><label data-map-coordinate-label="y">${gta?'GTA-Y':'Bild-Y (%)'}</label><input name="y" inputmode="decimal" value="${Number.isFinite(Number(yValue))?esc(Number(yValue).toFixed(3)):''}" required></div>${calibrated?`<div class="field"><label>GTA-Z (optional)</label><input name="z" inputmode="decimal" value="${esc(gta?.z??'')}"></div>`:''}<div class="field"><label>Datum / Uhrzeit</label><input name="eventDate" type="datetime-local" value="${esc(fields.eventDate||'')}"></div><div class="field"><label>Sichtbarkeit</label><select name="visibility"><option value="private" ${privateSelected?'selected':''}>Privat – nur dieser Charakter</option><option value="shared" ${!privateSelected?'selected':''}>Gemeinsam – alle Charaktere</option></select></div>${['case','vehicle','person','organization','event','board'].map(type=>`<div class="field"><label>${({case:'Ermittlungsakte',vehicle:'Fahrzeug',person:'Person',organization:'Gruppierung',event:'Timeline-Ereignis',board:'Pinnwand'})[type]}</label><select name="link-${type}">${relatedOptions(type,idFor(type))}</select></div>`).join('')}<div class="field full"><label>Beschreibung</label><textarea name="description" rows="3" maxlength="1200">${esc(fields.description||'')}</textarea></div></div><p class="hint">${calibrated?'GTA-Koordinaten können anhand deiner gespeicherten Kalibrierung verwendet werden.':'Keine gültige Kalibrierung: Marker werden ausschließlich mit Bildkoordinaten gespeichert.'}</p><div class="form-actions"><button class="button">${item?'Änderungen speichern':'Marker anlegen'}</button>${item?`<button type="button" class="button button-quiet" data-map-action="map-duplicate" data-id="${esc(item.id)}">Duplizieren</button>`:''}<button type="button" class="button button-quiet" data-map-action="cancel-edit">Abbrechen</button></div></form>`;
}
function markerList(items,selected){
 if(!items.length)return empty('Keine Marker für diese Filter. Setze einen Marker oder ändere die Filter.');
 return`<div class="map-marker-list">${items.map(item=>`<button class="map-list-item ${selected?.id===item.id?'selected':''}" data-map-list="${esc(item.id)}" data-map-searchable="${esc(textFields(item))}"><span class="map-list-symbol" style="--marker-color:${esc(markerColor(item))}">${esc(markerIcon(item))}</span><span class="map-list-text"><strong>${esc(entityLabel(item))}</strong><small>${esc(item.fields.category||'Sonstiges')} · ${esc(coordinateText(item))}${item.fields.eventDate?` · ${esc(formatDate(item.fields.eventDate,true))}`:''}</small></span>${item.fields.favorite?'<span class="map-favorite-mark">★</span>':''}</button>`).join('')}</div>`;
}
function selectedDetails(selected){
 if(!selected)return'<p class="hint">Wähle einen Marker aus der Karte oder Liste aus.</p>';
 const fields=selected.fields||{},links=linkedItems(selected.id);
 return`<div class="map-detail"><div class="panel-head"><div><h3>${esc(entityLabel(selected))}</h3><span class="badge">${esc(fields.category||'Sonstiges')}</span></div><button class="button button-quiet button-small" data-map-action="close-details">Schließen</button></div><p>${esc(fields.description||'Keine Beschreibung')}</p><dl><dt>Position</dt><dd>${esc(coordinateText(selected))}</dd><dt>Datum</dt><dd>${esc(formatDate(fields.eventDate,true))}</dd><dt>Charakter</dt><dd>${esc(db.characters.find(item=>item.id===selected.charId)?.name||'Gemeinsam')}</dd></dl>${links.length?`<div class="map-links"><strong>Verknüpfte Datensätze</strong>${links.map(item=>`<button class="button-link" data-open-entity="${esc(item.id)}">${esc(entityLabel(item))} · ${esc(item.type)}</button>`).join('')}</div>`:''}<div class="form-actions"><button class="button button-quiet" data-map-action="map-edit" data-id="${esc(selected.id)}">Bearbeiten</button><button class="button button-quiet" data-map-action="map-copy-coordinates" data-id="${esc(selected.id)}">Koordinaten kopieren</button><button class="button button-quiet" data-map-action="map-center" data-id="${esc(selected.id)}">Zentrieren</button><button class="button button-quiet" data-map-action="map-duplicate" data-id="${esc(selected.id)}">Duplizieren</button><button class="button button-quiet" data-map-action="map-favorite" data-id="${esc(selected.id)}">${fields.favorite?'Favorit entfernen':'Favorisieren'}</button><button class="button button-quiet" data-map-action="map-hide" data-id="${esc(selected.id)}">${fields.hidden?'Einblenden':'Ausblenden'}</button><button class="button button-danger" data-map-action="map-delete" data-id="${esc(selected.id)}">Löschen</button></div></div>`;
}
function shapeLists(){
 const current=activeCharacter(),areas=validShapes(current?.mapAreas,3),routes=validShapes(current?.mapRoutes,2),selectedId=ui.mapSelectedShape;
 return`${areas.length?`<div class="map-shape-list"><strong>Gebiete</strong>${areas.map(item=>`<div class="map-list-item"><button class="map-list-text" data-map-shape-select="${esc(item.id)}"><strong>${esc(item.name)}</strong><small>${item.points.length} Eckpunkte · ${item.visible===false?'ausgeblendet':'sichtbar'}</small></button><button class="button button-quiet button-small" data-map-action="shape-visibility" data-kind="area" data-id="${esc(item.id)}">${item.visible===false?'Anzeigen':'Ausblenden'}</button><button class="button button-quiet button-small" data-map-action="shape-edit" data-kind="area" data-id="${esc(item.id)}">${selectedId===item.id&&ui.mapVertexEdit?'Fertig':'Eckpunkte'}</button><button class="button button-danger button-small" data-map-action="shape-delete" data-kind="area" data-id="${esc(item.id)}" aria-label="Gebiet löschen">×</button></div>${selectedId===item.id&&ui.mapVertexEdit?`<ol>${item.points.map((point,index)=>`<li>Eckpunkt ${index+1} <button class="button-link" data-map-action="vertex-delete" data-kind="area" data-id="${esc(item.id)}" data-index="${index}">Entfernen</button></li>`).join('')}<li class="hint">Auf die Karte klicken, um einen Eckpunkt hinzuzufügen; Griffe ziehen, um Punkte zu verschieben.</li></ol>`:''}`).join('')}</div>`:''}${routes.length?`<div class="map-shape-list"><strong>Routen</strong>${routes.map(item=>`<div class="map-list-item"><button class="map-list-text" data-map-shape-select="${esc(item.id)}"><strong>${esc(item.name)}</strong><small>${item.points.length} Punkte · ${item.visible===false?'ausgeblendet':'sichtbar'}</small></button><button class="button button-quiet button-small" data-map-action="shape-visibility" data-kind="route" data-id="${esc(item.id)}">${item.visible===false?'Anzeigen':'Ausblenden'}</button><button class="button button-quiet button-small" data-map-action="shape-edit" data-kind="route" data-id="${esc(item.id)}">${selectedId===item.id&&ui.mapVertexEdit?'Fertig':'Punkte'}</button><button class="button button-danger button-small" data-map-action="shape-delete" data-kind="route" data-id="${esc(item.id)}" aria-label="Route löschen">×</button></div>${selectedId===item.id&&ui.mapVertexEdit?`<ol>${item.points.map((point,index)=>`<li>Routenpunkt ${index+1} <button class="button-link" data-map-action="vertex-delete" data-kind="route" data-id="${esc(item.id)}" data-index="${index}">Entfernen</button></li>`).join('')}<li class="hint">Auf die Karte klicken, um einen Punkt hinzuzufügen; Griffe ziehen, um Punkte zu verschieben.</li></ol>`:''}`).join('')}</div>`:''}`;
}
function calibrationPanel(){
 const current=activeCharacter(),calibration=current?.mapCalibration,points=calibrationPoints(),valid=calibrationValid();
 return`<details class="map-tools-panel"><summary>Kalibrierung & Koordinaten</summary><div class="map-tools-content"><p class="hint">${valid?'Kalibrierung aktiv. GTA-Koordinaten werden aus den Referenzpunkten berechnet.':'Keine gültige Kalibrierung. Es werden nur Bildkoordinaten verwendet; es sind keine Referenzwerte vorgegeben.'}</p><div class="form-actions"><button class="button ${ui.mapCalibrationMode?'':'button-quiet'}" data-map-action="calibration-mode">${ui.mapCalibrationMode?'Kalibrierungsmodus aktiv':'Referenzpunkt auf Karte setzen'}</button><button class="button button-quiet" data-map-action="calibration-fit" ${points.length<3?'disabled':''}>Kalibrierung berechnen</button><button class="button button-danger button-small" data-map-action="calibration-reset" ${points.length?'':'disabled'}>Zurücksetzen</button></div>${ui.mapPendingReference?`<form data-form="map-reference" class="map-reference-form"><p>Bildposition ${(ui.mapPendingReference.x*100).toFixed(2)}%, ${(ui.mapPendingReference.y*100).toFixed(2)}%</p><div class="form-grid"><div class="field"><label>GTA-X (bekannter Referenzwert)</label><input name="gtaX" inputmode="decimal" required></div><div class="field"><label>GTA-Y (bekannter Referenzwert)</label><input name="gtaY" inputmode="decimal" required></div></div><div class="form-actions"><button class="button button-small">Referenzpunkt speichern</button><button type="button" class="button button-quiet" data-map-action="reference-cancel">Abbrechen</button></div></form>`:''}${points.length?`<ol class="map-reference-list">${points.map((point,index)=>`<li><span>Bild ${(Number(point.imageX)*100).toFixed(2)}%, ${(Number(point.imageY)*100).toFixed(2)}% → GTA ${Number(point.gtaX).toFixed(2)}, ${Number(point.gtaY).toFixed(2)}</span><button class="button-link" data-map-action="reference-delete" data-index="${index}" aria-label="Referenzpunkt entfernen">Entfernen</button></li>`).join('')}</ol>`:''}${valid?`<div class="notice mt-12">Kalibrierungsabweichung an den ${points.length} Referenzpunkten: durchschnittlich ${calibration.transform.meanError.toFixed(2)}, maximal ${calibration.transform.maxError.toFixed(2)} GTA-Einheiten.</div><form data-form="map-test-point" class="map-test-point"><strong>Testpunkt prüfen</strong><div class="form-grid"><div class="field"><label>GTA-X</label><input name="gtaX" inputmode="decimal" required></div><div class="field"><label>GTA-Y</label><input name="gtaY" inputmode="decimal" required></div><div class="field"><label>Erwartetes Bild-X (%)</label><input name="imageX" inputmode="decimal" required></div><div class="field"><label>Erwartetes Bild-Y (%)</label><input name="imageY" inputmode="decimal" required></div></div><button class="button button-small">Testabweichung berechnen</button>${ui.mapTestError!==undefined?`<p class="hint">Abweichung: ${Number(ui.mapTestError).toFixed(2)} Bild-Prozentpunkte.</p>`:''}</form>`:''}</div></details>`;
}
function settingsPanel(){
 const settings=mapSettings(),current=activeCharacter();
 return`<details class="map-tools-panel"><summary>Karteneinstellungen</summary><div class="map-tools-content"><form data-form="map-settings"><div class="form-grid"><div class="field"><label>Markergröße</label><input name="markerSize" type="range" min="18" max="48" value="${clamp(Number(settings.markerSize)||28,18,48)}"></div><label class="tool-setting"><input name="labels" type="checkbox" ${settings.labels===false?'':'checked'}> Beschriftungen anzeigen</label><label class="tool-setting"><input name="markerScale" type="checkbox" ${settings.markerScale===false?'':'checked'}> Markergröße beim Zoomen konstant halten</label><label class="tool-setting"><input name="showCoordinates" type="checkbox" ${settings.showCoordinates===false?'':'checked'}> Koordinatenanzeige</label><label class="tool-setting"><input name="animations" type="checkbox" ${settings.animations===false?'':'checked'}> Animationen aktivieren</label><label class="tool-setting"><input name="boundaries" type="checkbox" ${settings.boundaries===false?'':'checked'}> Kartenbewegung begrenzen</label><label class="tool-setting"><input name="cluster" type="checkbox" ${settings.cluster===false?'':'checked'}> Marker bei hoher Dichte bündeln</label><div class="field"><label>Polygon-Transparenz</label><input name="areaOpacity" type="range" min="0.05" max="0.8" step="0.05" value="${clamp(Number(settings.areaOpacity)||0.25,0.05,0.8)}"></div><div class="field"><label>Routenstärke</label><input name="routeWidth" type="range" min="1" max="16" value="${clamp(Number(settings.routeWidth)||4,1,16)}"></div><div class="field"><label>Zoomgeschwindigkeit</label><input name="zoomSpeed" type="range" min="0.05" max="0.5" step="0.05" value="${clamp(Number(settings.zoomSpeed)||0.15,0.05,0.5)}"></div><div class="field"><label>Minimaler Zoom</label><input name="minZoom" type="number" min="0.5" max="1" step="0.1" value="${clamp(Number(settings.minZoom)||1,0.5,1)}"></div><div class="field"><label>Maximaler Zoom</label><input name="maxZoom" type="number" min="2" max="12" value="${clamp(Number(settings.maxZoom)||6,2,12)}"></div><div class="field"><label>Hintergrundfarbe</label><input name="background" type="color" value="${esc(colorValue(settings.background,'#101722'))}"></div></div><details class="map-category-settings"><summary>Kategorienfarben & Symbole</summary><div class="map-category-grid">${CATEGORIES.map((item,index)=>{const style=category(item.name);return`<div class="map-category-style"><strong>${esc(item.name)}</strong><label>Farbe <input name="categoryColor${index}" type="color" value="${esc(colorValue(style.color,item.color))}"></label><label>Symbol <select name="categoryIcon${index}">${ICONS.map(icon=>`<option value="${esc(icon)}" ${icon===style.icon?'selected':''}>${esc(icon)}</option>`).join('')}</select></label></div>`}).join('')}</div></details><div class="form-actions"><button class="button button-small">Einstellungen speichern</button><button type="button" class="button button-quiet button-small" data-map-action="view-reset">Kartenausschnitt zurücksetzen</button></div></form><p class="hint">Einstellungen werden nur lokal im Profil von ${esc(current?.name||'diesem Charakter')} gespeichert.</p></div></details>`;
}
function visibleCharacterOptions(selected){
 return`<option value="">Alle Charaktere</option>${db.characters.map(item=>`<option value="${esc(item.id)}" ${item.id===selected?'selected':''}>${esc(item.name)}</option>`).join('')}`;
}
function pageMap(){
 const current=activeCharacter();
 if(!current)return`${head('GTA-V-Karte','Erstelle einen Charakter, um eine lokale Kartenansicht anzulegen.')}<div class="panel panel-pad">${empty('Für Kartenobjekte wird ein Charakterprofil benötigt.')}</div>`;
 if(current.mapDataVersion===undefined){current.mapDataVersion=1;persist()}
 const filters=current.mapFilters||{},settings=mapSettings(),items=filteredMarkers();
 const selected=ui.mapDetailsClosed?null:items.find(item=>item.id===ui.mapSelectedMarker)||items[0]||null;
 if(selected){ui.mapSelectedMarker=selected.id;ui.mapDetailsClosed=false}
 const allAreas=validShapes(current.mapAreas,3),allRoutes=validShapes(current.mapRoutes,2);
 const selectedShape=[...allAreas,...allRoutes].find(item=>item.id===ui.mapSelectedShape)||null;
 const zoom=Number(mapView().zoom)||1;
 const drawing=ui.mapDrawing;
 const mapItems=items.filter(item=>!item.fields.hidden);
 const markersHtml=mapItems.length>400&&settings.cluster!==false?clusteredMarkerMarkup(mapItems,selected,zoom,settings):mapItems.map(item=>markerMarkup(item,selected,zoom,settings)).join('');
 const mapMode=ui.mapAddMode?'marker':drawing?.type|| (ui.mapCalibrationMode?'calibration':'pan');
 return`<div class="rp-map-page ${settings.animations===false?'map-no-animations':''}">
  ${head('GTA-V-Karte','Lokale Karte mit Kalibrierung, Ermittlungsmarkern, Gebieten und Routen.',`<button class="button button-quiet" data-map-action="export">Karten-Backup exportieren</button><button class="button button-quiet" data-map-action="import">Karten-Backup importieren</button><button class="button button-quiet" data-map-action="fullscreen">Vollbild</button>`)}
  <input type="file" accept=".json,application/json" data-map-import hidden>
  <div class="map-coordinate-tools panel panel-pad">
   <form data-form="map-jump" class="map-coordinate-form"><span class="map-tool-title">Zu Koordinaten springen</span>
    <div class="field"><label>GTA-X</label><input name="gtaX" inputmode="decimal" placeholder="${calibrationValid()?'z. B. 100,5':'Kalibrierung erforderlich'}" ${calibrationValid()?'':'disabled'} required></div>
    <div class="field"><label>GTA-Y</label><input name="gtaY" inputmode="decimal" placeholder="${calibrationValid()?'z. B. -250,25':'Kalibrierung erforderlich'}" ${calibrationValid()?'':'disabled'} required></div>
    <button class="button button-small" ${calibrationValid()?'':'disabled'}>Springen</button>
    <button type="button" class="button button-quiet button-small" data-map-action="coordinate-marker" ${calibrationValid()?'':'disabled'}>Marker dort anlegen</button>
   </form>
   <div class="map-quick-controls"><label>Filter-Charakter<select class="control" data-map-character>${visibleCharacterOptions(filters.characterId||'')}</select></label>
    <button class="button button-quiet button-small" data-map-action="favorite-filter">${filters.favoritesOnly?'Alle Marker':'Favoriten'}</button>
    <button class="button button-quiet button-small" data-map-action="hidden-filter">${filters.includeHidden?'Ausgeblendete verbergen':'Ausgeblendete anzeigen'}</button>
    <button class="button button-quiet button-small" data-map-action="edit-toggle">${ui.mapEditMode?'Bearbeiten aktiv':'Marker bearbeiten'}</button>
    <button class="button button-quiet button-small" data-map-action="marker-add">${ui.mapAddMode?'Marker-Modus abbrechen':'Marker setzen'}</button>
    <button class="button button-quiet button-small" data-map-action="draw-area">Gebiet zeichnen</button>
    <button class="button button-quiet button-small" data-map-action="draw-route">Route zeichnen</button>
   </div>
  </div>
  <div class="map-layout map-full-layout">
   <aside class="map-sidebar panel panel-pad">
    <div class="map-filter-stack">
     <label class="field"><span>Suche</span><input class="search-field" type="search" data-map-search value="${esc(filters.query||'')}" placeholder="Titel, Akte, Kennzeichen, Person …"></label>
     <label class="field"><span>Kategorie</span><select class="control" data-map-category><option value="">Alle Kategorien</option>${CATEGORIES.map(item=>`<option value="${esc(item.name)}" ${item.name===filters.category?'selected':''}>${esc(item.icon)} ${esc(item.name)}</option>`).join('')}</select></label>
     <label class="field"><span>Gruppierung</span><select class="control" data-map-group><option value="">Alle Gruppierungen</option>${db.entities.filter(item=>item.type==='organization'&&(item.charId===current.id||item.charId===null)).map(item=>`<option value="${esc(item.id)}" ${item.id===filters.groupId?'selected':''}>${esc(entityLabel(item))}</option>`).join('')}</select></label>
     <label class="field"><span>Sichtbarkeit</span><select class="control" data-map-owner><option value="" ${!filters.owner?'selected':''}>Eigene & gemeinsame</option><option value="mine" ${filters.owner==='mine'?'selected':''}>Nur eigener Charakter</option><option value="shared" ${filters.owner==='shared'?'selected':''}>Nur gemeinsam</option></select></label>
     <div class="field-row"><label class="field"><span>Ab Datum</span><input class="control" type="date" data-map-date-from value="${esc(filters.dateFrom||'')}"></label><label class="field"><span>Bis Datum</span><input class="control" type="date" data-map-date-to value="${esc(filters.dateTo||'')}"></label></div>
    </div>
    <div class="map-list-heading"><strong>Marker</strong><span class="badge">${items.length}</span></div>
    ${markerList(items,selected)}${shapeLists()}
    <section class="map-selection-panel">${selectedDetails(selected)}</section>
   </aside>
   <main class="map-main">
    <div class="map-stage ${ui.mapAddMode?'map-add-mode':''} ${drawing?'map-draw-mode':''} ${ui.mapCalibrationMode?'map-calibration-mode':''}" data-map-stage tabindex="0" style="background:${esc(colorValue(settings.background,'#101722'))}" role="application" aria-label="Interaktive GTA-V-Karte">
     <div class="map-world" data-map-world style="transform:translate(-50%,-50%) translate(${Number(mapView().panX)||0}px,${Number(mapView().panY)||0}px) scale(${zoom})">
      <img data-map-image src="assets/los-santos-custom.png" alt="Benutzerdefinierte GTA-V-Karte von Los Santos und Blaine County" draggable="false">
      <svg class="map-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Kartenflächen und Routen">
       <defs><marker id="map-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs>
       ${polygonMarkup(allAreas,selectedShape)}${routeMarkup(allRoutes,selectedShape)}
       ${drawing?`<polyline class="map-drawing-line" points="${drawing.points.map(point=>`${point.x*1000},${point.y*1000}`).join(' ')}" fill="${drawing.type==='area'?'#ab70e833':'none'}" stroke="#f8fafc" stroke-width="3" stroke-dasharray="10 8" vector-effect="non-scaling-stroke"/>`:''}
       ${ui.mapCalibrationMode?calibrationPoints().map(point=>`<circle class="map-reference-dot" cx="${Number(point.imageX)*1000}" cy="${Number(point.imageY)*1000}" r="10"/>`).join(''):''}
      </svg>
      ${markersHtml}${ui.mapDraft?`<span class="map-draft-dot" style="left:${ui.mapDraft.x*100}%;top:${ui.mapDraft.y*100}%"></span>`:''}
     </div>
     <div class="map-zoom-controls"><button class="icon-button" data-map-action="zoom-in" aria-label="Vergrößern">+</button><button class="icon-button" data-map-action="zoom-out" aria-label="Verkleinern">−</button><button class="icon-button" data-map-action="zoom-reset" aria-label="Ansicht anpassen">⌂</button><label class="map-zoom-range"><span data-map-zoom-label>${Math.round(zoom*100)}%</span><input type="range" min="${Number(settings.minZoom)||1}" max="${Number(settings.maxZoom)||6}" step="0.1" value="${zoom}" data-map-zoom-input aria-label="Kartenzoom"></label></div>
     <div class="map-stage-notice" data-map-image-notice hidden>Das Kartenbild <code>assets/los-santos-custom.png</code> konnte nicht geladen werden. Die Kartendaten bleiben gespeichert.</div>
    </div>
    <footer class="map-statusbar" ${settings.showCoordinates===false?'hidden':''}><span data-map-coordinates>Bild-X — · Bild-Y —</span><span>Zoom <strong data-map-zoom-label>${Math.round(zoom*100)}%</strong></span><span>Modus <strong>${esc(mapMode)}</strong></span><span>Kalibrierung <strong>${calibrationValid()?'aktiv':'nicht eingerichtet'}</strong></span></footer>
    ${mapShapeForm()}${markerForm(selected,ui.mapDraft)}${calibrationPanel()}${settingsPanel()}
   </main>
  </div>
 </div>`;
}
function clusteredMarkerMarkup(items,selected,zoom,settings){
 const grid=clamp(4/zoom,0.5,4),groups=new Map();
 for(const item of items){const point=imagePosition(item),key=`${Math.floor(point.x*100/grid)}:${Math.floor(point.y*100/grid)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item)}
 return[...groups.values()].map(group=>{
  const expanded=group.filter(item=>expandedMarkerIds.has(item.id)),remaining=group.filter(item=>!expandedMarkerIds.has(item.id));
  const markers=group.filter(item=>expandedMarkerIds.has(item.id)||remaining.length<4).map(item=>markerMarkup(item,selected,zoom,settings)).join('');
  if(remaining.length<4)return markers;
  const points=remaining.map(imagePosition),centerX=points.reduce((sum,point)=>sum+point.x,0)/points.length,centerY=points.reduce((sum,point)=>sum+point.y,0)/points.length;
  return`${markers}<button class="map-marker-cluster" data-map-cluster="${esc(remaining.map(item=>item.id).join(','))}" style="left:${centerX*100}%;top:${centerY*100}%" aria-label="${remaining.length} Marker anzeigen">${remaining.length}</button>`;
 }).join('');
}
function rerender(){
 const content=$('#content');if(!content)return;
 content.innerHTML=pageMap();
 mapTransforms();
 syncMarkerSize();
 attachImageHooks();
}
function syncMarkerSize(){
 const size=clamp(Number(mapSettings().markerSize)||28,18,48);
 document.documentElement.style.setProperty('--map-marker-size',`${size}px`);
}
function attachImageHooks(){
 const image=$('[data-map-image]');
 if(!image)return;
 image.onload=()=>{$('[data-map-image-notice]')?.setAttribute('hidden','');mapTransforms()};
 image.onerror=()=>{$('[data-map-image-notice]')?.removeAttribute('hidden')};
 if(image.complete&&image.naturalWidth)mapTransforms();
 if(typeof ResizeObserver==='function'){
  if(viewObserver)viewObserver.disconnect();
  const stage=$('[data-map-stage]');
  if(stage){viewObserver=new ResizeObserver(()=>mapTransforms());viewObserver.observe(stage)}
 }
}
function updateMapSearch(){
 const query=String(activeCharacter()?.mapFilters?.query||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 document.querySelectorAll('[data-map-searchable]').forEach(item=>{item.hidden=Boolean(query&&!item.dataset.mapSearchable.includes(query))});
}
function updateCoordinates(clientX,clientY){
 const point=pointFromClient(clientX,clientY);if(!point)return;
 const image=$('[data-map-image]'),width=image?.naturalWidth||6144,height=image?.naturalHeight||9216;
 const coordinate=calibrationValid()?engine.imageToGta(point.x,point.y,currentCalibration()):null;
 const output=$('[data-map-coordinates]');
 if(output)output.textContent=coordinate?`GTA X ${coordinate.x.toFixed(2)} · Y ${coordinate.y.toFixed(2)} · Bild ${Math.round(point.x*width)}, ${Math.round(point.y*height)}`:`Bild X ${(point.x*100).toFixed(2)}% · Y ${(point.y*100).toFixed(2)}% · ${Math.round(point.x*width)}, ${Math.round(point.y*height)}`;
}
function save(){
 if(!persist())return false;
 toast('Kartenänderungen gespeichert.');
 return true;
}
function closeEditor(){ui.mapEditing=null;ui.mapDraft=null;rerender()}
function readForm(form){
 const values=new FormData(form),get=name=>values.get(name);
 return{get,values};
}
function handleSubmit(form){
 if(!form?.dataset?.form?.startsWith('map-'))return false;
 const kind=form.dataset.form,{get}=readForm(form),current=activeCharacter();
 try{
  if(kind==='map-marker'){
   if(!current){toast('Erstelle zuerst einen Charakter.',true);return true}
   const title=String(get('title')||'').trim(),categoryName=String(get('category')||'Sonstiges'),x=normalizedNumber(get('x')),y=normalizedNumber(get('y'));
   if(!title||!Number.isFinite(x)||!Number.isFinite(y)){toast('Bitte Titel und gültige Kartenkoordinaten eingeben.',true);return true}
   const old=form.dataset.id?entity(form.dataset.id):null;
   const wantsGta=calibrationValid()&&get('coordinateSystem')==='gta';
   let image;
   if(wantsGta){image=engine.gtaToImage(x,y,currentCalibration());if(image.x<0||image.x>1||image.y<0||image.y>1){toast('Die GTA-Koordinaten liegen außerhalb der Karte.',true);return true}}
   else{
    image={x:x/100,y:y/100};
    if(image.x<0||image.x>1||image.y<0||image.y>1){toast('Bildkoordinaten müssen zwischen 0 und 100 Prozent liegen.',true);return true}
   }
   const coordinateSystem=wantsGta?'gta':'image';
   const fields={
    name:title,category:categoryName,description:String(get('description')||'').trim(),
    color:colorValue(get('color'),category(categoryName).color),icon:String(get('icon')||category(categoryName).icon),customStyle:get('customStyle')==='on',
    eventDate:String(get('eventDate')||''),visibility:get('visibility')==='shared'?'shared':'private',
    coordinates:coordinateSystem==='gta'?markerCoordinates({coordinateSystem:'gta',gtaX:x,gtaY:y,gtaZ:get('z')},image):{system:'image',x:image.x,y:image.y},
    x:image.x*100,y:image.y*100,
    ...(old?{favorite:Boolean(old.fields.favorite),hidden:Boolean(old.fields.hidden)}:{})
   };
   let marker=old;
   if(old){Object.assign(old.fields,fields);old.charId=fields.visibility==='shared'?null:current.id;old.updatedAt=new Date().toISOString()}
   else marker=createEntity('location',fields.visibility==='shared'?null:current.id,fields);
   for(const type of ['case','vehicle','person','organization','event','board']){
    const targetId=get(`link-${type}`),existing=linkedItems(marker.id).filter(item=>item.type===type);
    for(const linked of existing){const relationship=rp.db.relationships.find(link=>(link.sourceId===marker.id&&link.targetId===linked.id)||(link.targetId===marker.id&&link.sourceId===linked.id));if(linked.id!==targetId&&relationship)rp.unlinkRelationship(relationship.id)}
    if(targetId&&!linkedItems(marker.id).some(item=>item.id===targetId))linkEntities(marker.id,targetId,`Kartenmarker: ${type}`);
   }
   ui.mapSelectedMarker=marker.id;ui.mapEditing=null;ui.mapDraft=null;save();rerender();return true;
  }
  if(kind==='map-jump'){
   if(!calibrationValid()){toast('Für GTA-Koordinaten ist zuerst eine gültige Kalibrierung mit drei Referenzpunkten erforderlich.',true);return true}
   const x=normalizedNumber(get('gtaX')),y=normalizedNumber(get('gtaY'));
   if(!Number.isFinite(x)||!Number.isFinite(y)){toast('Bitte gültige GTA-X- und GTA-Y-Werte eingeben. Komma oder Punkt sind als Dezimaltrennzeichen erlaubt.',true);return true}
   const point=engine.gtaToImage(x,y,currentCalibration());
   if(point.x<0||point.x>1||point.y<0||point.y>1){toast('Diese Koordinaten liegen außerhalb des Kartenbilds.',true);return true}
   ui.mapJump={x,y};ui.mapDraft=null;ui.mapSelectedMarker=null;panTo(point.x,point.y);save();rerender();return true;
  }
  if(kind==='map-reference'){
   const point=ui.mapPendingReference,x=normalizedNumber(get('gtaX')),y=normalizedNumber(get('gtaY'));
   if(!point||!Number.isFinite(x)||!Number.isFinite(y)){toast('Bitte einen Kartenpunkt auswählen und gültige GTA-X/Y-Referenzwerte eingeben.',true);return true}
   current.mapCalibration=current.mapCalibration||{points:[]};
   current.mapCalibration.points.push({imageX:point.x,imageY:point.y,gtaX:x,gtaY:y});
   delete current.mapCalibration.transform;delete current.mapCalibration.meanError;delete current.mapCalibration.maxError;
   ui.mapPendingReference=null;save();rerender();return true;
  }
  if(kind==='map-test-point'){
   const x=normalizedNumber(get('gtaX')),y=normalizedNumber(get('gtaY')),imageX=normalizedNumber(get('imageX'))/100,imageY=normalizedNumber(get('imageY'))/100;
   if(![x,y,imageX,imageY].every(Number.isFinite)||imageX<0||imageX>1||imageY<0||imageY>1){toast('Bitte gültige Testkoordinaten eingeben.',true);return true}
   const actual=engine.gtaToImage(x,y,currentCalibration());ui.mapTestError=Math.hypot((actual.x-imageX)*100,(actual.y-imageY)*100);rerender();return true;
  }
  if(kind==='map-shape'){
   const drawing=ui.mapDrawing,name=String(get('name')||'').trim();
   if(!drawing||!name||drawing.points.length<(drawing.type==='area'?3:2)){toast('Bitte Namen und ausreichend Kartenpunkte angeben.',true);return true}
   const collection=drawing.type==='area'?'mapAreas':'mapRoutes';
   current[collection]=current[collection]||[];
   current[collection].push({id:rp.uid(drawing.type),name,description:String(get('description')||''),color:colorValue(get('color')),points:drawing.points.map(point=>{const gta=calibrationValid()?engine.imageToGta(point.x,point.y,currentCalibration()):null;return{...point,...(gta?{gtaX:gta.x,gtaY:gta.y}:{})}}),visible:true,...(drawing.type==='area'?{opacity:clamp(Number(get('opacity'))||mapSettings().areaOpacity||0.25,0.05,0.8)}:{width:clamp(Number(get('width'))||mapSettings().routeWidth||4,1,16)})});
   ui.mapDrawing=null;ui.mapSelectedShape=current[collection].at(-1).id;save();rerender();return true;
  }
  if(kind==='map-settings'){
   const values=readForm(form).values;
   current.mapSettings={
    markerSize:clamp(Number(get('markerSize'))||28,18,48),labels:values.has('labels'),
    markerScale:values.has('markerScale'),showCoordinates:values.has('showCoordinates'),
    animations:values.has('animations'),boundaries:values.has('boundaries'),cluster:values.has('cluster'),
    areaOpacity:clamp(Number(get('areaOpacity'))||0.25,0.05,0.8),routeWidth:clamp(Number(get('routeWidth'))||4,1,16),
    zoomSpeed:clamp(Number(get('zoomSpeed'))||0.15,0.05,0.5),minZoom:clamp(Number(get('minZoom'))||1,0.5,1),
    maxZoom:clamp(Number(get('maxZoom'))||6,2,12),background:colorValue(get('background'),'#101722')
   };
   current.mapCategoryStyles=Object.fromEntries(CATEGORIES.map((item,index)=>[item.name,{color:colorValue(get(`categoryColor${index}`),item.color),icon:ICONS.includes(String(get(`categoryIcon${index}`)))?String(get(`categoryIcon${index}`)):item.icon}]));
   current.mapDataVersion=1;
   save();rerender();return true;
  }
 }catch(error){toast(error.message||'Kartenänderung fehlgeschlagen.',true);return true}
 return false;
}
function startDrawing(type){
 ui.mapCalibrationMode=false;ui.mapAddMode=false;ui.mapDrawing={type,points:[]};rerender();
}
function removeShape(kind,id){
 const current=activeCharacter(),collection=kind==='area'?'mapAreas':'mapRoutes';
 current[collection]=(current[collection]||[]).filter(item=>item.id!==id);
 if(ui.mapSelectedShape===id){ui.mapSelectedShape=null;ui.mapVertexEdit=false}
 save();rerender();
}
function exportMap(){
 const current=activeCharacter(),markers=allMapItems(current?.id).map(item=>{
  const copy=JSON.parse(JSON.stringify(item));
  if(!copy.fields.coordinates){const point=imagePosition(item);if(point)copy.fields.coordinates={system:'image',x:point.x,y:point.y}}
  return copy;
 }),markerIds=new Set(markers.map(item=>item.id)),backup={
  format:'rp-desk-map',version:1,characterId:current.id,exportedAt:new Date().toISOString(),
  mapDataVersion:1,categoryStyles:JSON.parse(JSON.stringify(current.mapCategoryStyles||{})),markers,
  relationships:db.relationships.filter(link=>markerIds.has(link.sourceId)||markerIds.has(link.targetId)).map(link=>JSON.parse(JSON.stringify(link))),
  areas:JSON.parse(JSON.stringify(current.mapAreas||[])),routes:JSON.parse(JSON.stringify(current.mapRoutes||[])),
  calibration:JSON.parse(JSON.stringify(current.mapCalibration||null)),settings:JSON.parse(JSON.stringify(current.mapSettings||{})),
  filters:JSON.parse(JSON.stringify(current.mapFilters||{})),view:JSON.parse(JSON.stringify(current.mapView||{}))
 };
 download(`rp-desk-karte-${current.name.replace(/[^a-z0-9_-]/gi,'-')}-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(backup,null,2),'application/json');
 toast('Karten-Backup exportiert.');
}
function validMapImport(data){
 if(!data||data.format!=='rp-desk-map'||data.version!==1||!Array.isArray(data.markers)||!Array.isArray(data.areas)||!Array.isArray(data.routes)||(data.relationships!==undefined&&!Array.isArray(data.relationships)))return false;
 const validPoint=point=>point&&Number.isFinite(Number(point.x))&&Number.isFinite(Number(point.y))&&Number(point.x)>=0&&Number(point.x)<=1&&Number(point.y)>=0&&Number(point.y)<=1;
 if(!data.markers.every(item=>item?.type==='location'&&typeof item.id==='string'&&item.id&&item.fields&&typeof item.fields.name==='string'&&(
  (['image','gta'].includes(item.fields.coordinates?.system)&&Number.isFinite(Number(item.fields.coordinates.x))&&Number.isFinite(Number(item.fields.coordinates.y)))||
  (Number.isFinite(Number(item.fields.x))&&Number.isFinite(Number(item.fields.y))&&Number(item.fields.x)>=0&&Number(item.fields.x)<=100&&Number(item.fields.y)>=0&&Number(item.fields.y)<=100)
  )))return false;
 if(!data.areas.every(item=>typeof item?.id==='string'&&typeof item.name==='string'&&Array.isArray(item.points)&&item.points.length>=3&&item.points.every(validPoint)))return false;
 if(!data.routes.every(item=>typeof item?.id==='string'&&typeof item.name==='string'&&Array.isArray(item.points)&&item.points.length>=2&&item.points.every(validPoint)))return false;
 if(data.calibration&&(!Array.isArray(data.calibration.points)||data.calibration.points.length<3||data.calibration.points.some(point=>!['imageX','imageY','gtaX','gtaY'].every(key=>Number.isFinite(Number(point[key]))))))return false;
 const ids=[...data.markers,...data.areas,...data.routes].map(item=>item.id),relationshipIds=(data.relationships||[]).map(item=>item.id);
 if(new Set(ids).size!==ids.length||new Set(relationshipIds).size!==relationshipIds.length)return false;
 return(data.relationships||[]).every(link=>typeof link.id==='string'&&typeof link.sourceId==='string'&&typeof link.targetId==='string'&&typeof link.type==='string');
}
async function importMap(file){
 if(!file)return;
 try{
  if(file.size>MAX_FILE_SIZE)throw new Error('Das Karten-Backup ist größer als 10 MB.');
  const incoming=JSON.parse(await file.text());
  if(!validMapImport(incoming))throw new Error('Ungültiges Karten-Backup oder inkompatibles Format.');
  const current=activeCharacter(),existingById=new Map(db.entities.map(item=>[item.id,item])),existingIds=new Set(existingById.keys());
  for(const marker of incoming.markers){const match=existingById.get(marker.id);if(match&&match.type!=='location')throw new Error(`Die Marker-ID „${marker.id}“ ist bereits durch einen anderen Datensatz belegt.`)}
  const added=incoming.markers.filter(item=>!existingIds.has(item.id)).map(item=>({...item,charId:item.charId===null?null:current.id}));
  const allIds=new Set([...existingIds,...incoming.markers.map(item=>item.id)]);
  const existingRelationshipIds=new Set(db.relationships.map(item=>item.id));
  for(const link of incoming.relationships||[])if(!allIds.has(link.sourceId)||!allIds.has(link.targetId))throw new Error(`Verknüpfung „${link.id}“ verweist auf einen nicht vorhandenen Datensatz.`);
  const newRelationships=(incoming.relationships||[]).filter(link=>!existingRelationshipIds.has(link.id)).map(link=>({...link}));
  const nextAreas=[...(current.mapAreas||[]),...incoming.areas.filter(item=>!(current.mapAreas||[]).some(existingItem=>existingItem.id===item.id))];
  const nextRoutes=[...(current.mapRoutes||[]),...incoming.routes.filter(item=>!(current.mapRoutes||[]).some(existingItem=>existingItem.id===item.id))];
  const nextCalibration=incoming.calibration?{points:incoming.calibration.points,transform:engine.fitAffine(incoming.calibration.points)}:current.mapCalibration;
  const nextEntities=[...db.entities,...added],nextRelationships=[...db.relationships,...newRelationships];
  const mapKeys=['mapDataVersion','mapAreas','mapRoutes','mapCalibration','mapSettings','mapFilters','mapView','mapCategoryStyles'];
  const previousMapState=Object.fromEntries(mapKeys.map(key=>[key,{exists:Object.prototype.hasOwnProperty.call(current,key),value:current[key]}]));
  const previousEntities=db.entities,previousRelationships=db.relationships;
  db.entities=nextEntities;db.relationships=nextRelationships;
  current.mapDataVersion=1;current.mapAreas=nextAreas;current.mapRoutes=nextRoutes;
  if(incoming.calibration)current.mapCalibration=nextCalibration;
  if(incoming.settings)current.mapSettings=incoming.settings;
  if(incoming.filters)current.mapFilters=incoming.filters;
  if(incoming.view)current.mapView=incoming.view;
  if(incoming.categoryStyles)current.mapCategoryStyles=incoming.categoryStyles;
  if(!persist()){
   db.entities=previousEntities;db.relationships=previousRelationships;
   for(const[key,state]of Object.entries(previousMapState)){if(state.exists)current[key]=state.value;else delete current[key]}
   throw new Error('Die importierten Kartendaten konnten nicht gespeichert werden.');
  }
  toast(`Karten-Backup importiert; ${added.length} neue Marker übernommen.`);
  rerender();
 }catch(error){toast(`Karten-Backup nicht importiert: ${error.message}`,true)}
}
function handleAction(button){
 const action=button.dataset.mapAction,id=button.dataset.id,current=activeCharacter();
 if(!action)return false;
 const selected=entity(id||ui.mapSelectedMarker);
 if(action==='fullscreen'){const stage=$('[data-map-stage]');if(!document.fullscreenElement)stage?.requestFullscreen?.().catch(error=>toast(`Vollbild nicht verfügbar: ${error.message}`,true));else document.exitFullscreen?.();return true}
 if(action==='import'){$('[data-map-import]')?.click();return true}
 if(action==='export'){exportMap();return true}
 if(action==='zoom-in'||action==='zoom-out'){
  const stage=$('[data-map-stage]');if(stage){const rect=stage.getBoundingClientRect(),view=mapView(),step=Number(mapSettings().zoomSpeed)||0.15;zoomAt(rect.left+rect.width/2,rect.top+rect.height/2,(Number(view.zoom)||1)*(1+(action==='zoom-in'?step:-step)))}return true;
 }
 if(action==='zoom-reset'||action==='view-reset'){current.mapView={zoom:1,panX:0,panY:0};mapTransforms();save();return true}
 if(action==='fullscreen')return true;
 if(action==='favorite-filter'){current.mapFilters={...(current.mapFilters||{}),favoritesOnly:!current.mapFilters?.favoritesOnly};rerender();return true}
 if(action==='hidden-filter'){current.mapFilters={...(current.mapFilters||{}),includeHidden:!current.mapFilters?.includeHidden};rerender();return true}
 if(action==='edit-toggle'){ui.mapEditMode=!ui.mapEditMode;rerender();return true}
 if(action==='coordinate-marker'){
  const coordinates=ui.mapJump,point=coordinates&&engine.gtaToImage(coordinates.x,coordinates.y,currentCalibration());
  if(point){ui.mapDraft=point;ui.mapEditing=null;panTo(point.x,point.y);rerender()}return true;
 }
 if(action==='close-editor'||action==='cancel-edit'){closeEditor();return true}
 if(action==='close-details'){ui.mapSelectedMarker=null;ui.mapDetailsClosed=true;rerender();return true}
 if(action==='marker-add'){ui.mapAddMode=!ui.mapAddMode;ui.mapDraft=null;ui.mapEditing=null;rerender();return true}
 if(action==='map-edit'||action==='map-center'||action==='map-copy-coordinates'||action==='map-delete'||action==='map-duplicate'||action==='map-favorite'||action==='map-hide'){
  if(!selected)return true;
  if(action==='map-edit'){ui.mapEditing=selected.id;ui.mapSelectedMarker=selected.id;ui.mapDetailsClosed=false;ui.mapDraft=null;rerender();return true}
  if(action==='map-center'){const point=imagePosition(selected);if(point){ui.mapSelectedMarker=selected.id;panTo(point.x,point.y)}return true}
  if(action==='map-copy-coordinates'){copyText(coordinateText(selected));return true}
  if(action==='map-duplicate'||action==='duplicate'){
   const copy=createEntity('location',selected.charId,{...selected.fields,name:`${selected.fields.name} – Kopie`,coordinates:{...selected.fields.coordinates}});
   const point=imagePosition(selected);if(point){ui.mapDraft=point;ui.mapEditing=copy.id;ui.mapSelectedMarker=copy.id;rerender()}
   return true;
  }
  if(action==='map-favorite'){selected.fields.favorite=!selected.fields.favorite;selected.updatedAt=new Date().toISOString();save();rerender();return true}
  if(action==='map-hide'){selected.fields.hidden=!selected.fields.hidden;selected.updatedAt=new Date().toISOString();save();rerender();return true}
  if(action==='map-delete'){
   if(!confirm(`Marker „${entityLabel(selected)}“ endgültig löschen? Verknüpfte Datensätze bleiben erhalten.`))return true;
   db.entities=db.entities.filter(item=>item.id!==selected.id);db.relationships=db.relationships.filter(link=>link.sourceId!==selected.id&&link.targetId!==selected.id);ui.mapSelectedMarker=null;save();rerender();return true;
  }
 }
 if(action==='calibration-mode'){ui.mapCalibrationMode=!ui.mapCalibrationMode;ui.mapAddMode=false;ui.mapDrawing=null;rerender();return true}
 if(action==='reference-cancel'){ui.mapPendingReference=null;rerender();return true}
 if(action==='reference-delete'){
  const points=current.mapCalibration?.points||[];points.splice(Number(button.dataset.index),1);delete current.mapCalibration.transform;delete current.mapCalibration.meanError;delete current.mapCalibration.maxError;save();rerender();return true;
 }
 if(action==='calibration-reset'){if(confirm('Alle gespeicherten Referenzpunkte und die GTA-Kalibrierung entfernen?')){current.mapCalibration={points:[]};save();rerender()}return true}
 if(action==='calibration-fit'){
  try{
   const points=current.mapCalibration?.points||[],transform=engine.fitAffine(points);
   current.mapCalibration={points:JSON.parse(JSON.stringify(points)),transform};
   save();toast(`Kalibrierung berechnet: Ø ${transform.meanError.toFixed(2)}, max. ${transform.maxError.toFixed(2)} GTA-Einheiten.`);rerender();
  }catch(error){toast(`Kalibrierung nicht berechnet: ${error.message}`,true)}return true;
 }
 if(action==='draw-area'||action==='draw-route'){startDrawing(action==='draw-area'?'area':'route');return true}
 if(action==='draw-undo'){ui.mapDrawing?.points.pop();rerender();return true}
 if(action==='draw-cancel'){ui.mapDrawing=null;rerender();return true}
 if(action==='shape-select'){
  ui.mapSelectedShape=id;ui.mapSelectedMarker=null;ui.mapDetailsClosed=true;rerender();return true;
 }
 if(action==='shape-edit'){
  const wasSelected=ui.mapSelectedShape===id;ui.mapSelectedShape=id;ui.mapVertexEdit=wasSelected?!ui.mapVertexEdit:true;rerender();return true;
 }
 if(action==='shape-visibility'){
  const collection=button.dataset.kind==='area'?'mapAreas':'mapRoutes',shape=(current[collection]||[]).find(item=>item.id===id);if(shape){shape.visible=shape.visible===false;save();rerender()}return true;
 }
 if(action==='shape-delete'){
  if(confirm('Dieses Kartenobjekt endgültig löschen?'))removeShape(button.dataset.kind,id);return true;
 }
 if(action==='vertex-delete'){
  const shape=[...(current.mapAreas||[]),...(current.mapRoutes||[])].find(item=>item.id===id),index=Number(button.dataset.index);
  if(shape&&shape.points.length>(current.mapAreas?.includes(shape)?3:2)){shape.points.splice(index,1);save();rerender()}return true;
 }
 return false;
}
function handleClick(event){
 if(ui.page!=='map')return false;
 if(suppressMapClick){suppressMapClick=false;event.preventDefault();return true}
 const button=event.target.closest?.('[data-map-action]');if(button&&handleAction(button)){event.preventDefault();return true}
 const activeStage=event.target.closest?.('[data-map-stage]');
 if(activeStage&&(ui.mapCalibrationMode||ui.mapDrawing||ui.mapAddMode||(ui.mapVertexEdit&&ui.mapSelectedShape))){
  const point=pointFromClient(event.clientX,event.clientY);if(!point)return true;
  if(ui.mapCalibrationMode){ui.mapPendingReference=point;rerender();return true}
  if(ui.mapDrawing){ui.mapDrawing.points.push(point);rerender();return true}
  if(ui.mapAddMode){ui.mapDraft=point;ui.mapEditing=null;ui.mapAddMode=false;rerender();return true}
  const shape=[...(activeCharacter().mapAreas||[]),...(activeCharacter().mapRoutes||[])].find(item=>item.id===ui.mapSelectedShape);
  if(shape){const gta=calibrationValid()?engine.imageToGta(point.x,point.y,currentCalibration()):null;shape.points.push({...point,...(gta?{gtaX:gta.x,gtaY:gta.y}:{})});save();rerender()}
  return true;
 }
 const marker=event.target.closest?.('[data-map-marker]');if(marker){ui.mapSelectedMarker=marker.dataset.mapMarker;ui.mapDetailsClosed=false;ui.mapSelectedShape=null;ui.mapEditing=null;rerender();return true}
 const shapeList=event.target.closest?.('[data-map-shape-select]');if(shapeList){ui.mapSelectedShape=shapeList.dataset.mapShapeSelect;ui.mapSelectedMarker=null;ui.mapDetailsClosed=true;rerender();return true}
 const cluster=event.target.closest?.('[data-map-cluster]');if(cluster){const ids=cluster.dataset.mapCluster.split(','),targets=ids.map(entity).filter(Boolean),points=targets.map(imagePosition).filter(Boolean);if(ids.length){ids.forEach(id=>expandedMarkerIds.add(id));ui.mapSelectedMarker=ids[0];ui.mapDetailsClosed=false;ui.mapFilters={...(activeCharacter().mapFilters||{}),query:''};rerender();if(points.length){const centerX=points.reduce((sum,point)=>sum+point.x,0)/points.length,centerY=points.reduce((sum,point)=>sum+point.y,0)/points.length,view=mapView(),settings=mapSettings();panTo(centerX,centerY,clamp((Number(view.zoom)||1)*2,Number(settings.minZoom)||1,Number(settings.maxZoom)||6))}}return true}
 const list=event.target.closest?.('[data-map-list]');if(list){const item=entity(list.dataset.mapList),point=item&&imagePosition(item);ui.mapSelectedMarker=item?.id||null;ui.mapDetailsClosed=false;if(point)panTo(point.x,point.y);rerender();return true}
 const shape=event.target.closest?.('[data-map-shape-id]');if(shape&&!event.target.matches?.('[data-map-vertex]')){ui.mapSelectedShape=shape.dataset.mapShapeId;ui.mapSelectedMarker=null;rerender();return true}
 const stage=event.target.closest?.('[data-map-stage]');if(stage)return true;
 return false;
}
function handleInput(event){
 if(ui.page!=='map')return false;
 const target=event.target;
 if(target.matches?.('[data-map-search]')){
  const current=activeCharacter();current.mapFilters={...(current.mapFilters||{}),query:target.value};updateMapSearch();return true;
 }
 if(target.matches?.('[data-map-zoom-input]')){
  const stage=$('[data-map-stage]');if(stage){const rect=stage.getBoundingClientRect();zoomAt(rect.left+rect.width/2,rect.top+rect.height/2,Number(target.value))}return true;
 }
 return false;
}
function handleChange(event){
 if(ui.page!=='map')return false;
 const target=event.target,current=activeCharacter(),filters={...(current.mapFilters||{})};
 if(target.name==='coordinateSystem'){
  const form=target.closest('[data-form="map-marker"]'),xInput=form?.querySelector('[name="x"]'),yInput=form?.querySelector('[name="y"]');
  if(!xInput||!yInput)return true;
  const toGta=target.value==='gta',x=normalizedNumber(xInput.value),y=normalizedNumber(yInput.value),item=form.dataset.id?entity(form.dataset.id):null;
  if(Number.isFinite(x)&&Number.isFinite(y)){
   const point=toGta?engine.imageToGta(x/100,y/100,currentCalibration()):engine.gtaToImage(x,y,currentCalibration());
   xInput.value=String(Number((toGta?point.x:point.x*100).toFixed(3)));yInput.value=String(Number((toGta?point.y:point.y*100).toFixed(3)));
  }
  form.querySelector('[data-map-coordinate-label="x"]').textContent=toGta?'GTA-X':'Bild-X (%)';
  form.querySelector('[data-map-coordinate-label="y"]').textContent=toGta?'GTA-Y':'Bild-Y (%)';
  return true;
 }
 if(target.matches?.('[data-map-category]'))filters.category=target.value;
 else if(target.matches?.('[data-map-group]'))filters.groupId=target.value;
 else if(target.matches?.('[data-map-owner]'))filters.owner=target.value;
 else if(target.matches?.('[data-map-character]'))filters.characterId=target.value;
 else if(target.matches?.('[data-map-date-from]'))filters.dateFrom=target.value;
 else if(target.matches?.('[data-map-date-to]'))filters.dateTo=target.value;
 else if(target.matches?.('[data-map-import]')){importMap(target.files?.[0]);target.value='';return true}
 else return false;
 current.mapFilters=filters;persist();rerender();return true;
}
function handlePointerDown(event){
 if(ui.page!=='map')return false;
 const stage=event.target.closest?.('[data-map-stage]');if(!stage)return false;
 const vertex=event.target.closest?.('[data-map-vertex]'),marker=event.target.closest?.('[data-map-marker]');
 if(ui.mapAddMode||ui.mapCalibrationMode||ui.mapDrawing)return true;
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 stage.setPointerCapture?.(event.pointerId);
 if(pointers.size===2){
  const points=[...pointers.values()],view=mapView();gesture={type:'pinch',distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),zoom:Number(view.zoom)||1,panX:Number(view.panX)||0,panY:Number(view.panY)||0,midX:(points[0].x+points[1].x)/2,midY:(points[0].y+points[1].y)/2};
  event.preventDefault();return true;
 }
 if(vertex&&ui.mapVertexEdit){gesture={type:'vertex',pointerId:event.pointerId,id:vertex.dataset.mapShapeId,index:Number(vertex.dataset.mapVertex),x:event.clientX,y:event.clientY};event.preventDefault();return true}
 if(marker&&ui.mapEditMode){gesture={type:'marker',pointerId:event.pointerId,id:marker.dataset.mapMarker,x:event.clientX,y:event.clientY};event.preventDefault();return true}
 if(event.button===2||event.button===1||event.target.closest?.('[data-map-world]')){gesture={type:'pan',pointerId:event.pointerId,x:event.clientX,y:event.clientY,panX:Number(mapView().panX)||0,panY:Number(mapView().panY)||0};event.preventDefault();return true}
 return true;
}
function handlePointerMove(event){
 if(ui.page!=='map')return false;
 updateCoordinates(event.clientX,event.clientY);
 if(!pointers.has(event.pointerId))return false;
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 if(pointers.size===2&&gesture?.type==='pinch'){
  const points=[...pointers.values()],distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),midX=(points[0].x+points[1].x)/2,midY=(points[0].y+points[1].y)/2;
  const stage=$('[data-map-stage]'),rect=stage?.getBoundingClientRect(),settings=mapSettings();
  if(rect){
   const oldZoom=gesture.zoom,newZoom=clamp(gesture.zoom*distance/Math.max(1,gesture.distance),Number(settings.minZoom)||1,Number(settings.maxZoom)||6);
   const worldX=0.5+(gesture.midX-rect.left-rect.width/2-gesture.panX)/($('[data-map-world]').offsetWidth*oldZoom);
   const worldY=0.5+(gesture.midY-rect.top-rect.height/2-gesture.panY)/($('[data-map-world]').offsetHeight*oldZoom);
   const current=activeCharacter();current.mapView={zoom:newZoom,panX:midX-rect.left-rect.width/2-(worldX-0.5)*$('[data-map-world]').offsetWidth*newZoom,panY:midY-rect.top-rect.height/2-(worldY-0.5)*$('[data-map-world]').offsetHeight*newZoom};scheduleTransform();
  }
  event.preventDefault();return true;
 }
 if(!gesture||gesture.pointerId!==event.pointerId)return true;
 if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>3)gesture.moved=true;
 const point=pointFromClient(event.clientX,event.clientY);
 if(gesture.type==='pan'){
  const current=activeCharacter();current.mapView={...(current.mapView||{}),panX:gesture.panX+event.clientX-gesture.x,panY:gesture.panY+event.clientY-gesture.y};scheduleTransform();
 }else if(point&&gesture.type==='marker'){
  ui.mapDragPosition=point;const marker=Array.from(document.querySelectorAll('[data-map-marker]')).find(item=>item.dataset.mapMarker===gesture.id);if(marker){marker.style.left=`${point.x*100}%`;marker.style.top=`${point.y*100}%`}
 }else if(point&&gesture.type==='vertex'){
  const shape=[...(activeCharacter().mapAreas||[]),...(activeCharacter().mapRoutes||[])].find(item=>item.id===gesture.id);if(shape?.points[gesture.index]){const gta=calibrationValid()?engine.imageToGta(point.x,point.y,currentCalibration()):null;shape.points[gesture.index]={...point,...(gta?{gtaX:gta.x,gtaY:gta.y}:{})};const overlay=$('.map-overlay');if(overlay){const selected=[...(activeCharacter().mapAreas||[]),...(activeCharacter().mapRoutes||[])].find(item=>item.id===ui.mapSelectedShape);overlay.innerHTML=`<defs><marker id="map-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs>${polygonMarkup(activeCharacter().mapAreas||[],selected)}${routeMarkup(activeCharacter().mapRoutes||[],selected)}`}}
 }
 event.preventDefault();return true;
}
function handlePointerUp(event){
 if(ui.page!=='map')return false;
 pointers.delete(event.pointerId);
 if(gesture?.type==='pinch'){if(pointers.size<2){gesture=null;save()}return true}
 if(!gesture||gesture.pointerId!==event.pointerId)return false;
 const completed=gesture;gesture=null;
 if(completed.moved||completed.type==='vertex'){suppressMapClick=true;setTimeout(()=>{suppressMapClick=false},0)}
 if(completed.type==='marker'&&ui.mapDragPosition){
  const item=entity(completed.id),point=ui.mapDragPosition;
  if(item){const previous=item.fields.coordinates||{},gta=previous.system==='gta'&&calibrationValid()?engine.imageToGta(point.x,point.y,currentCalibration()):null;item.fields.coordinates=gta?{system:'gta',...gta,...(Number.isFinite(Number(previous.z))?{z:Number(previous.z)}:{})}:{system:'image',x:point.x,y:point.y};item.fields.x=point.x*100;item.fields.y=point.y*100;item.updatedAt=new Date().toISOString();save();rerender()}
  ui.mapDragPosition=null;
 }else if(completed.type==='vertex'||(completed.type==='pan'&&completed.moved)){save()}
 return true;
}
function handleWheel(event){
 if(ui.page!=='map'||!event.target.closest?.('[data-map-stage]'))return false;
 event.preventDefault();
 const view=mapView(),settings=mapSettings(),step=Number(settings.zoomSpeed)||0.15;
 zoomAt(event.clientX,event.clientY,(Number(view.zoom)||1)*(event.deltaY<0?1+step:1-step));return true;
}
function handleDoubleClick(event){
 if(ui.page!=='map'||!event.target.closest?.('[data-map-stage]'))return false;
 event.preventDefault();const step=Number(mapSettings().zoomSpeed)||0.15;zoomAt(event.clientX,event.clientY,(Number(mapView().zoom)||1)*(1+step*2));return true;
}
function handleKeydown(event){
 if(ui.page!=='map')return false;
 if(event.key==='Escape'){
  if(ui.mapDrawing){ui.mapDrawing=null;rerender();return true}
  if(ui.mapEditing||ui.mapDraft){closeEditor();return true}
  if(ui.mapCalibrationMode){ui.mapCalibrationMode=false;rerender();return true}
  if(ui.mapAddMode){ui.mapAddMode=false;ui.mapDraft=null;rerender();return true}
 }
 const stage=event.target?.closest?.('[data-map-stage]')|| (document.activeElement?.matches?.('[data-map-stage]')?document.activeElement:null);
 if(!stage||event.target?.matches?.('input,select,textarea,[contenteditable="true"]')||event.target?.closest?.('button'))return false;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
  const view=mapView(),step=event.shiftKey?100:40,current=activeCharacter();
  current.mapView={...(current.mapView||{}),panX:(Number(view.panX)||0)+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),panY:(Number(view.panY)||0)+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)};
  event.preventDefault();scheduleTransform();scheduleViewSave();return true;
 }
 if(['+','=','-','0'].includes(event.key)){
  if(event.key==='0'){currentCharacter().mapView={zoom:1,panX:0,panY:0};scheduleTransform();scheduleViewSave()}
  else{const rect=stage.getBoundingClientRect(),factor=Number(mapSettings().zoomSpeed)||0.15;zoomAt(rect.left+rect.width/2,rect.top+rect.height/2,(Number(mapView().zoom)||1)*(event.key==='-'?1-factor:1+factor))}
  event.preventDefault();return true;
 }
 return false;
}
function init(){
 if(typeof window.addEventListener==='function')window.addEventListener('resize',()=>{if(ui.page==='map')mapTransforms()});
 if(typeof document.addEventListener==='function')document.addEventListener('fullscreenchange',()=>{if(ui.page==='map')mapTransforms()});
}
function readMapBackup(file){return importMap(file)}

init();
return{pageMap,afterRender(){if(ui.page==='map'){mapTransforms();syncMarkerSize();attachImageHooks()}},handleSubmit,handleAction,handleClick,handleInput,handleChange,handlePointerDown,handlePointerMove,handlePointerUp,handleWheel,handleDoubleClick,handleKeydown,readMapBackup,fitAffine:engine.fitAffine};
})();
