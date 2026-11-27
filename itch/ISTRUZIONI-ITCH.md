# Pacchetto itch.io

Il gioco è un `index.html` autosufficiente: per itch.io serve uno ZIP con
`index.html` **alla radice** (non dentro una cartella) e i file collegati accanto.

## 1. Rigenerare il pacchetto

```bash
npm run build:itch          # crea dist-itch/ con percorsi relativi (./)
```

Poi comprimi il contenuto della cartella, non la cartella:

```bash
python3 - <<'PY'
import os, zipfile
root = "dist-itch"
# solo ciò che serve al gioco: evita di caricare su itch.io le immagini social,
# robots.txt e la sitemap pensati per il sito
keep = ["index.html", "icon.svg", "apple-touch-icon.png", "site.webmanifest"]
with zipfile.ZipFile("itch/scacchigramma-itch.zip", "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in keep:
        z.write(os.path.join(root, f), f)
print("ok")
PY
```

Controllo rapido: nel ZIP devono comparire `index.html`, `icon.svg`,
`apple-touch-icon.png` e `site.webmanifest` senza prefisso di cartella.

- Limiti itch.io: massimo 1.000 file e 500 MB per progetto HTML5 (qui 1 file HTML
  da ~600 kB più 3 file piccoli).
- La build itch usa `--base=./`: tutti i percorsi sono relativi, quindi funzionano
  dentro `https://html.itch.zone/html/<id>/index.html`.

## 2. Caricamento su itch.io

1. **Create new project** → *Kind of project*: **HTML**.
2. **Uploads** → carica `itch/scacchigramma-itch.zip`, poi spunta
   **"This file will be played in the browser"**.
3. Nella stessa riga di upload, *Embed options*:
   - **Viewport**: `1280 × 720` (o *Set to screen* se preferisci il riempimento);
   - spunta **"Mobile friendly"** e **"Fullscreen button"**;
   - **Orientation**: *Landscape* va bene, la scacchiera si adatta anche in verticale.
4. **Cover image**: carica `itch/itch-cover.png` (630 × 500).
5. **Screenshots**: carica `docs/phone-game.png`, `docs/panel.png` e
   `docs/cartolina.png`.
6. **Genre**: *Strategy* / *Board Game*; **Tags**: `chess`, `board-game`,
   `2-players`, `pixel-art` solo se pertinente, `hand-drawn`, `italian`.
7. **Pricing**: *No payments*.
8. Salva come **Draft**, prova l'embed in *Preview*, poi pubblica.

## 3. Comportamento dentro l'iframe

itch.io incapsula il gioco in un iframe senza scorrimento esterno. La build
riconosce di girare in un iframe (`is-embedded`) e si adatta:

- la pagina scorre **dentro** il foglio, così nulla resta irraggiungibile;
- da 920px in su il pannello delle impostazioni ha uno scorrimento proprio e
  resta visibile accanto alla scacchiera;
- con finestre basse la testata si compatta, la tagline sparisce e la
  scacchiera si ridimensiona per entrare in altezza;
- il footer lungo viene nascosto (non aggiunge informazioni giocando).

Verificato a 1280×720, 960×600, 1280×800 e 430×700: scacchiera intera,
controlli e impostazioni raggiungibili in tutti i casi.

## 4. Da verificare una volta pubblicato

- La scacchiera si vede subito e la pagina non scrolla orizzontalmente nell'iframe.
- I suoni partono solo dopo il primo tocco (vincolo dei browser sulle WebAudio).
- `localStorage` funziona: palmarès e record di grafologia restano tra una sessione
  e l'altra. Se dovessero azzerarsi, l'embed è in una sandbox più restrittiva del
  previsto.
- Il download della cartolina (PNG) funziona anche dentro l'iframe; su iOS il
  download potrebbe aprire l'immagine invece di salvarla, è un limite del browser.
