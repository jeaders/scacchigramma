<p align="center">
  <img src="docs/banner.png" alt="Scacchigramma — scacchi a penna" width="100%">
</p>

<h1 align="center">Scacchigramma</h1>

<p align="center">
  <b>Scacchi a penna, disegnati nel browser.</b><br>
  Ogni partita diventa una pagina di quaderno: le mosse si commentano da sole,<br>
  la penna ti dà un voto in calligrafia e alla fine la partita diventa una cartolina.
</p>

<p align="center">
  <img alt="Licenza: tutti i diritti riservati" src="https://img.shields.io/badge/licenza-tutti_i_diritti_riservati-c0392b">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-3d5a99">
  <img alt="Vite 7" src="https://img.shields.io/badge/Vite-7-f3c954">
  <img alt="Nessun backend" src="https://img.shields.io/badge/backend-nessuno-2f2a24">
</p>

<p align="center">
  <b>▶ Gioca ora: <a href="https://scacchigramma.netlify.app/">scacchigramma.netlify.app</a></b><br>
  <em>Nessuna installazione, nessun account: si apre e si gioca.</em>
</p>

---

## Che cos'è

Scacchigramma è un gioco di scacchi completo che vive su un foglio: la scacchiera è
tracciata a mano, i pezzi sono glifi con ombre e tremolii, le caselle si riempiono di
tratteggi. Non è un'imitazione di una scacchiera digitale: è un quaderno che si apre
nel browser.

Dietro il disegno c'è un gioco vero: regole complete (arrocco, en passant, promozione,
stallo, tripla ripetizione, regola delle 50 mosse), orologi da 10 minuti, due giocatori
sullo stesso dispositivo o una CPU con tre livelli.

Funziona su telefono, tablet e desktop, in verticale e in orizzontale, senza installare
nulla: è una pagina statica, senza backend e senza account. Lo stesso pacchetto gira
anche come gioco HTML5 su itch.io.

L'interfaccia è **bilingue, italiano e inglese**, con lo switch `IT / EN` in testata:
la lingua scelta resta memorizzata nel browser. La versione web parte in italiano, il
pacchetto per itch.io parte in inglese (`?lang=it` per aprirlo in italiano).

## Le funzioni che non trovi altrove

| | |
|---|---|
| **Il quaderno racconta** | Ogni mossa diventa una riga scritta a mano con un giudizio (`✨ lampo`, `👍 buona`, `🩹 sbavatura`) calcolato dal guadagno di valutazione, non da un testo preconfezionato. |
| **Racconto automatico** | Il pulsante ▶ *racconta* rilegge la partita da sola, mossa per mossa, con la scacchiera che torna indietro e il commento in evidenza: un audiolibro della partita. |
| **Grafologia dell'inchiostro** | La penna analizza come giochi e firma la partita: un nome poetico («la partita del pedone incoronato»), un voto in calligrafia su 10 e quattro tratti — Precisione, Fiamma, Calma, Fantasia. La pagina migliore resta salvata come record. |
| **Cartolina della partita** | Un PNG disegnato a mano con posizione finale, apertura, numeri, firma e voto: pronto da scaricare e condividere. |
| **Mappa dell'inchiostro** | Le case più battute si riempiono di tratteggio: si vede a colpo d'occhio dove si è combattuto. |
| **Suggerimento spiegato** | Il motore propone la mossa e dice perché: «nettamente la migliore (+1.8 pedoni)», «si porta a casa la Donna», «matto forzato». |

## Screenshot

<p align="center">
  <img src="docs/phone-game.png" alt="Scacchigramma su smartphone: scacchiera a penna con partita in corso" width="290">
  &nbsp;&nbsp;
  <img src="docs/panel.png" alt="Il quaderno narrante e la grafologia dell'inchiostro su smartphone" width="290">
</p>

<p align="center">
  <em>Su telefono: scacchiera, quaderno narrante, grafologia e taccuino, con la barra dei comandi sotto il pollice.</em>
</p>

