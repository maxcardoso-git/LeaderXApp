import { Injectable, Inject, Logger } from '@nestjs/common';
import { ComplianceEvaluationContext, EvidenceItem } from '../value-objects';
import {
  GOVERNANCE_READ_PORT,
  IDENTITY_READ_PORT,
  EVENTS_READ_PORT,
  POINTS_READ_PORT,
  IGovernanceReadPort,
  IIdentityReadPort,
  IEventsReadPort,
  IPointsReadPort,
} from '../ports';

export interface CollectedEvidence {
  governance: Record<string, unknown>;
  identity: Record<string, unknown>;
  events: Record<string, unknown>;
  points: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

@Injectable()
export class EvidenceCollectorService {
  private readonly logger = new Logger(EvidenceCollectorService.name);

  constructor(
    @Inject(GOVERNANCE_READ_PORT)
    private readonly governanceReader: IGovernanceReadPort,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityReader: IIdentityReadPort,
    @Inject(EVENTS_READ_PORT)
    private readonly eventsReader: IEventsReadPort,
    @Inject(POINTS_READ_PORT)
    private readonly pointsReader: IPointsReadPort,
  ) {}

  /**
   * Collects evidence from all integrated domains.
   * Evidence is used to evaluate compliance rules.
   */
  async collectAll(context: ComplianceEvaluationContext): Promise<Record<string, unknown>> {
    const evidence: CollectedEvidence = {
      governance: {},
      identity: {},
      events: {},
      points: {},
      metadata: context.metadata || {},
    };

    // Collect evidence in parallel for performance
    const [governanceEvidence, identityEvidence, eventsEvidence, pointsEvidence] =
      await Promise.all([
        this.collectGovernanceEvidence(context).catch((err) => {
          this.logger.warn(`Failed to collect governance evidence: ${err.message}`);
          return {};
        }),
        this.collectIdentityEvidence(context).catch((err) => {
          this.logger.warn(`Failed to collect identity evidence: ${err.message}`);
          return {};
        }),
        this.collectEventsEvidence(context).catch((err) => {
          this.logger.warn(`Failed to collect events evidence: ${err.message}`);
          return {};
        }),
        this.collectPointsEvidence(context).catch((err) => {
          this.logger.warn(`Failed to collect points evidence: ${err.message}`);
          return {};
        }),
      ]);

    evidence.governance = governanceEvidence;
    evidence.identity = identityEvidence;
    evidence.events = eventsEvidence;
    evidence.points = pointsEvidence;

    return evidence as unknown as Record<string, unknown>;
  }

  /**
   * Collects specific evidence by domain.
   */
  async collectByDomain(
    domain: string,
    context: ComplianceEvaluationContext,
  ): Promise<EvidenceItem[]> {
    const items: EvidenceItem[] = [];

    try {
      let data: Record<string, unknown> = {};

      switch (domain) {
        case 'governance':
          data = await this.collectGovernanceEvidence(context);
          break;
        case 'identity':
          data = await this.collectIdentityEvidence(context);
          break;
        case 'events':
          data = await this.collectEventsEvidence(context);
          break;
        case 'points':
          data = await this.collectPointsEvidence(context);
          break;
        default:
          this.logger.warn(`Unknown domain for evidence collection: ${domain}`);
      }

      items.push({
        source: domain,
        type: 'domain-evidence',
        data,
        collectedAt: new Date(),
      });
    } catch (err) {
      this.logger.error(`Failed to collect evidence for domain ${domain}: ${err}`);
    }

    return items;
  }

  private async collectGovernanceEvidence(
    context: ComplianceEvaluationContext,
  ): Promise<Record<string, unknown>> {
    const summary = await this.governanceReader.getComplianceSummary(context.tenantId);
    const recentEvaluations = await this.governanceReader.getRecentEvaluations(
      context.tenantId,
      100,
    );

    return {
      summary,
      recentEvaluations,
      totalPolicies: summary?.totalPolicies || 0,
      activePolicies: summary?.activePolicies || 0,
    };
  }

  private async collectIdentityEvidence(
    context: ComplianceEvaluationContext,
  ): Promise<Record<string, unknown>> {
    const summary = await this.identityReader.getAccessSummary(context.tenantId);
    const assignments = await this.identityReader.getRecentAssignments(context.tenantId, 100);

    return {
      summary,
      recentAssignments: assignments,
      totalUsers: summary?.totalUsers || 0,
      totalRoles: summary?.totalRoles || 0,
      totalPermissions: summary?.totalPermissions || 0,
    };
  }

  private async collectEventsEvidence(
    context: ComplianceEvaluationContext,
  ): Promise<Record<string, unknown>> {
    const summary = await this.eventsReader.getEventsSummary(context.tenantId);
    const recentEvents = await this.eventsReader.getRecentEvents(context.tenantId, 100);

    return {
      summary,
      recentEvents,
      totalEvents: summary?.totalEvents || 0,
      activeEvents: summary?.activeEvents || 0,
    };
  }

  private async collectPointsEvidence(
    context: ComplianceEvaluationContext,
  ): Promise<Record<string, unknown>> {
    const summary = await this.pointsReader.getLedgerSummary(context.tenantId);
    const recentTransactions = await this.pointsReader.getRecentTransactions(context.tenantId, 100);

    return {
      summary,
      recentTransactions,
      totalAccounts: summary?.totalAccounts || 0,
      totalBalance: summary?.totalBalance || 0,
    };
  }
}
