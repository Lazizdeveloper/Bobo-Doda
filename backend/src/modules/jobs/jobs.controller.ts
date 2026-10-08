import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '@/modules/auth/types/token-payload';
import { AccountStatusGuard } from '@/common/guards/account-status.guard';
import { Page } from '@/common/pagination/page-query.dto';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';
import { JobResponseDto, toJobResponseDto } from './dto/job-response.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Public()
  @Get()
  async list(@Query() query: ListJobsQueryDto): Promise<Page<JobResponseDto>> {
    const page = await this.jobs.listPublic(query);
    return { ...page, items: page.items.map(toJobResponseDto) };
  }

  @ApiBearerAuth()
  @Get('mine')
  @UseGuards(AccountStatusGuard)
  async listMine(
    @CurrentUser() user: AccessTokenPayload,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ): Promise<Page<JobResponseDto>> {
    const p = page ? Number(page) : 1;
    const pp = perPage ? Number(perPage) : 50;
    const res = await this.jobs.listMine(user.sub, p, pp);
    return { ...res, items: res.items.map(toJobResponseDto) };
  }

  @Public()
  @Get(':id')
  @ApiOkResponse({ type: JobResponseDto })
  async get(@Param('id') id: string): Promise<JobResponseDto> {
    const job = await this.jobs.getByIdOrThrow(id);
    return toJobResponseDto(job);
  }

  @ApiBearerAuth()
  @Post()
  @HttpCode(200)
  @UseGuards(AccountStatusGuard)
  @ApiOkResponse({ type: JobResponseDto })
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateJobDto,
  ): Promise<JobResponseDto> {
    const job = await this.jobs.create(user.sub, dto);
    return toJobResponseDto(job);
  }

  @ApiBearerAuth()
  @Patch(':id/close')
  @UseGuards(AccountStatusGuard)
  @ApiOkResponse({ type: JobResponseDto })
  async close(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<JobResponseDto> {
    const job = await this.jobs.close(id, user.sub);
    return toJobResponseDto(job);
  }

  @ApiBearerAuth()
  @Post(':id/close')
  @HttpCode(200)
  @UseGuards(AccountStatusGuard)
  @ApiOkResponse({ type: JobResponseDto })
  async closePost(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<JobResponseDto> {
    const job = await this.jobs.close(id, user.sub);
    return toJobResponseDto(job);
  }
}
