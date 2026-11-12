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
- Ermittlungsakten mit Status, Priorität, Maßnahmen aus der bestehenden Aufgabenliste, Chronologie und TXT-/JSON-/Druckexport
- Zentrale Verknüpfungen zwischen Akten, Personen, Fahrzeugen, Gruppierungen, Beweismitteln, Fristen, Standorten und vorhandenen Modulen
- Globale Command-Palette mit `Strg+K` / `Cmd+K`, Datensatz- und Charakterfiltern sowie Kennzeichensuche ohne Bindestriche
- Fristen mit benutzerdefinierten Typen, Fälligkeitsgruppen, Erinnerungsanzeige und Verknüpfungen
- GTA-V-Kartenmodul mit der mitgelieferten lokalen Karte, zoombarer/verschiebbarer Ansicht, Ermittlungsmarkern, Filtern, Verknüpfungen, Gebieten, Routen und Karten-Backups
- Charakterbezogen konfigurierbares Dashboard mit neun Widgets, Favoriten, eigenen Schnellzugriffen und Notizfeld
- Getrennte Charakterprofile; JSON-Backup und -Wiederherstellung
- Changelog mit Versionshistorie und automatischer Versionspflege
- Installierbare PWA mit lokalem App-Shell-Cache und Update-Hinweis

## Quellcode-Aufteilung

- `js/core.js` enthält gemeinsame Hilfsfunktionen, versionierte Migrationen, den lokalen Datenspeicher und Entitäten-/Verknüpfungsdienste.
- `js/pages/` enthält die Ansichten für Dashboard/Charaktere, Ermittlungen, Akten, Personen, Fristen und Karte sowie bestehende Organisationstools. `map-engine.js` berechnet die affine Koordinatenumrechnung unabhängig von der UI.
- `app.js` verbindet die Seiten mit Navigation, Formularen, Aktionen und Eingabeereignissen.
- `index.html` lädt die klassischen Skripte in Abhängigkeitsreihenfolge. Die Toolbox bleibt auch direkt über `file://` nutzbar; Service Worker und PWA-Installation benötigen HTTPS oder localhost.
- `sw.js`, `manifest.webmanifest` und `assets/` enthalten PWA-Konfiguration, App-Symbol und Kartenressource. Die Karte `assets/los-santos-custom.png` (6144 × 9216 Pixel) wird unverändert lokal verwendet und für den Offline-Betrieb mit gecacht; sie ist rund 26 MB groß.

## Datenmodell und Migration

Das bestehende Backup-Format (`version: 1`) bleibt kompatibel. `schemaVersion` entwickelt sich davon unabhängig und steht aktuell auf `4`. Bestehende Moduldatensätze werden bei der Migration mit stabilen Quellverweisen als typisierte Entitäten registriert; ihre Inhalte werden nicht doppelt gespeichert. Beim Lesen einer verknüpften Entität werden Titel und Suchfelder aus der bestehenden Modulsammlung aufgelöst. Zentrale Datensätze wie Akten, Fristen und Orte werden direkt als Entitäten geführt. Beziehungen referenzieren Entitäts-IDs und sind in beide Richtungen auffindbar.

Die Kartenansicht speichert Bildpositionen und Kartenobjekte charakterbezogen. GTA-X/Y-Koordinaten werden erst verwendet, wenn mindestens drei gültige, nicht kollineare Referenzpunkte manuell auf der bereitgestellten Karte kalibriert wurden; es sind keine erfundenen Standardkoordinaten hinterlegt. Karten-Backups verwenden ein eigenes Format (`rp-desk-map`, Version 1), enthalten gemeinsame Marker und ihre Verknüpfungen und werden vor dem Speichern validiert. Verknüpfte Datensätze müssen beim Import bereits vorhanden sein; für einen vollständigen Gerätewechsel zuerst das vollständige Backup wiederherstellen.

Der synchron genutzte lokale Speicher bleibt vorerst `localStorage`, damit bestehende Module und `file://`-Nutzung kompatibel bleiben. Größere Bilder und Datenmengen bleiben daher durch das Browser-Speicherlimit beschränkt; IndexedDB ist ein möglicher späterer Wechsel, würde aber eine asynchrone Speicher- und UI-Migration erfordern. Unbekannte oder beschädigte vorhandene Daten werden beim Start nicht überschrieben. Ein Backup-Import zeigt zuerst eine Vorschau und kann bestehende Daten ersetzen oder per ID zusammenführen. Charakter- und Modulsicherungen schließen die jeweils verknüpften Entitäten und Beziehungen ein. Tests lassen sich ohne zusätzliche Abhängigkeiten mit `node --test` ausführen.

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

Sämtliche Inhalte befinden sich ausschließlich im lokalen Speicher des Browsers und werden nicht auf GitHub hochgeladen. **GitHub Pages synchronisiert weder Daten noch Nutzerkonten.** Unterschiedliche Browser, Geräte, Domains oder Browserprofile besitzen getrennte Datensätze. Im Tab **Charaktere** vollständige, charakterbezogene oder ausgewählte Modul-Backups exportieren und auf dem anderen Gerät wiederherstellen.

Bei Löschen der Browserdaten, Privatmodus, Browserwechsel oder Speicherbegrenzung können Daten verloren gehen. Daher regelmäßig Backups herunterladen. Beim Import kann der Datenstand ersetzt oder zusammengeführt werden. Keine automatische Synchronisierung. Sensible reale Daten bitte nicht hinterlegen: Website-Code ist öffentlich, lokale Daten sind nur vor gewöhnlichen Besuchern getrennt, aber nicht verschlüsselt.

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
