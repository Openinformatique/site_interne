import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { createHash, randomUUID } from 'node:crypto';
import {
  AccessTokenInvalidException,
  RefreshTokenInvalidException,
} from '../../../common/exceptions/app-exceptions';
import { authConfig } from '../../../config/auth.config';
import { UserRole } from '../../users/domain/user-role.enum';

/** Claims portés par les jetons du socle. */
export interface TokenPayload {
  /** Identifiant de l'utilisateur. */
  sub: string;
  /** Identifiant de la session. */
  sid: string;
  /** Identifiant unique du jeton. */
  jti: string;
  /**
   * Rôle applicatif — porté UNIQUEMENT par l'access token (courte durée) :
   * un changement de rôle est effectif au plus tard à son expiration, le
   * refresh relisant le rôle en base. Absent des refresh tokens.
   */
  role?: UserRole;
  iat: number;
  exp: number;
}

/** Jeton généré accompagné de sa date d'expiration. */
export interface GeneratedToken {
  token: string;
  expiresAt: Date;
}

/**
 * Service de génération et vérification des JWT.
 *
 * - access token : durée courte, transmis dans Authorization: Bearer ;
 * - refresh token : durée longue, secret DISTINCT, transmis en cookie
 *   HttpOnly, jamais stocké en clair (seule son empreinte SHA-256 est
 *   conservée en base pour comparaison lors des rotations).
 *
 * Les payloads restent volontairement minimaux (sub, sid, jti, et le rôle
 * pour le seul access token) : aucune autre donnée personnelle ou de
 * permission n'est embarquée dans les jetons.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  async generateAccessToken(
    userId: string,
    sessionId: string,
    role: UserRole,
  ): Promise<GeneratedToken> {
    return this.generate(
      userId,
      sessionId,
      this.config.accessTokenSecret,
      this.config.accessTokenExpiration,
      role,
    );
  }

  async generateRefreshToken(
    userId: string,
    sessionId: string,
  ): Promise<GeneratedToken> {
    return this.generate(
      userId,
      sessionId,
      this.config.refreshTokenSecret,
      this.config.refreshTokenExpiration,
    );
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      return await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.config.accessTokenSecret,
      });
    } catch {
      throw new AccessTokenInvalidException();
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      return await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.config.refreshTokenSecret,
      });
    } catch {
      throw new RefreshTokenInvalidException();
    }
  }

  /**
   * Empreinte SHA-256 d'un refresh token.
   *
   * SHA-256 (et non Argon2) : le token est déjà une valeur à très haute
   * entropie signée cryptographiquement ; une empreinte rapide et
   * déterministe suffit et permet la comparaison directe en base.
   */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async generate(
    userId: string,
    sessionId: string,
    secret: string,
    expiresIn: string,
    role?: UserRole,
  ): Promise<GeneratedToken> {
    const token = await this.jwtService.signAsync(
      {
        sub: userId,
        sid: sessionId,
        jti: randomUUID(),
        ...(role !== undefined ? { role } : {}),
      },
      // La durée configurée ("15m", "7d") correspond au format StringValue
      // attendu par jsonwebtoken ; la validation d'environnement garantit
      // une chaîne non vide.
      { secret, expiresIn: expiresIn as StringValue },
    );

    // L'expiration est relue depuis le jeton signé : une seule source
    // de vérité, pas de double interprétation de la durée configurée.
    const payload = this.jwtService.decode<TokenPayload>(token);
    return { token, expiresAt: new Date(payload.exp * 1000) };
  }
}
