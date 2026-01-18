import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

// Controllers
import { AuditController } from './inbound/controllers';

// Use Cases
import {
  ListComplianceChecksUseCase,
  RunComplianceChecksUseCase,
  GenerateComplianceReportUseCase,
  GetLatestComplianceReportUseCase,
  GetComplianceReportByIdUseCase,
} from './application/usecases';

// Domain Services
import { ComplianceEvaluatorService, EvidenceCollectorService } from './domain/services';

// Ports
import {
  COMPLIANCE_CHECK_REPOSITORY,
  COMPLIANCE_RESULT_REPOSITORY,
  COMPLIANCE_REPORT_REPOSITORY,
  GOVERNANCE_READ_PORT,
  IDENTITY_READ_PORT,
  EVENTS_READ_PORT,
  POINTS_READ_PORT,
} from './domain/ports';

// Repositories & Adapters
import {
  ComplianceCheckRepository,
  ComplianceResultRepository,
  ComplianceReportRepository,
  GovernanceReadAdapter,
  IdentityReadAdapter,
  EventsReadAdapter,
  PointsReadAdapter,
} from './outbound/repositories';

@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [
    // Use Cases
    ListComplianceChecksUseCase,
    RunComplianceChecksUseCase,
    GenerateComplianceReportUseCase,
    GetLatestComplianceReportUseCase,
    GetComplianceReportByIdUseCase,

    // Domain Services
    ComplianceEvaluatorService,
    EvidenceCollectorService,

    // Repositories
    {
      provide: COMPLIANCE_CHECK_REPOSITORY,
      useClass: ComplianceCheckRepository,
    },
    {
      provide: COMPLIANCE_RESULT_REPOSITORY,
      useClass: ComplianceResultRepository,
    },
    {
      provide: COMPLIANCE_REPORT_REPOSITORY,
      useClass: ComplianceReportRepository,
    },

    // Cross-Domain Read Adapters
    {
      provide: GOVERNANCE_READ_PORT,
      useClass: GovernanceReadAdapter,
    },
    {
      provide: IDENTITY_READ_PORT,
      useClass: IdentityReadAdapter,
    },
    {
      provide: EVENTS_READ_PORT,
      useClass: EventsReadAdapter,
    },
    {
      provide: POINTS_READ_PORT,
      useClass: PointsReadAdapter,
    },
  ],
  exports: [
    ComplianceEvaluatorService,
    COMPLIANCE_CHECK_REPOSITORY,
    COMPLIANCE_REPORT_REPOSITORY,
  ],
})
export class AuditModule {}
