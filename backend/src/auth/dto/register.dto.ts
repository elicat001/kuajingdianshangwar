import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[\p{L}\p{N}\s\-'.]+$/u, {
    message: 'Display name contains invalid characters',
  })
  @Transform(({ value }) => value?.trim())
  displayName: string;

  @ApiProperty({ example: 'My Company' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Matches(/^[\p{L}\p{N}\s\-&'.(),]+$/u, {
    message: 'Company name contains invalid characters',
  })
  @Transform(({ value }) => value?.trim())
  companyName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'Avatar must be a valid URL' })
  @MaxLength(2048)
  avatar?: string;
}
