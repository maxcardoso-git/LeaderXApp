import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER } from '@nestjs/core';

// Infrastructure
import { PrismaModule } from './infrastructure/prisma/prisma.module';

// Common modules
import { RequestContextModule } from './common/request-context/request-context.module';
import { RequestContextMiddleware } from './common/request-context/request-context.middleware';
import { ErrorsModule } from './common/errors/errors.module';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { RetryModule } from './common/retry/retry.module';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { EventingModule } from './common/eventing/eventing.module';
import { OutboxModule } from './common/outbox/outbox.module';

// Domain modules
import { ApprovalsModule } from './domains/approvals/approvals.module';

// Health check
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Scheduling (for outbox worker)
    ScheduleModule.forRoot(),

    // Infrastructure
    PrismaModule,

    // Common modules
    RequestContextModule,
    ErrorsModule,
    RetryModule,
    IdempotencyModule,
    EventingModule,
    OutboxModule,

    // Domain modules
    ApprovalsModule,

    // Health check
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
