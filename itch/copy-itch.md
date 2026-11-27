# Testi pronti per la pagina itch.io

Limite del campo **Short description**: 120 caratteri (spazi inclusi). Se incolli
la descrizione lunga lì, itch.io rifiuta il salvataggio con
«short description — expected text between 1 and 120 characters».

## Titolo (Title)

```
Scacchigramma — scacchi a penna
```

## Short description — italiano (114 caratteri)

```
Scacchi a penna: ogni partita diventa una pagina di quaderno con commenti, voto in calligrafia e cartolina finale.
```

## Short description — inglese (102 caratteri)

```
Hand-drawn chess: each game becomes a notebook page with commentary, calligraphy grade and a postcard.
```

## Descrizione (Description)

itch.io accetta un sottoinsieme di HTML (<p>, <strong>, <em>, <ul>, <li>, <a>):

```html
<p><strong>Scacchi disegnati a penna, dentro il browser.</strong> La scacchiera è
tracciata a mano, i pezzi sono glifi con ombre e tremolii, le caselle si riempiono di
tratteggi: non è una scacchiera digitale, è un quaderno che si apre.</p>

<p>Dietro il disegno c'è un gioco vero: regole complete (arrocco, en passant,
promozione, stallo, tripla ripetizione, regola delle 50 mosse), orologi da 10 minuti,
due giocatori sullo stesso dispositivo oppure una CPU con tre livelli.</p>

<ul>
  <li><strong>Il quaderno racconta</strong> — ogni mossa è una riga scritta a mano con un giudizio: ✨ lampo, 👍 buona, 🩹 sbavatura.</li>
  <li><strong>Racconto automatico</strong> — il pulsante ▶ rilegge la partita da sola, mossa per mossa.</li>
  <li><strong>Grafologia dell'inchiostro</strong> — la penna firma la partita: un nome poetico, un voto in calligrafia su 10 e quattro tratti.</li>
  <li><strong>Cartolina della partita</strong> — un PNG disegnato a mano con posizione finale, apertura, firma e voto, pronto da scaricare.</li>
  <li><strong>Mappa dell'inchiostro</strong> — le case più battute si riempiono di tratteggio.</li>
  <li><strong>Suggerimento spiegato</strong> — il motore propone la mossa e dice perché.</li>
</ul>

<p>Funziona su telefono, tablet e desktop, in verticale e in orizzontale. Nessuna
installazione, nessun account, nessun backend: è una pagina statica. Palmarès e
record restano salvati sul tuo dispositivo.</p>

<p>Scorciatoie: <em>H</em> suggerimento, <em>U</em> annulla, <em>F</em> ruota,
<em>N</em> nuova partita, <em>T</em> cambia foglio, <em>←</em> <em>→</em> scorrono
la partita.</p>

<p>Versione web: <a href="https://scacchigramma.netlify.app/">scacchigramma.netlify.app</a></p>
```

## Impostazioni della pagina

| Campo | Valore |
|---|---|
| Kind of project | **HTML** |
| Upload | `itch/scacchigramma-itch.zip` + spunta «This file will be played in the browser» |
| Embed | 1280 × 720, «Mobile friendly», «Fullscreen button» |
| Cover image | `itch/itch-cover.png` (630 × 500) |
| Screenshots | `docs/phone-game.png`, `docs/panel.png`, `docs/cartolina.png` |
| Genre | Strategy |
| Tags | `chess`, `board-game`, `hand-drawn`, `2-players`, `strategy`, `italian` |
| Pricing | No payments |
| Release status | Released |
| Language | English, Italian — il gioco parte in inglese, lo switch IT/EN è in testata |
