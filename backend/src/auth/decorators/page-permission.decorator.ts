import { SetMetadata } from '@nestjs/common';

export const PAGE_PERMISSION_KEY = 'pagePermission';
export const RequirePage = (pageCode: string) =>
  SetMetadata(PAGE_PERMISSION_KEY, pageCode);
