import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';
import type { Page } from '@/common/pagination/page-query.dto';
import { RefundService } from './refund.service';
import { RefundResponseDto, toRefundResponseDto } from './dto/refund-response.dto';
import { ListRefundsQueryDto } from './dto/list-refunds-query.dto';

/** Buyer — o'z refundlarini o'qiydi (bo'lim 17). Yaratish YO'Q — bo'lim 3/16. */
@ApiBearerAuth()
@ApiTags('me-refunds')
@Controller('me/refunds')
@UseGuards(RolesGuard)
@Roles(Role.BUYER)
export class MeRefundController {
  constructor(private readonly refunds: RefundService) {}

  @Get()
  async list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListRefundsQueryDto,
  ): Promise<Page<RefundResponseDto>> {
    const page = await this.refunds.listForBuyer(user.sub, query.page ?? 1, query.perPage ?? 20, query.status);
    return { ...page, items: page.items.map(toRefundResponseDto) };
  }

  @Get(':id')
  @ApiOkResponse({ type: RefundResponseDto })
  async get(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string): Promise<RefundResponseDto> {
    return toRefundResponseDto(await this.refunds.getBuyerOwnedOrThrow(id, user.sub));
  }
}
