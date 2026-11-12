const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {nextVersion,bumpVersion} = require('../scripts/release.js');

test('Release-Befehl aktualisiert Version, Changelog und Cache-Buster gemeinsam',()=>{
 const root = fs.mkdtempSync(path.join(os.tmpdir(),'rpdesk-release-'));
 try {
  fs.mkdirSync(path.join(root,'js/pages'),{recursive:true});
  fs.copyFileSync(path.join(__dirname,'../js/pages/changelog.js'),path.join(root,'js/pages/changelog.js'));
  fs.copyFileSync(path.join(__dirname,'../index.html'),path.join(root,'index.html'));

  const sourceChangelog=fs.readFileSync(path.join(root,'js/pages/changelog.js'),'utf8');
  const sourceVersion=/const APP_VERSION = '(\d+\.\d+)'/.exec(sourceChangelog)[1];
  const nextMinor=nextVersion(sourceVersion,'minor');
  assert.equal(bumpVersion(root,'minor','Neue Auswertung','2026-11-13'),nextMinor);
  const changelog=fs.readFileSync(path.join(root,'js/pages/changelog.js'),'utf8');
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const escapedMinor=nextMinor.replace(/\./g,'\\.');
  assert.match(changelog,new RegExp(`const APP_VERSION = '${escapedMinor}';`));
  assert.match(changelog,new RegExp(`version:"${escapedMinor}",date:"2026-11-13",type:"minor",changes:\\["Neue Auswertung"\\]`));
  assert.doesNotMatch(index,new RegExp(`\\?v=${sourceVersion.replace(/\./g,'\\.')}`));
  assert.ok([...index.matchAll(new RegExp(`\\?v=${escapedMinor}`,'g'))].length>1);

  const nextMajor=nextVersion(nextMinor,'major');
  assert.equal(bumpVersion(root,'major','Großer Umbau','2026-11-14'),nextMajor);
  const escapedMajor=nextMajor.replace(/\./g,'\\.');
  assert.match(fs.readFileSync(path.join(root,'js/pages/changelog.js'),'utf8'),new RegExp(`version:"${escapedMajor}",date:"2026-11-14",type:"major"`));
 } finally {
  fs.rmSync(root,{recursive:true,force:true});
 }
});

test('Versionsschritte akzeptieren nur minor und major',()=>{
 assert.equal(nextVersion('1.9','minor'),'1.10');
 assert.equal(nextVersion('1.9','major'),'2.0');
 assert.throws(()=>nextVersion('1.9','patch'),/minor.*major/);
 assert.throws(()=>nextVersion('v1.9','minor'),/Ungültige Versionsnummer/);
});
