window.RPDeskPages = window.RPDeskPages || {};
window.RPDeskPages.changelog = (() => {
'use strict';
const {head,esc,formatDate,badge} = window.RPDesk;
const APP_VERSION = '1.2';
const CHANGELOG = [
 {version:'1.2',date:'2026-11-12',type:'minor',changes:[
  'Neue Workspace-Werkzeuge: Leasing- und Ratenverwaltung, Notizen, Zeitrechner, Aufgaben, Einsatz-Timeline und Textbausteine.',
  'Minigolf wurde um Scorekarten, mehrere Spieler und anpassbare Bahnen erweitert.',
  'Lagerbestand, Kostenrechner sowie Einnahmen- und Ausgabenverwaltung ergänzt.',
  'Werkzeuge lassen sich pro Charakter ein- und ausblenden; die zugehörigen Daten bleiben erhalten.',
  'Backups und Datenstruktur verbessert: ältere Daten werden migriert und ungültige Datenstände vor dem Überschreiben geschützt.',
  'Neuer Changelog-Reiter sowie ein Release-Befehl, der Version, Changelog und Cache-Buster gemeinsam aktualisiert.'
 ]},
 {version:'1.1',date:'2026-10-14',type:'minor',changes:[
  'Bildansicht für Pinnwände mit Zoom- und Vergrößerungssteuerung hinzugefügt.',
  'Minigolf-Tracking mit Spielerkarten und Live-Zwischenstand eingeführt.',
  'Farbauswahl um eine Live-Vorschau und die Anzeige des HEX-Werts ergänzt.'
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