<p align="center">
  <img src="docs/cartolina.png" alt="Cartolina della partita generata in PNG" width="420">
</p>

<p align="center">
  <em>La cartolina generata dal gioco: scacchiera finale, apertura, numeri della partita, firma e voto.</em>
</p>

## Come si gioca

- **Mosso**: tocca un pezzo — le case legali si illuminano — poi tocca la destinazione. Funziona anche il trascinamento.
- **Modalità**: due giocatori sullo stesso schermo, oppure contro la CPU (facile / media / difficile) scegliendo il colore.
- **Comandi**: Nuova partita, Annulla (anche a partita finita), Ruota la scacchiera, Suoni, lingua (`IT / EN`) e cambio foglio (Quaderno ✏️ / Lavagna 🧑‍🏫).
- **Revisione**: tocca una mossa nello storico per rivedere la posizione; `←` e `→` scorrono la partita.

### Scorciatoie da tastiera

| Tasto | Azione |
|---|---|
| `H` | Suggerisci una mossa |
| `U` | Annulla l'ultima mossa |
| `F` | Ruota la scacchiera |
| `N` | Nuova partita |
| `T` | Cambia foglio (quaderno / lavagna) |
| `M` | Mappa dell'inchiostro |
| `←` `→` | Mossa precedente / successiva |
| `Esc` | Torna al presente |

## Come funziona

- **React 19 + TypeScript**, build con **Vite 7** e Tailwind CSS 4.
- **Scacchiera in canvas**: griglia, caselle e bordi sono tracciati da una piccola libreria di
  linee "traballanti", i pezzi sono glifi Unicode con ombre, animazioni e particelle
  d'inchiostro; la lavagna ha polvere di gesso.
- **Regole**: [chess.js](https://github.com/jhlywa/chess.js) 1.4 gestisce legalità, scacco matto,
  patta e notazione.
- **Motore**: minimax con potatura alpha-beta, valutazione materiale + tabelle posizionali e
  ordinamento delle catture.
- **Suoni**: sintetizzati in WebAudio all'istante — nessun file audio.
- **Lingue**: tutti i testi passano da un dizionario IT/EN in `src/lib/i18n.ts`;
  la lingua predefinita è iniettata dalla build (italiano sul sito, inglese su itch.io),
  la scelta dell'utente resta in `localStorage` e si può forzare con `?lang=it` / `?lang=en`.
- **Memoria locale**: palmarès, preferenze, record di grafologia in `localStorage`.
- **Build a file unico**: CSS, font, icone e codice finiscono in un solo `index.html`
  (~600 kB), così il gioco funziona anche aperto da disco o incapsulato in un iframe.

## Codice sorgente

Questo repository è **pubblico e contiene il codice sorgente** del gioco, ma il progetto
**non è open source**: il repository serve a mostrare com'è fatto il gioco e ad
alimentare il deploy automatico su Netlify. La presenza del codice qui non concede alcun
permesso: copia, ridistribuzione, riutilizzo e opere derivate richiedono un'autorizzazione
scritta (vedi [LICENSE](LICENSE)).

Il gioco pubblicato è una pagina statica autosufficiente, servita su
[scacchigramma.netlify.app](https://scacchigramma.netlify.app/): puoi usarla, linkarla e
incorporarla, ma non puoi riutilizzarne il codice. Il pacchetto HTML5 per itch.io è
descritto in [`itch/ISTRUZIONI-ITCH.md`](itch/ISTRUZIONI-ITCH.md).

## Licenza

Codice, testi, disegni e suoni sono **© [Alex Mirici](https://alexmirici.netlify.app) Web Developer** — tutti i diritti riservati:
vedi [LICENSE](LICENSE). Nessun permesso d'uso è concesso senza autorizzazione scritta.

Il progetto include componenti di terzi con licenze proprie — chess.js (BSD-2-Clause),
i font Caveat e Patrick Hand (SIL OFL 1.1) e le librerie runtime React, clsx e
tailwind-merge (MIT): i testi completi sono in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
