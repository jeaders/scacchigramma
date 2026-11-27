// Riconoscimento dell'apertura dalle prime mosse in notazione algebrica.
// Il libro mappa le mosse su chiavi di traduzione: i nomi vivono in lib/i18n.ts.
import type { TranslationKey } from "./i18n";

const BOOK: Record<string, TranslationKey> = {
  e4: "op.e4",
  "e4 e5": "op.e4e5",
  "e4 e5 Nf3": "op.e4e5Nf3",
  "e4 e5 Nf3 Nc6": "op.e4e5Nf3Nc6",
  "e4 e5 Nf3 Nc6 Bb5": "op.e4e5Nf3Nc6Bb5",
  "e4 e5 Nf3 Nc6 Bb5 a6": "op.e4e5Nf3Nc6Bb5a6",
  "e4 e5 Nf3 Nc6 Bc4": "op.e4e5Nf3Nc6Bc4",
  "e4 e5 Nf3 Nc6 Bc4 Bc5": "op.e4e5Nf3Nc6Bc4Bc5",
  "e4 e5 Nf3 Nc6 Bc4 Nf6": "op.e4e5Nf3Nc6Bc4Nf6",
  "e4 e5 Nf3 Nc6 d4": "op.e4e5Nf3Nc6d4",
  "e4 e5 Nf3 Nf6": "op.e4e5Nf3Nf6",
  "e4 e5 f4": "op.e4e5f4",
  "e4 c5": "op.e4c5",
  "e4 c5 Nf3": "op.e4c5Nf3",
  "e4 c5 Nf3 d6": "op.e4c5Nf3d6",
  "e4 c5 Nf3 Nc6": "op.e4c5Nf3Nc6",
  "e4 c6": "op.e4c6",
  "e4 e6": "op.e4e6",
  "e4 d5": "op.e4d5",
  "e4 Nf6": "op.e4Nf6",
  "e4 d6": "op.e4d6",
  "e4 g6": "op.e4g6",
  d4: "op.d4",
  "d4 d5": "op.d4d5",
  "d4 d5 c4": "op.d4d5c4",
  "d4 d5 c4 e6": "op.d4d5c4e6",
  "d4 d5 c4 dxc4": "op.d4d5c4dxc4",
  "d4 d5 c4 c6": "op.d4d5c4c6",
  "d4 Nf6": "op.d4Nf6",
  "d4 Nf6 c4": "op.d4Nf6c4",
  "d4 Nf6 c4 g6": "op.d4Nf6c4g6",
  "d4 Nf6 c4 e6": "op.d4Nf6c4e6",
  "d4 Nf6 c4 e6 Nc3 Bb4": "op.d4Nf6c4e6Nc3Bb4",
  "d4 f5": "op.d4f5",
  c4: "op.c4",
  "c4 e5": "op.c4e5",
  Nf3: "op.Nf3",
  "Nf3 d5": "op.Nf3d5",
  g3: "op.g3",
  b3: "op.b3",
  f4: "op.f4",
  b4: "op.b4",
  a3: "op.a3",
};

/** Ritorna la chiave dell'apertura più specifica riconosciuta, oppure null. */
export function detectOpening(sanMoves: string[]): TranslationKey | null {
  let found: TranslationKey | null = null;
  for (let i = Math.min(sanMoves.length, 8); i >= 1; i--) {
    const key = sanMoves.slice(0, i).join(" ");
    if (BOOK[key]) {
      found = BOOK[key];
      break;
    }
  }
  return found;
}
