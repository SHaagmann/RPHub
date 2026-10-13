# RP Desk – lokale Rollenspiel-Toolbox

Statische Website ohne Build-Schritt, Backend, externe Bibliotheken oder Tracking. Alle Einträge werden im **localStorage** des jeweiligen Browsers gespeichert.

## Enthaltene Module

- Interaktive Ermittlungs-Pinnwand (Knoten, Beziehungen, Notizen, mehrere Boards)
- Vernehmungs-Assistent (Fragen, Antworten, Markierungen, kopierbares Protokoll und TXT-Export)
- Leasing- & Ratenmanager (Zahlungen, Restbetrag, Vorauszahlung, nächste Rate)
- Notizblock, Zeitrechner, Kennzeichen-Generator, Funkcode-Quiz
- Textbausteine mit Platzhaltern, Dienstzeit-Tracker, Kontaktbuch
- Einsatz-Timeline, Aufgabenverwaltung, Charakter-Dashboard
- Getrennte Charakterprofile; JSON-Backup und -Wiederherstellung

## GitHub Pages – ohne Build

1. Neues GitHub-Repository anlegen, z. B. `rp-desk`.
2. **Alle Dateien aus diesem Verzeichnis** ins Hauptverzeichnis (`/`) des Repositorys hochladen: `index.html`, `styles.css`, `app.js`, `favicon.svg`, `README.md`.
3. Unter **Settings → Pages** als Quelle **Deploy from a branch**, Branch `main`, Ordner `/(root)` auswählen und speichern.
4. GitHub veröffentlicht die Seite anschließend typischerweise unter `https://DEIN-NAME.github.io/rp-desk/`.

Es ist keine npm-Installation notwendig. Die App funktioniert auch mit einfachem statischem Hosting. Für lokale Entwicklung z. B. im Verzeichnis starten:

```bash
python -m http.server 8000
```

Dann `http://localhost:8000` öffnen.

## Wo liegen meine Daten?

Sämtliche Inhalte befinden sich ausschließlich im localStorage des Browsers und werden nicht auf GitHub hochgeladen. **GitHub Pages synchronisiert weder Daten noch Nutzerkonten.** Unterschiedliche Browser, Geräte, Domains oder Browserprofile besitzen getrennte Datensätze. Im Tab **Charaktere** per **JSON-Backup** exportieren und auf dem anderen Gerät wiederherstellen.

Bei Löschen der Browserdaten, Privatmodus, Browserwechsel oder Speicherbegrenzung können Daten verloren gehen. Daher regelmäßig Backups herunterladen. Der Import **ersetzt** den kompletten lokalen Datenstand, er führt ihn nicht zusammen. Keine automatische Synchronisierung. Sensible reale Daten bitte nicht hinterlegen: Website-Code ist öffentlich, lokale Daten sind nur vor gewöhnlichen Besuchern getrennt, aber nicht verschlüsselt.

## Hinweise zum Leasing-Rechner

Der erste reguläre Ratenzeitpunkt ist das Vertrags-Startdatum. Bei einer Wochenrate von 5.000 $ gelten 10.000 $ als zwei vollständig gedeckte Raten; die nächste Zahlung liegt **14 Tage nach dem Startdatum**. Nicht volle Raten werden als Guthaben angerechnet. Durch den Parameter „Ratenabstand in Wochen“ lassen sich längere Perioden abbilden. Dies ist ein RP-Planer und keine rechtsverbindliche Zahlungs-/Buchhaltungssoftware.

## Datenschutz und Sicherheit

- Keine externen API-Anfragen, Telemetrie oder Cookies (nur die statischen Webdateien werden vom Host geladen).
- Keine externen Webfonts, CDN-Bibliotheken oder Analytics.
- Texte werden vor dem Einfügen ins HTML escaped.
- Export/Import erfolgen lokal im Browser.
- Durch JavaScript muss der Browser lokale Webspeicherung erlauben.

Entwickelt als eigenständige RP-Toolbox.
