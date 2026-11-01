window.RPDeskPages = window.RPDeskPages || {};
window.RPDeskPages.investigations = (() => {
'use strict';
const {CATEGORIES,TITLES,ICONS,ico,$,esc,id,today,datetimeLocal,formatDate,fmtMoney,empty,field,textareaField,btn,head,uid,THEME_PRESETS,hexToRgb,rgbToHex,mixColors,applyTheme,compressImage,defaultSnippetsForChar,defaultData,REQUIRED_COLLECTIONS,OPTIONAL_COLLECTIONS,validImport,normalizeData,load,db,ui,persist,toast,char,scoped,collectionItem,sel,layoutBoardImages,openImageViewer,updateImageViewer,changeImageZoom,copyText,fallbackCopy,download,dataField,status,val,headlinePanel,listPane,renderDateTimeMeta,badge}=window.RPDesk;
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
function evidencePairKey(first,second){return [first,second].sort((a,b)=>a.localeCompare(b,'de')).join('|')}
function evidenceResultLabel(result){return result==='MATCH'?'Übereinstimmung':result==='DIFFERENT_WEAPON'?'Unterschiedliche Waffe':'Keine Übereinstimmung'}
function evidenceResultKind(result){return result==='MATCH'?'green':result==='DIFFERENT_WEAPON'?'amber':'red'}
function parseEvidenceLabReport(text){
 const sampleLine=text.split(/\r?\n/).find(line=>line.includes('Probennummer:'))||'';
 const ids=[...new Set((sampleLine.match(/#[a-f\d]{7}\b/gi)||[]).map(value=>value.toLowerCase()))];
 if(ids.length<2)return null;
 const lines=text.split(/\r?\n/);
 const typeFor=label=>lines.find(line=>line.includes(label))?.replace(label,'').replace(/\s+Hülse\s*$/,'').trim()||'';
 const resultLine=(lines.find(line=>line.includes('Ergebnis:'))||'').toLocaleLowerCase('de');
 const result=resultLine.includes('unterschiedliche')?'DIFFERENT_WEAPON':resultLine.includes('nicht')?'NO_MATCH':'MATCH';
 return {caseId1:ids[0],caseId2:ids[1],weaponType1:typeFor('Hülse 1:'),weaponType2:typeFor('Hülse 2:'),result};
}
function pageEvidence(){
 const evidence=scoped('evidence');
 const reports=scoped('evidenceReports').sort((a,b)=>(b.importedAt||'').localeCompare(a.importedAt||''));
 const reportsByPair=new Set(reports.map(report=>evidencePairKey(report.caseId1,report.caseId2)));
 const suggestions=[];
 for(let i=0;i<evidence.length;i++){
  for(let j=i+1;j<evidence.length;j++){
   const first=evidence[i],second=evidence[j];
   const type=(first.weaponType||'').trim().toLocaleLowerCase();
   if(!type||type!==(second.weaponType||'').trim().toLocaleLowerCase())continue;
   if(reportsByPair.has(evidencePairKey(first.caseId,second.caseId)))continue;
   suggestions.push([first,second]);
  }
 }
 const reportCount=new Map();
 for(const report of reports){
  reportCount.set(report.caseId1,(reportCount.get(report.caseId1)||0)+1);
  reportCount.set(report.caseId2,(reportCount.get(report.caseId2)||0)+1);
 }
 const evidenceOption=(item,selected)=>`<option value="${esc(item.id)}" ${item.id===selected?'selected':''}>${esc(item.caseId)} · ${esc(item.weaponType||'Unbekannter Waffentyp')}</option>`;
 if(!char())return `${head('Evidence-Vergleich','Hülsen und Laborvergleiche pro Charakter dokumentieren und offene Vergleichspaare im Blick behalten.')}${empty('Lege zuerst unter „Charaktere“ einen Charakter an.')}`;
 return `${head('Evidence-Vergleich','Hülsen erfassen, Laborberichte importieren und Vergleichsergebnisse für deinen Charakter nachvollziehbar festhalten.')}
 <div class="metric-strip evidence-metrics"><div class="metric"><b>${evidence.length}</b><span>ERFASSTE HÜLSEN</span></div><div class="metric"><b>${reports.length}</b><span>VERGLEICHSBERICHTE</span></div><div class="metric"><b>${suggestions.length}</b><span>OFFENE VERGLEICHE</span></div></div>
 <div class="grid evidence-layout">
  <section class="panel panel-pad span-4">${headlinePanel('Evidence erfassen')}<form data-form="evidence-create" class="form-grid">${field('Evidence-ID / Probennummer','caseId','','text','required maxlength="80" placeholder="#a4f2871"')}${field('Waffentyp','weaponType','','text','placeholder="z. B. Pistol"')}${field('Seriennummer','serialNumber','','text')}${field('Tatverdächtige Person','suspect','','text')}${textareaField('Notizen','notes','',3)}<div class="field full"><button class="button">${ico('plus',15)} Evidence speichern</button></div></form>
  <hr class="section-separator">${headlinePanel('Laborbericht importieren')}<form data-form="evidence-report-import" class="form-grid">${textareaField('Berichtstext','reportText','',7,'required placeholder="Laborbericht hier einfügen …"')}<p class="hint full">Probennummer, Hülsentypen und Ergebnis werden aus dem Bericht übernommen. Unbekannte Evidence-IDs werden dabei angelegt.</p><div class="field full"><button class="button button-quiet">Bericht übernehmen</button></div></form></section>
  <section class="panel panel-pad span-8">${headlinePanel('Manueller Vergleich')}<form data-form="evidence-compare" class="form-grid evidence-compare-form"><div class="field"><label for="evidence-case-1">Erste Hülse</label><select id="evidence-case-1" name="case1" required>${evidence.map((item,index)=>evidenceOption(item,index===0?item.id:null)).join('')}</select></div><div class="field"><label for="evidence-case-2">Zweite Hülse</label><select id="evidence-case-2" name="case2" required>${evidence.map((item,index)=>evidenceOption(item,index===1?item.id:null)).join('')}</select></div><div class="field"><label for="evidence-result">Vergleichsergebnis</label><select id="evidence-result" name="result"><option value="MATCH">Übereinstimmung</option><option value="NO_MATCH">Keine Übereinstimmung</option><option value="DIFFERENT_WEAPON">Unterschiedliche Waffe</option></select></div>${field('Berichtsnummer (optional)','reportId','','text','maxlength="80"')}<div class="field full"><button class="button" ${evidence.length<2?'disabled':''}>Vergleich dokumentieren</button></div></form>
  <hr class="section-separator">${headlinePanel('Offene Vergleichspaare',badge(`${suggestions.length} offen`))}<div class="evidence-suggestions">${suggestions.map(([first,second])=>`<div class="evidence-suggestion"><div><strong>${esc(first.caseId)} <span class="muted">↔</span> ${esc(second.caseId)}</strong><small>${esc(first.weaponType)}</small></div><button class="button button-quiet button-small" type="button" data-action="evidence-prefill" data-case-a="${esc(first.id)}" data-case-b="${esc(second.id)}">Zum Vergleich</button></div>`).join('')||empty('Keine offenen Vergleichspaare mit gleichem Waffentyp.')}</div>
  <hr class="section-separator">${headlinePanel('Erfasste Evidence',badge(`${evidence.length} Hülsen`))}<div class="evidence-card-list">${evidence.map(item=>`<article class="evidence-card"><div class="evidence-card-main"><strong><code>${esc(item.caseId)}</code></strong>${badge(item.weaponType||'Waffentyp unbekannt')}${item.serialNumber?badge('SN '+item.serialNumber):''}${item.suspect?badge(item.suspect):''}<small>${reportCount.get(item.caseId)||0} Vergleich(e)${item.createdAt?' · '+formatDate(item.createdAt):''}</small>${item.notes?`<p>${esc(item.notes)}</p>`:''}</div>${btn('delete-evidence','Löschen','button-danger button-small',`data-id="${esc(item.id)}"`)}</article>`).join('')||empty('Noch keine Evidence erfasst.')}</div>
  <hr class="section-separator">${headlinePanel('Vergleichsverlauf',badge(`${reports.length} Berichte`))}<div class="evidence-report-list">${reports.map(report=>`<article class="evidence-report-row"><div class="evidence-report-pair"><code>${esc(report.caseId1)}</code><span>↔</span><code>${esc(report.caseId2)}</code></div><div class="evidence-report-meta">${badge(evidenceResultLabel(report.result),evidenceResultKind(report.result))}${report.reportId?badge('Bericht '+report.reportId):''}<small>${formatDate(report.importedAt,true)}${report.source==='import'?' · Import':''}</small></div>${btn('delete-evidence-report','×','button-danger button-small',`data-id="${esc(report.id)}"`)}</article>`).join('')||empty('Noch keine Vergleiche dokumentiert.')}</div></section>
 </div>`;
}

return {pageBoard,interviewReport,pageInterviews,evidencePairKey,evidenceResultLabel,evidenceResultKind,parseEvidenceLabReport,pageEvidence};
})();
