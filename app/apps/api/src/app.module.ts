import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PrismaService } from './prisma.service.js';
import { AuditService } from './audit.service.js';
import { StatsService } from './stats.service.js';
import { AuthController, AuthGuard } from './auth.js';
import { ProfileController } from './profile.controller.js';
import { UploadsController } from './uploads.controller.js';
import { TransactionsController } from './transactions.controller.js';
import { InsightsController } from './insights.controller.js';
import { HttpErrorFilter } from './http-error.filter.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.js';
import { AccountController, SecurityController } from './security.controller.js';
import { SlipsController } from './slips.controller.js';

@Module({
  controllers: [AuthController, ProfileController, UploadsController, TransactionsController, InsightsController, ChatController, SlipsController, SecurityController, AccountController],
  providers: [PrismaService, AuditService, StatsService, AuthGuard, ChatService, { provide: APP_FILTER, useClass: HttpErrorFilter }],
})
export class AppModule {}
