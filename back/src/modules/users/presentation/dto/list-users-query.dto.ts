import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { UserRole } from '../../domain/user-role.enum';

/**
 * Paramètres de GET /users : pagination/tri/recherche communs du socle,
 * plus les filtres rôle et statut actif.
 */
export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtre sur le rôle applicatif.',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message: 'Le paramètre "role" doit valoir ADMIN, DIRECTION ou EMPLOYEE.',
  })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Filtre sur le statut actif ("true" ou "false").',
    type: Boolean,
  })
  @IsOptional()
  // Query string : la valeur arrive en chaîne, convertie explicitement.
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({
    message: 'Le paramètre "isActive" doit valoir "true" ou "false".',
  })
  isActive?: boolean;
}
