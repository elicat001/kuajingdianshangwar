import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateMigrationDto {
  @IsString() sourceCampaignId: string;
  @IsString() targetCampaignId: string;
  @IsOptional() @IsString() sourceSkuId?: string;
  @IsOptional() @IsString() targetSkuId?: string;
  @IsNumber() migratedAmount: number;
}
