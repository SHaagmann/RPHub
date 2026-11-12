# RP Desk – lokale Rollenspiel-Toolbox

Statische Website ohne Build-Schritt, Backend, externe Bibliotheken oder Tracking. Alle Einträge werden im **localStorage** des jeweiligen Browsers gespeichert.

## Enthaltene Module

- Interaktive Ermittlungs-Pinnwand (Knoten, Beziehungen, Notizen, mehrere Boards)
- Vernehmungs-Assistent (Fragen, Antworten, Markierungen, kopierbares Protokoll und TXT-Export)
- Evidence-Vergleich für Hülsen mit importierbaren Laborberichten, Vergleichsverlauf und offenen Vergleichspaaren
- Minigolf-Tracking mit standardmäßig 12 Bahnen (alternativ 9 oder 18), mehreren Spielern, editierbarem Par und Live-Zwischenstand
- Leasing- & Ratenmanager (Zahlungen, Restbetrag, Vorauszahlung, nächste Rate)
- Notizblock, Zeitrechner, Textbausteine mit Platzhaltern
- Einsatz-Timeline, Aufgabenverwaltung, Charakter-Dashboard
- Navigationsbereiche für PD-Hub, Freizeit und gemeinsame Werkzeuge; Tool-Sichtbarkeit pro Charakter einstellbar
- Lagerbestand mit Mengen, Stückpreisen und Gesamtwert sowie ein separater Kostenrechner
- Einnahmen und Ausgaben mit Saldo und bearbeitbarer Buchungshistorie
- Getrennte Charakterprofile; JSON-Backup und -Wiederherstellung
- Changelog mit Versionshistorie und automatischer Versionspflege

## Quellcode-Aufteilung

- `js/core.js` enthält gemeinsame Hilfsfunktionen, den lokalen Datenspeicher und den UI-Zustand.
- `js/pages/` enthält die Ansichten für Dashboard/Charaktere, Ermittlungen sowie Organisation und Tools.
- `app.js` verbindet die Seiten mit Navigation, Formularen, Aktionen und Eingabeereignissen.
- `index.html` lädt die klassischen Skripte in Abhängigkeitsreihenfolge. Dadurch bleibt die App auch direkt über `file://` nutzbar.

## Datenmodell und Migration

Das bestehende Datenformat (`version: 1`) bleibt für bisherige Backups kompatibel. Ein separates `schemaVersion`-Feld versioniert die lokale Datenstruktur; beim Laden wird ein älterer gültiger Datenstand schrittweise ergänzt, ohne vorhandene Modul-Datensätze umzuschreiben. Die aktuelle Grundlage (`schemaVersion: 2`) reserviert zentrale Sammlungen für typisierte Entitäten und Beziehungen. Die bisherigen Module bleiben bis zu ihrer schrittweisen Integration die Quelle ihrer Daten, damit diese Umstellung keine bestehende Funktion oder Nutzerdaten gefährdet.

Der Speicherzugriff ist in `js/core.js` zentral gebündelt und bleibt vorerst synchron über localStorage, da die Oberfläche direkt auf diese Daten zugreift. Wenn vorhandene Daten beschädigt sind oder eine unbekannte Version haben, werden sie beim Start nicht überschrieben; die App meldet den blockierten Speichervorgang. Ein gültiges Backup kann importiert oder der lokale Datenstand nach ausdrücklicher Bestätigung zurückgesetzt werden. Tests lassen sich ohne zusätzliche Abhängigkeiten mit `node --test` ausführen.

## GitHub Pages – ohne Build

1. Neues GitHub-Repository anlegen, z. B. `rp-desk`.
2. **Alle Dateien und Ordner aus diesem Verzeichnis** ins Hauptverzeichnis (`/`) des Repositorys hochladen, insbesondere auch den Ordner `js/` mit den Seitenmodulen.
3. Unter **Settings → Pages** als Quelle **Deploy from a branch**, Branch `main`, Ordner `/(root)` auswählen und speichern.
4. GitHub veröffentlicht die Seite anschließend typischerweise unter `https://DEIN-NAME.github.io/rp-desk/`.

