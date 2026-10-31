import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import {
  ResourceNotFoundException,
  ValidationException,
} from '../../../common/exceptions/app-exceptions';
import { FILE_STORAGE } from '../../storage/domain/file-storage.port';
import type {
  FileStoragePort,
  FileToStore,
} from '../../storage/domain/file-storage.port';
import { COMMANDE_FICHE } from '../domain/commande-fiche.port';
import type {
  CommandeDocument,
  CommandeDocumentFichier,
  CommandeFichePort,
} from '../domain/commande-fiche.port';

export interface DocumentToAdd {
  typeDocument: string;
  commentaire: string | null;
  file: FileToStore;
}

/**
 * Cas d'utilisation : documents d'une commande. Le fichier est confié au
 * stockage (FileStoragePort, types et taille contrôlés par la
 * configuration) ; la table `documents_commande` n'en garde que la
 * référence et les métadonnées. Ajout et suppression sont immédiats.
 */
@Injectable()
export class CommandeDocumentsUseCase {
  constructor(
    @Inject(COMMANDE_FICHE) private readonly fiche: CommandeFichePort,
    @Inject(FILE_STORAGE) private readonly storage: FileStoragePort,
  ) {}

  async list(commandeId: number): Promise<CommandeDocument[]> {
    await this.assertCommande(commandeId);
    return this.fiche.listDocuments(commandeId);
  }

  async add(
    commandeId: number,
    document: DocumentToAdd,
    userId: string,
  ): Promise<CommandeDocument> {
    await this.assertCommande(commandeId);
    if (!(await this.fiche.parametreExists('TDOC', document.typeDocument))) {
      throw new ValidationException([
        { field: 'typeDocument', message: 'Type de document inconnu.' },
      ]);
    }

    const stored = await this.storage.save(document.file);
    let id: number;
    try {
      id = await this.fiche.addDocument(
        {
          commandeId,
          typeDocument: document.typeDocument,
          commentaire: document.commentaire,
          nomFichier: stored.originalName,
          typeMime: stored.mimeType,
          tailleOctets: stored.sizeBytes,
          fichierIdentifiant: stored.identifier,
        },
        userId,
      );
    } catch (error) {
      // Pas de fichier orphelin si l'enregistrement en base échoue.
      await this.storage.delete(stored.identifier).catch(() => undefined);
      throw error;
    }

    const added = (await this.fiche.listDocuments(commandeId)).find(
      (candidate) => candidate.id === id,
    );
    if (!added) {
      throw new ResourceNotFoundException('Le document');
    }
    return added;
  }

  async read(
    commandeId: number,
    documentId: number,
  ): Promise<{ fichier: CommandeDocumentFichier; stream: Readable }> {
    const fichier = await this.findFichier(commandeId, documentId);
    return {
      fichier,
      stream: await this.storage.read(fichier.fichierIdentifiant),
    };
  }

  async delete(commandeId: number, documentId: number): Promise<void> {
    const fichier = await this.findFichier(commandeId, documentId);
    await this.fiche.deleteDocument(fichier.id);
    // Fichier déjà absent du stockage : la référence est supprimée quand même.
    await this.storage
      .delete(fichier.fichierIdentifiant)
      .catch(() => undefined);
  }

  private async assertCommande(commandeId: number): Promise<void> {
    if (!(await this.fiche.findCommande(commandeId))) {
      throw new ResourceNotFoundException('La commande');
    }
  }

  private async findFichier(
    commandeId: number,
    documentId: number,
  ): Promise<CommandeDocumentFichier> {
    const fichier = await this.fiche.findDocumentFichier(
      commandeId,
      documentId,
    );
    if (!fichier) {
      throw new ResourceNotFoundException('Le document');
    }
    return fichier;
  }
}
