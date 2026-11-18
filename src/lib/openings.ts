// Riconoscimento dell'apertura dalle prime mosse in notazione algebrica.
const BOOK: Record<string, string> = {
  "e4": "Apertura di Re 👑",
  "e4 e5": "Partita Aperta 📖",
  "e4 e5 Nf3": "Giuoco aperto 🐎",
  "e4 e5 Nf3 Nc6": "Difesa classica 🛡️",
  "e4 e5 Nf3 Nc6 Bb5": "Spagnola (Ruy López) 🇪🇸",
  "e4 e5 Nf3 Nc6 Bb5 a6": "Spagnola, Morphy 🇪🇸",
  "e4 e5 Nf3 Nc6 Bc4": "Partita Italiana 🇮🇹",
  "e4 e5 Nf3 Nc6 Bc4 Bc5": "Giuoco Piano 🎹",
  "e4 e5 Nf3 Nc6 Bc4 Nf6": "Difesa dei due cavalli 🐎🐎",
  "e4 e5 Nf3 Nc6 d4": "Gambetto Scozzese 🏴",
  "e4 e5 Nf3 Nf6": "Difesa di Petrov 🇷🇺",
  "e4 e5 f4": "Gambetto di Re ♛",
  "e4 c5": "Difesa Siciliana 🌋",
  "e4 c5 Nf3": "Siciliana aperta 🌋",
  "e4 c5 Nf3 d6": "Siciliana, Najdorf-ish 🌋",
  "e4 c5 Nf3 Nc6": "Siciliana vecchia 🌋",
  "e4 c6": "Difesa Caro-Kann 🥕",
  "e4 e6": "Difesa Francese 🥖",
  "e4 d5": "Difesa Scandinava ❄️",
  "e4 Nf6": "Difesa Alekhine 🎯",
  "e4 d6": "Difesa Pirc 🏔️",
  "e4 g6": "Difesa Moderna 🔭",
  "d4": "Apertura di Donna ♛",
  "d4 d5": "Partita di Donna 👑",
  "d4 d5 c4": "Gambetto di Donna 🎁",
  "d4 d5 c4 e6": "Gambetto di Donna rifiutato 🙅",
  "d4 d5 c4 dxc4": "Gambetto di Donna accettato 🙆",
  "d4 d5 c4 c6": "Difesa Slava 🏰",
  "d4 Nf6": "Difese Indiane 🐘",
  "d4 Nf6 c4": "Complesso indiano 🐘",
  "d4 Nf6 c4 g6": "Difesa Est-Indiana 🌅",
  "d4 Nf6 c4 e6": "Difesa Nimzo/Queen's Indian 🌙",
  "d4 Nf6 c4 e6 Nc3 Bb4": "Difesa Nimzo-Indiana 🦴",
  "d4 f5": "Difesa Olandese 🌷",
  "c4": "Apertura Inglese 🫖",
  "c4 e5": "Inglese rovesciata 🔄",
  "Nf3": "Apertura Réti 🎻",
  "Nf3 d5": "Réti classica 🎻",
  "g3": "Apertura Barcza 🧱",
  "b3": "Apertura Larsen 🇩🇰",
  "f4": "Apertura Bird 🐦",
  "b4": "Apertura Sokolsky 🦦",
  "a3": "Apertura Anderssen 🕰️",
};

/** Ritorna il nome dell'apertura più specifico riconosciuto, oppure null. */
export function detectOpening(sanMoves: string[]): string | null {
  let found: string | null = null;
  for (let i = Math.min(sanMoves.length, 8); i >= 1; i--) {
    const key = sanMoves.slice(0, i).join(" ");
    if (BOOK[key]) {
      found = BOOK[key];
      break;
    }
  }
  return found;
}