Es ist keine npm-Installation notwendig. Die App funktioniert auch mit einfachem statischem Hosting. Für lokale Entwicklung z. B. im Verzeichnis starten:

```bash
python -m http.server 8000
```

Dann `http://localhost:8000` öffnen.

## Version und Changelog

Nach einer Änderung einen kleinen Release-Schritt mit `minor` oder eine größere Überarbeitung mit `major` anlegen. Der Befehl erhöht die Version, ergänzt den Changelog und aktualisiert die Cache-Buster in `index.html` gemeinsam:

```bash
node scripts/release.js minor "Kurze Beschreibung der Neuerung"
node scripts/release.js major "Kurze Beschreibung der größeren Überarbeitung"
```

`minor` zählt zum Beispiel von `1.2` auf `1.3` hoch; `major` wechselt von `1.3` auf `2.0`. Der Changelog-Eintrag wird mit dem aktuellen Datum erstellt. Änderungen werden damit nicht automatisch erkannt oder beschrieben: Der Release-Befehl wird bewusst nach den Änderungen mit einer passenden Zusammenfassung ausgeführt.

## Wo liegen meine Daten?

Sämtliche Inhalte befinden sich ausschließlich im localStorage des Browsers und werden nicht auf GitHub hochgeladen. **GitHub Pages synchronisiert weder Daten noch Nutzerkonten.** Unterschiedliche Browser, Geräte, Domains oder Browserprofile besitzen getrennte Datensätze. Im Tab **Charaktere** per **JSON-Backup** exportieren und auf dem anderen Gerät wiederherstellen.

Bei Löschen der Browserdaten, Privatmodus, Browserwechsel oder Speicherbegrenzung können Daten verloren gehen. Daher regelmäßig Backups herunterladen. Der Import **ersetzt** den kompletten lokalen Datenstand, er führt ihn nicht zusammen. Keine automatische Synchronisierung. Sensible reale Daten bitte nicht hinterlegen: Website-Code ist öffentlich, lokale Daten sind nur vor gewöhnlichen Besuchern getrennt, aber nicht verschlüsselt.

Unter **Tool-Einstellungen** lassen sich Werkzeuge für den aktiven Charakter ausblenden und jederzeit wieder einblenden; die zugehörigen Daten bleiben erhalten. Lagerbestand und Finanzbuchungen sind unabhängig: Änderungen am Lager erzeugen keine Einnahmen oder Ausgaben. Der Kostenrechner legt ebenfalls keine Einträge an. Beide neuen Sammlungen und die Sichtbarkeitseinstellungen sind im JSON-Backup enthalten; ältere Backups bleiben importierbar.

## Hinweise zum Leasing-Rechner

Der erste reguläre Ratenzeitpunkt ist das Vertrags-Startdatum. Bei einer Wochenrate von 5.000 $ gelten 10.000 $ als zwei vollständig gedeckte Raten; die nächste Zahlung liegt **14 Tage nach dem Startdatum**. Nicht volle Raten werden als Guthaben angerechnet. Durch den Parameter „Ratenabstand in Wochen“ lassen sich längere Perioden abbilden. Dies ist ein RP-Planer und keine rechtsverbindliche Zahlungs-/Buchhaltungssoftware.

## Datenschutz und Sicherheit

- Keine externen API-Anfragen, Telemetrie oder Cookies (nur die statischen Webdateien werden vom Host geladen).
- Keine externen Webfonts, CDN-Bibliotheken oder Analytics.
- Texte werden vor dem Einfügen ins HTML escaped.
- Export/Import erfolgen lokal im Browser.
- Durch JavaScript muss der Browser lokale Webspeicherung erlauben.

Entwickelt als eigenständige RP-Toolbox.
