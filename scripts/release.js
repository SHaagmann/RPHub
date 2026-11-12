'use strict';

const fs = require('node:fs');
const path = require('node:path');

function nextVersion(currentVersion, type) {
 const match = /^(\d+)\.(\d+)$/.exec(currentVersion);
 if(!match)throw new Error(`Ungültige Versionsnummer: ${currentVersion}`);
 const major = Number(match[1]), minor = Number(match[2]);
 if(type==='minor')return `${major}.${minor+1}`;
 if(type==='major')return `${major+1}.0`;
 throw new Error('Release-Typ muss "minor" oder "major" sein.');
}

function bumpVersion(root, type, message, date = new Date().toISOString().slice(0,10)) {
 const changelogPath = path.join(root,'js/pages/changelog.js');
 const indexPath = path.join(root,'index.html');
 const changelog = fs.readFileSync(changelogPath,'utf8');
 const index = fs.readFileSync(indexPath,'utf8');
 const versionMatch = changelog.match(/const APP_VERSION = ['"](\d+\.\d+)['"];/);
 if(!versionMatch)throw new Error('APP_VERSION wurde in js/pages/changelog.js nicht gefunden.');
 const currentVersion = versionMatch[1];
 const latestEntry = /const CHANGELOG = \[\s*\{\s*version:\s*(['"])(\d+\.\d+)\1/.exec(changelog);
 if(!latestEntry||latestEntry[2]!==currentVersion)throw new Error('APP_VERSION und der neueste Changelog-Eintrag stimmen nicht überein.');
 const summary = String(message||'').trim();
 if(!summary)throw new Error('Bitte eine kurze Beschreibung für den Changelog-Eintrag angeben.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Das Datum muss im Format YYYY-MM-DD angegeben werden.');
 const version = nextVersion(currentVersion,type);
 const entry = ` {version:${JSON.stringify(version)},date:${JSON.stringify(date)},type:${JSON.stringify(type)},changes:[${JSON.stringify(summary)}]},\n`;
 const nextChangelog = changelog
  .replace(/const APP_VERSION = ['"]\d+\.\d+['"];/,`const APP_VERSION = '${version}';`)
  .replace(/(const CHANGELOG = \[\s*\n)/,`$1${entry}`);
 if(nextChangelog===changelog)throw new Error('Der Changelog konnte nicht aktualisiert werden.');
 const nextIndex = index.replace(/((?:src|href)="[^"]+\.(?:js|css))\?v=[^"]*"/g,`$1?v=${version}"`);
 if(nextIndex===index)throw new Error('Keine versionierten JavaScript- oder CSS-Dateien in index.html gefunden.');
 fs.writeFileSync(changelogPath,nextChangelog);
 fs.writeFileSync(indexPath,nextIndex);
 return version;
}

if(require.main===module){
 const [type,message] = process.argv.slice(2);
 try{
  if(!type||!message)throw new Error('Aufruf: node scripts/release.js <minor|major> "Änderungsbeschreibung"');
  const version = bumpVersion(path.join(__dirname,'..'),type,message);
  console.log(`Version ${version} erstellt. Changelog und Cache-Buster wurden aktualisiert.`);
 }catch(error){
  console.error(error.message);
  process.exitCode=1;
 }
}

module.exports={nextVersion,bumpVersion};
