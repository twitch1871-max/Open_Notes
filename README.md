# OpenNotes

Eine Open-Source-Notizen-App mit Benutzerkonten, serverseitiger Speicherung und einer ruhigen, responsiven Oberfläche. MIT-Lizenz.

## Entwicklung

Node.js **24 oder neuer** (mit integriertem `node:sqlite`). Keine externen Laufzeitabhängigkeiten.

```sh
npm ci
npm run dev
```

Port: 5173, alternativ `PORT`. Anwendung im Browser öffnen, Konto mit E-Mail und einem Passwort mit mindestens zehn Zeichen anlegen, Notiz erstellen.

```sh
npm test
```

Die Tests prüfen Volltextsuche, Wortzählung und Datenvalidierung. Anmeldung, Notiz-API, Kontentrennung und Browserabläufe wurden zusätzlich am laufenden Server geprüft.

## Funktionen

- Registrierung, Anmeldung und Abmeldung
- Notizen erstellen, automatisch speichern und nach Bestätigung löschen
- Volltextsuche, Markdown-Export und einfache Vorschau für Überschriften und Listen
- Hell-/Dunkelmodus und mobiles Layout
- Geräteübergreifender Zugriff, wenn alle Geräte denselben Server erreichen

Änderungen werden beim Bearbeiten an den Server übertragen. Beim erneuten Öffnen oder Fokussieren des Fensters werden Notizen aktualisiert, sofern keine lokalen Änderungen ausstehen. Bei gleichzeitiger Bearbeitung derselben Notiz gewinnt die zuletzt beim Server eingegangene Speicherung; eine automatische Zusammenführung gibt es noch nicht. Offline-Bearbeitung wird nicht unterstützt; bei Speicherfehlern bitte exportieren, bevor du das Fenster schließt.

## Daten und Betrieb

SQLite speichert Konten, Notizen und Sitzungen standardmäßig unter `.data/opennotes.sqlite`. `DATA_DIR` legt ein anderes persistentes Datenverzeichnis fest. Dieses Verzeichnis enthält private Daten und darf nicht veröffentlicht werden. Für Backups SQLite-kompatible Sicherungen verwenden oder den Server vorher stoppen.

Passwörter werden mit scrypt und individuellen Salts gehasht; Sitzungen verwenden HttpOnly-/SameSite-Cookies. Notizen sind nicht Ende-zu-Ende-verschlüsselt. Vor öffentlichem Betrieb HTTPS bereitstellen und `COOKIE_SECURE=1` setzen. Der Reverse Proxy muss den ursprünglichen Host erhalten. Der integrierte Anmelde-Ratenbegrenzer zählt pro direkter Client-IP; hinter einem Proxy teilen sich Clients dessen Limit. Passwortzurücksetzung und E-Mail-Verifikation sind noch nicht implementiert.

## Mitmachen

Fehlerberichte und Pull Requests sind willkommen. Bitte Änderungen mit `npm test` prüfen. Lizenz: [MIT](LICENSE).
