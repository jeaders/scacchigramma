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
with zipfile.ZipFile("itch/scacchigramma-itch.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for base, _, files in os.walk(root):
        for f in files:
            p = os.path.join(base, f)
            z.write(p, os.path.relpath(p, root))
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

## 3. Da verificare una volta pubblicato

- La scacchiera si vede subito e la pagina non scrolla orizzontalmente nell'iframe.
- I suoni partono solo dopo il primo tocco (vincolo dei browser sulle WebAudio).
- `localStorage` funziona: palmarès e record di grafologia restano tra una sessione
  e l'altra. Se dovessero azzerarsi, l'embed è in una sandbox più restrittiva del
  previsto.
- Il download della cartolina (PNG) funziona anche dentro l'iframe; su iOS il
  download potrebbe aprire l'immagine invece di salvarla, è un limite del browser.
