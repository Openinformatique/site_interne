import type { FileStoragePort } from '../../storage/domain/file-storage.port';
import type { CommandeFichePort } from '../domain/commande-fiche.port';
import { CommandeDocumentsUseCase } from './commande-documents.use-case';

function setup(addDocument: () => Promise<number>) {
  const deleted: string[] = [];
  const fiche = {
    findCommande: () => Promise.resolve({ id: 7 }),
    parametreExists: () => Promise.resolve(true),
    addDocument,
    listDocuments: () => Promise.resolve([]),
    findDocumentFichier: () =>
      Promise.resolve({
        id: 3,
        nomFichier: 'a.pdf',
        typeMime: 'application/pdf',
        fichierIdentifiant: 'f-3',
      }),
    deleteDocument: () => Promise.resolve(),
  } as unknown as CommandeFichePort;
  const storage = {
    save: () =>
      Promise.resolve({
        identifier: 'f-1',
        originalName: 'a.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 3,
        storedAt: new Date(),
      }),
    delete: (identifier: string) => {
      deleted.push(identifier);
      return identifier === 'f-3'
        ? Promise.reject(new Error('absent'))
        : Promise.resolve();
    },
  } as unknown as FileStoragePort;
  return { useCase: new CommandeDocumentsUseCase(fiche, storage), deleted };
}

const document = {
  typeDocument: 'DEVIS',
  commentaire: null,
  file: {
    originalName: 'a.pdf',
    mimeType: 'application/pdf',
    content: Buffer.from('pdf'),
  },
};

describe('CommandeDocumentsUseCase', () => {
  it('supprime le fichier stocké si l’enregistrement en base échoue', async () => {
    const { useCase, deleted } = setup(() => Promise.reject(new Error('base')));
    await expect(useCase.add(7, document, 'u')).rejects.toThrow('base');
    expect(deleted).toEqual(['f-1']);
  });

  it('supprime la référence même si le fichier est déjà absent du stockage', async () => {
    const { useCase, deleted } = setup(() => Promise.resolve(3));
    await expect(useCase.delete(7, 3)).resolves.toBeUndefined();
    expect(deleted).toEqual(['f-3']);
  });
});
