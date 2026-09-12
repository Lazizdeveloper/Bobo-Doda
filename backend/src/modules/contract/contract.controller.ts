import { Body, Controller, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AccountStatusGuard } from '@/common/guards/account-status.guard';
import { IdempotencyService } from '@/common/idempotency/idempotency.service';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { ContractResponseDto, toContractResponseDto } from './dto/contract-response.dto';

const ENDPOINT = 'POST /contracts';

/**
 * Yaratish — ATAYLAB bare `/contracts` (buyer resurs "to'plamiga" yangi
 * a'zo qo'shadi), qolgan barcha amal `/me/contracts/*` (`MeContractController`).
 * Bo'lim 33 — ixtiyoriy `Idempotency-Key`: tarmoq retry ikkilanchi Contract
 * yaratmasin.
 */
@ApiBearerAuth()
@ApiTags('contracts')
@Controller('contracts')
@UseGuards(RolesGuard, AccountStatusGuard)
@Roles(Role.BUYER)
export class ContractController {
  constructor(
    private readonly contracts: ContractService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiOkResponse({ type: ContractResponseDto })
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateContractDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<ContractResponseDto> {
    const { body } = await this.idempotency.run(
      { key: idempotencyKey, userId: user.sub, endpoint: ENDPOINT, requestPayload: dto },
      async () => {
        const contract = await this.contracts.create(user.sub, dto);
        return { statusCode: 200, body: toContractResponseDto(contract) };
      },
    );
    return body;
  }
}
