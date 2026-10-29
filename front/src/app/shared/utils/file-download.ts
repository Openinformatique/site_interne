/**
 * Déclenche le téléchargement d'un Blob dans le navigateur via une ancre
 * temporaire. Utilisé par tous les exports (couplé à ApiClient.download).
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
