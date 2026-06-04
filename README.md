# Gefrierschrank PWA

Progressive Web App zur Verwaltung des Gefrierschrank-Inventars.

## Auf iPhone/iPad installieren

1. Die App in **Safari** öffnen (nicht Chrome, Firefox o. ä.)
2. Unten auf das **Teilen-Symbol** (Quadrat mit Pfeil nach oben) tippen
3. **"Zum Home-Bildschirm"** wählen
4. Namen bestätigen und **"Hinzufügen"** tippen

Die App läuft danach offline und verhält sich wie eine native App.

---

## Deployment auf GitHub Pages

### Erstmalig einrichten

1. Auf [github.com](https://github.com) einloggen
2. Oben rechts **"+"** → **"New repository"**
3. Name: `gefrierschrank` (oder beliebig)
4. **Public** lassen (Pages funktioniert auch bei Private, aber nur mit kostenpflichtigem Account)
5. **"Create repository"** klicken
6. Auf der leeren Repository-Seite: **"uploading an existing file"** klicken
7. Den Inhalt des ZIP-Archivs entpacken und **alle Dateien und den `icons`-Ordner** hochladen
8. Commit-Nachricht eingeben (z. B. "Initial upload") → **"Commit changes"**

### GitHub Pages aktivieren

1. Im Repository oben auf **"Settings"**
2. Links im Menü: **"Pages"**
3. Unter "Branch": **`main`** auswählen, Ordner **`/ (root)`** lassen
4. **"Save"** klicken
5. Nach ca. 60 Sekunden erscheint die URL: `https://DEINNAME.github.io/gefrierschrank/`

### Updates einspielen

Geänderte Dateien einfach im Repository über **"Add file" → "Upload files"** ersetzen.  
Nach jedem Update die Versionsnummer in `sw.js` (Zeile 1: `const CACHE = 'gefrierapp-v2'`) erhöhen,  
damit der Browser den Cache aktualisiert.

---

## Dateistruktur

```
index.html      Haupt-HTML-Datei
app.js          Anwendungslogik
style.css       Styles (Dark Mode inklusive)
manifest.json   PWA-Manifest (Name, Icons, Farben)
sw.js           Service Worker (Offline-Cache)
icons/
  icon-192.png  App-Icon (Homescreen)
  icon-512.png  App-Icon (Splash Screen)
```
