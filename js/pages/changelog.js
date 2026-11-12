window.RPDeskPages = window.RPDeskPages || {};
window.RPDeskPages.changelog = (() => {
'use strict';
const {head,esc,formatDate,badge} = window.RPDesk;
const APP_VERSION = '1.2';
const CHANGELOG = [
 {version:'1.2',date:'2026-11-12',type:'minor',changes:[
  'Neuer Changelog-Reiter für Änderungen an RP Desk.',
  'Versionsnummern und Changelog-Einträge lassen sich mit einem Release-Befehl gemeinsam aktualisieren.'
 ]}
];

function pageChangelog(){
 return `${head('Changelog','Hier findest du die Neuerungen der letzten Updates.')}
 <div class="grid">${CHANGELOG.map(entry=>`<article class="panel panel-pad span-12">
  <div class="panel-head"><h2>Version ${esc(entry.version)}</h2>${badge(entry.type==='major'?'Major Update':'Kleines Update',entry.type==='major'?'amber':'')}</div>
  <p class="hint">Veröffentlicht am ${esc(formatDate(entry.date))}</p>
  <ul>${entry.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul>
 </article>`).join('')}</div>`;
}

return {APP_VERSION,pageChangelog};
})();
