import { Body, Controller, Get, HttpCode, HttpException, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';
import { projectGrowth } from '@fjm/shared';
import { PrismaService } from './prisma.service.js';
import { AuthGuard, UserId } from './auth.js';
import { StatsService, todayIct } from './stats.service.js';
import { parse } from './validation.js';
import { tts } from './elevenlabs.js';

const Growth = z.object({
  monthlySaving: z.number().int().min(0).max(1e10),
  annualReturn: z.number().min(-0.5).max(1),
  years: z.number().int().min(1).max(60),
  startBalance: z.number().int().min(0).max(1e12).optional(),
});

@Controller()
@UseGuards(AuthGuard)
export class InsightsController {
  constructor(private stats: StatsService, private prisma: PrismaService) {}

  @Get('insights/summary')
  summary(@UserId() userId: string, @Query('months') months?: string) {
    const n = Math.min(Math.max(Number(months) || 3, 1), 24);
    return this.stats.summary(userId, n);
  }

  @Get('insights/tax')
  tax(@UserId() userId: string, @Query('year') year?: string) {
    const y = Number(year) || Number(todayIct().slice(0, 4));
    if (y < 2000 || y > 2100) throw new HttpException('invalid year', 400);
    return this.stats.tax(userId, y);
  }

  @Post('insights/growth')
  @HttpCode(200)
  growth(@Body() body: unknown) {
    return { points: projectGrowth(parse(Growth, body)) };
  }

  @Get('insights/loan-ready')
  loanReady(@UserId() userId: string) {
    return this.stats.loanReady(userId);
  }

  @Get('streak')
  streak(@UserId() userId: string) {
    return this.stats.streak(userId);
  }

  @Get('voice/weekly/text')
  async weeklyText(@UserId() userId: string) {
    return { text: await this.stats.weeklyText(userId) };
  }

  @Get('voice/weekly')
  async weeklyVoice(@UserId() userId: string, @Res() res: FastifyReply) {
    const audio = await tts(await this.stats.weeklyText(userId));
    return res.header('content-type', 'audio/mpeg').header('cache-control', 'no-store').send(audio);
  }

  @Get('audit')
  async audit(@UserId() userId: string) {
    const rows = await this.prisma.auditLog.findMany({ where: { userId }, orderBy: { id: 'desc' }, take: 200, select: { action: true, target: true, at: true } });
    return { entries: rows };
  }
}
