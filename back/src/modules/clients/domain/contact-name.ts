/**
 * Nom d'un contact : stocké dans une seule colonne au format « NOM,Prénom »
 * (format de l'application historique), saisi en deux champs.
 */

/** Découpe « NOM,Prénom » ; sans virgule, tout est considéré comme le nom. */
export function splitNomContact(value: string | null): {
  nom: string;
  prenom: string | null;
} {
  const raw = (value ?? '').trim();
  const comma = raw.indexOf(',');
  if (comma < 0) {
    return { nom: raw, prenom: null };
  }
  const prenom = raw.slice(comma + 1).trim();
  return { nom: raw.slice(0, comma).trim(), prenom: prenom || null };
}

/** Recompose « NOM,Prénom » ; le nom est forcé en majuscules. */
export function joinNomContact(nom: string, prenom: string | null): string {
  const upperNom = nom.trim().toUpperCase();
  const cleanPrenom = (prenom ?? '').trim();
  return cleanPrenom ? `${upperNom},${cleanPrenom}` : upperNom;
}
