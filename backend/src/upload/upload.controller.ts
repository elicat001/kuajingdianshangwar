import { Controller, Get, Post, Delete, Param, Query, UploadedFile, UseInterceptors, UseGuards, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get()
  async getUploads(
    @CurrentUser('companyId') companyId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const data = await this.uploadService.getUploads(companyId, +page, +pageSize);
    return { code: 0, data };
  }

  /**
   * Upload an Excel file for any supported dataType:
   * sales_report, inventory_report, promotion_fee, product_performance, product_info
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('dataType') dataType: string,
    @Body('storeId') storeId: string,
    @Body('siteId') siteId: string,
    @Body('reportDate') reportDate: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.uploadService.processUpload(
      file, dataType, user.companyId, user.sub,
      { storeId, siteId, reportDate },
    );
    return { code: 0, message: '上传成功', data: result };
  }

  /**
   * Upload product info as JSON body (Feishu Bitable format or flat JSON).
   * Body: { items: [...], storeId?: string, siteId?: string, skipExisting?: boolean }
   */
  @Post('product-info')
  async uploadProductInfoJson(
    @Body() body: { items: any[]; storeId?: string; siteId?: string; skipExisting?: boolean },
    @CurrentUser() user: any,
  ) {
    const result = await this.uploadService.processJsonUpload(
      'product_info',
      body.items,
      user.companyId,
      user.sub,
      {
        storeId: body.storeId,
        siteId: body.siteId,
        skipExisting: body.skipExisting,
      },
    );
    return { code: 0, message: '上传成功', data: result };
  }

  @Delete(':id')
  async deleteUpload(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    const result = await this.uploadService.deleteUpload(id, companyId);
    return { code: 0, ...result };
  }
}
