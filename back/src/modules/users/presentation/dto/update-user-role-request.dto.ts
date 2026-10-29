import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../../domain/user-role.enum';

/** Corps de PATCH /users/:id/role. */
export class UpdateUserRoleRequestDto {
  @ApiProperty({ enum: UserRole, example: UserRole.Manager })
  @IsEnum(UserRole, {
    message: 'Le rôle doit valoir ADMIN, MANAGER ou EMPLOYEE.',
  })
  role!: UserRole;
}
