window.RPDeskPages = window.RPDeskPages || {};
window.RPDeskPages.leisure = (() => {
'use strict';
const {char,scoped,collectionItem,ui,head,empty,headlinePanel,field,textareaField,btn,esc,fmtMoney,formatDate,today}=window.RPDesk;

function pageMedics(){
 if(!char())return `${head('Patientenliste','')}${empty('Bitte lege zuerst einen Charakter an.')}`;
 const patients=scoped('medics').slice().sort((first,second)=>first.lastName.localeCompare(second.lastName,'de')||first.firstName.localeCompare(second.firstName,'de'));
 const birthdays=patients.filter(patient=>patient.birthday&&patient.birthday.slice(5)===today().slice(5));
 const query=(ui.search.medics||'').trim().toLocaleLowerCase('de');
 const visible=patients.filter(patient=>[patient.firstName,patient.lastName,patient.bloodType,patient.allergies,patient.notes].some(value=>String(value||'').toLocaleLowerCase('de').includes(query)));
 const edit=collectionItem('medics',ui.editMedic);
 const bloodTypes=['','A+','A-','B+','B-','AB+','AB-','0+','0-'];
 return `${head('Patientenliste','Privatpatienten und medizinische Angaben.')}
 <section class="medic-birthdays" aria-live="polite"><div><span class="medic-kicker">GEBURTSTAGE</span><h2>Heute</h2></div><p>${birthdays.length?birthdays.map(patient=>esc(`${patient.firstName} ${patient.lastName}`)).join(' · '):'Heute hat niemand Geburtstag.'}</p><span class="badge">${birthdays.length}</span></section>
 <section class="panel panel-pad medic-list"><div class="panel-head"><h2>Patientenübersicht <span class="badge">${patients.length}</span></h2><input class="search-field medic-search" type="search" data-search="medics" value="${esc(ui.search.medics||'')}" placeholder="Patienten suchen" aria-label="Patienten suchen"></div>
 <div class="table-wrap"><table class="data-table medic-table"><thead><tr><th>Vorname</th><th>Name</th><th>Privatpatient seit</th><th>Geburtstag</th><th>Blutgruppe</th><th>Allergien</th><th>Notizen</th><th>Aktionen</th></tr></thead><tbody>${visible.map(patient=>`<tr class="${patient.marked?'medic-marked':''}"><td>${esc(patient.firstName)}</td><td>${esc(patient.lastName)}</td><td>${esc(formatDate(patient.privateSince))}</td><td>${esc(formatDate(patient.birthday))}</td><td>${esc(patient.bloodType||'–')}</td><td>${esc(patient.allergies||'–')}</td><td>${esc(patient.notes||'–')}</td><td><div class="table-actions">${btn('edit-medic','Bearbeiten','button-quiet button-small',`data-id="${esc(patient.id)}"`)}${btn('delete-medic','Löschen','button-danger button-small',`data-id="${esc(patient.id)}"`)}</div></td></tr>`).join('')||'<tr><td colspan="8">Keine Patienten gefunden.</td></tr>'}</tbody></table></div></section>
 <section class="panel panel-pad medic-form">${headlinePanel(edit?'Patient bearbeiten':'Patient hinzufügen')}<form data-form="medic-save" ${edit?`data-id="${esc(edit.id)}"`:''}><div class="form-grid">
 ${field('Vorname','firstName',edit?.firstName||'','text','required maxlength="100"')}${field('Name','lastName',edit?.lastName||'','text','required maxlength="100"')}${field('Privatpatient seit','privateSince',edit?.privateSince||'','date')}${field('Geburtstag','birthday',edit?.birthday||'','date')}
 <div class="field"><label>Blutgruppe</label><select name="bloodType">${bloodTypes.map(type=>`<option value="${esc(type)}" ${type===(edit?.bloodType||'')?'selected':''}>${esc(type||'Nicht angegeben')}</option>`).join('')}</select></div>${textareaField('Allergien','allergies',edit?.allergies||'',2,'maxlength="1000"')}${textareaField('Notizen','notes',edit?.notes||'',2,'maxlength="1000"')}
 <label class="tool-setting"><input type="checkbox" name="marked" ${edit?.marked?'checked':''}> Patient markieren</label></div><div class="form-actions"><button class="button">Patient speichern</button>${edit?btn('cancel-medic-edit','Abbrechen'):''}</div></form></section>`;
}

function pageInventory(){
 if(!char())return `${head('Lager & Rechner','Bestände und Kosten für Tuning und andere Projekte verwalten.')}${empty('Bitte lege zuerst einen Charakter an.')}`;
 const items=scoped('inventory');
 const edit=collectionItem('inventory',ui.editInventory);
 const value=items.reduce((sum,item)=>sum+item.quantity*Math.round(item.price*100),0)/100;
 return `${head('Lager & Rechner','Bestände und Stückpreise pro Charakter verwalten. Lager und Finanzen werden unabhängig voneinander geführt.')}
 <div class="grid"><section class="panel panel-pad span-6">${headlinePanel(edit?'Artikel bearbeiten':'Artikel hinzufügen')}
 <form data-form="inventory-save" ${edit?`data-id="${esc(edit.id)}"`:''} class="form-grid">
 ${field('Artikel','name',edit?.name||'','text','required maxlength="100" placeholder="z. B. Turbolader"')}
 ${field('Menge','quantity',edit?.quantity??'','number','required min="0" max="100000" step="1"')}
 ${field('Stückpreis ($)','price',edit?.price??'','number','required min="0" max="1000000" step="0.01"')}
 <div class="field full"><div class="form-actions"><button class="button">Artikel speichern</button>${edit?btn('cancel-inventory-edit','Abbrechen'):''}</div></div></form></section>
 <section class="panel panel-pad span-6">${headlinePanel('Kostenrechner')}<p class="hint">Menge und Stückpreis frei berechnen, ohne einen Lager- oder Finanzeintrag anzulegen.</p>
 <form data-form="cost-calculate" class="form-grid">${field('Menge','quantity',ui.costCalculation?.quantity??'','number','required min="0" max="100000" step="1"')}${field('Stückpreis ($)','price',ui.costCalculation?.price??'','number','required min="0" max="1000000" step="0.01"')}<div class="field full"><button class="button">Berechnen</button></div></form>
 ${ui.costCalculation?`<div class="notice mt-18"><strong>Gesamt: ${fmtMoney(ui.costCalculation.total)}</strong></div>`:''}</section>
 <section class="panel panel-pad span-12">${headlinePanel('Lagerbestand',`<strong>Gesamtwert: ${fmtMoney(value)}</strong>`)}
 <div class="table-wrap"><table class="mini-table"><thead><tr><th>Artikel</th><th>Menge</th><th>Stückpreis</th><th>Gesamtwert</th><th>Aktionen</th></tr></thead><tbody>
 ${items.map(item=>`<tr><td>${esc(item.name)}</td><td>${esc(item.quantity)}</td><td>${fmtMoney(item.price)}</td><td>${fmtMoney(item.quantity*Math.round(item.price*100)/100)}</td><td><div class="table-actions">${btn('edit-inventory','Bearbeiten','button-quiet button-small',`data-id="${esc(item.id)}"`)}${btn('delete-inventory','Löschen','button-danger button-small',`data-id="${esc(item.id)}"`)}</div></td></tr>`).join('')||'<tr><td colspan="5" class="muted">Noch keine Artikel vorhanden.</td></tr>'}</tbody></table></div></section></div>`;
}
function pageFinances(){
 if(!char())return `${head('Einnahmen & Ausgaben','Finanzen pro Charakter festhalten.')}${empty('Bitte lege zuerst einen Charakter an.')}`;
 const entries=scoped('finances').slice().sort((a,b)=>b.date.localeCompare(a.date));
 const edit=collectionItem('finances',ui.editFinance);
 const income=entries.filter(item=>item.type==='income').reduce((sum,item)=>sum+Math.round(item.amount*100),0)/100;
 const expenses=entries.filter(item=>item.type==='expense').reduce((sum,item)=>sum+Math.round(item.amount*100),0)/100;
 return `${head('Einnahmen & Ausgaben','Buchungen unabhängig vom Lager für den aktiven Charakter erfassen.')}
 <div class="metric-strip finance-metrics"><div class="metric"><b>${fmtMoney(income)}</b><span>EINNAHMEN</span></div><div class="metric"><b>${fmtMoney(expenses)}</b><span>AUSGABEN</span></div><div class="metric"><b>${fmtMoney(Math.round(income*100-expenses*100)/100)}</b><span>SALDO</span></div></div>
 <div class="grid"><section class="panel panel-pad span-6">${headlinePanel(edit?'Buchung bearbeiten':'Buchung hinzufügen')}<form data-form="finance-save" ${edit?`data-id="${esc(edit.id)}"`:''} class="form-grid">
 ${field('Beschreibung','description',edit?.description||'','text','required maxlength="100" placeholder="z. B. Rennen oder Tuning"')}
 <div class="field"><label for="finance-type">Art</label><select id="finance-type" name="type"><option value="income" ${edit?.type==='income'?'selected':''}>Einnahme</option><option value="expense" ${edit?.type==='expense'?'selected':''}>Ausgabe</option></select></div>
 ${field('Betrag ($)','amount',edit?.amount??'','number','required min="0.01" max="1000000" step="0.01"')}${field('Datum','date',edit?.date||today(),'date','required')}
 <div class="field full"><div class="form-actions"><button class="button">Buchung speichern</button>${edit?btn('cancel-finance-edit','Abbrechen'):''}</div></div></form></section>
 <section class="panel panel-pad span-6">${headlinePanel('Buchungen')}<div class="table-wrap"><table class="mini-table"><thead><tr><th>Datum</th><th>Beschreibung</th><th>Art</th><th>Betrag</th><th>Aktionen</th></tr></thead><tbody>
 ${entries.map(item=>`<tr><td>${formatDate(item.date)}</td><td>${esc(item.description)}</td><td>${item.type==='income'?'Einnahme':'Ausgabe'}</td><td>${fmtMoney(item.amount)}</td><td><div class="table-actions">${btn('edit-finance','Bearbeiten','button-quiet button-small',`data-id="${esc(item.id)}"`)}${btn('delete-finance','Löschen','button-danger button-small',`data-id="${esc(item.id)}"`)}</div></td></tr>`).join('')||'<tr><td colspan="5" class="muted">Noch keine Buchungen vorhanden.</td></tr>'}</tbody></table></div></section></div>`;
}
return {pageInventory,pageFinances,pageMedics};
})();
