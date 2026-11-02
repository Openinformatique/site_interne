/** Morceau de texte, surligné s'il correspond à un terme recherché. */
export interface Segment {
  texte: string;
  surligne: boolean;
}

/**
 * Découpe un texte en morceaux, en surlignant chaque occurrence des termes
 * sans tenir compte de la casse ni des accents (« Corail » trouve « CoRail »,
 * « eleve » trouve « Élevé »), comme la recherche côté serveur.
 */
export function segments(texte: string | null | undefined, termes: readonly string[]): Segment[] {
  const source = texte ?? '';
  if (!source) {
    return [];
  }
  // Texte normalisé caractère par caractère, avec la position d'origine de chacun.
  let normalise = '';
  const origine: number[] = [];
  for (let index = 0; index < source.length; index++) {
    for (const caractere of normaliser(source[index]!)) {
      normalise += caractere;
      origine.push(index);
    }
  }

  const marque = new Array<boolean>(source.length).fill(false);
  for (const terme of termes.map(normaliser).filter(Boolean)) {
    for (let debut = normalise.indexOf(terme); debut >= 0; debut = normalise.indexOf(terme, debut + 1)) {
      for (let k = debut; k < debut + terme.length; k++) {
        marque[origine[k]!] = true;
      }
    }
  }

  const resultat: Segment[] = [];
  for (let index = 0; index < source.length; index++) {
    const dernier = resultat[resultat.length - 1];
    if (dernier && dernier.surligne === marque[index]) {
      dernier.texte += source[index];
    } else {
      resultat.push({ texte: source[index]!, surligne: marque[index]! });
    }
  }
  return resultat;
}

function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
