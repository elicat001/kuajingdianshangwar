import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AgentService } from './agent.service';

@ApiTags('Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI data assistant' })
  async chat(
    @CurrentUser('companyId') companyId: string,
    @Body('question') question: string,
    @Body('message') message: string,
    @Body('sessionId') sessionId?: string,
  ) {
    const input = (question || message || '').trim();
    return this.agentService.chat(companyId, input);
  }

  @Get('capabilities')
  @ApiOperation({ summary: 'Get available agent tools and example queries' })
  getCapabilities() {
    return {
      tools: [
        {
          name: 'sales',
          description: '销量查询：按 SKU/品名查询销量件数和销售额',
          examples: ['想看 XX-SKU-001 的销量', '查一下某某产品卖了多少'],
        },
        {
          name: 'promotion',
          description: '推广费查询：按 SKU/广告名查询推广花费',
          examples: ['XX 的推广费是多少', '查一下广告花费'],
        },
        {
          name: 'inventory',
          description: '库存查询：按 SKU 查询可用库存',
          examples: ['XX 的库存还有多少', '查一下可用库存'],
        },
        {
          name: 'link_analysis',
          description: 'SKU 分析/链接分析：查询商品表现数据',
          examples: ['分析一下 XX 的表现', 'XX 的链接分析'],
        },
      ],
      exampleQueries: [
        '想看 SKU-001 的销量和推广数据',
        '"某某产品"的库存',
        '帮我分析一下 XX 的表现',
        '查一下最近的推广花费',
      ],
    };
  }
}
