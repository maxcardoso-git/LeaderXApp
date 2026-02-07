import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

export interface SimulatePointsInput {
  eventCode: string;
  payload: {
    memberId?: string;
    blockCode?: string;
    avatar?: string;
    benefit?: string;
  };
  context: {
    assumedBalance?: number;
    alreadyRewardedUnits?: string[];
    bonusAlreadyGranted?: boolean;
  };
}

export interface ConstraintViolation {
  code: string;
  message: string;
}

export interface LedgerCommandPreview {
  entryType: string;
  amount: number;
  reasonCode: string;
  journeyCode: string;
  journeyTrigger: string;
}

export interface PolicySnapshot {
  code: string;
  version: number;
  name: string;
}

export interface SimulationResult {
  resolved: boolean;
  ruleMatched: string | null;
  ruleType: 'EARNING' | 'BONUS' | 'SPENDING' | null;
  points: number;
  action: 'CREDIT' | 'DEBIT' | null;
  requiresApproval: boolean;
  approvalPolicyCode: string | null;
  constraintViolations: ConstraintViolation[];
  ledgerCommandPreview: LedgerCommandPreview | null;
  policySnapshot: PolicySnapshot | null;
  resolverTrace: string[];
}

@Injectable()
export class PointsSimulatorHandler {
  constructor(private readonly prisma: PrismaService) {}

  async simulate(tenantId: string, input: SimulatePointsInput): Promise<SimulationResult> {
    const trace: string[] = [];
    const violations: ConstraintViolation[] = [];

    // Step 1: Load active policy
    trace.push('Carregando política ativa...');
    const policy = await this.prisma.pointsPolicy.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { version: 'desc' },
    });

    if (!policy) {
      trace.push('Nenhuma política ativa encontrada.');
      return this.notResolved(trace, violations, null);
    }

    const rules = policy.rules as Record<string, any>;
    const snapshot: PolicySnapshot = {
      code: policy.code,
      version: policy.version,
      name: policy.name,
    };
    trace.push(`Política encontrada: ${policy.name} v${policy.version} (${policy.code})`);

    // Step 2: Map event to rule type
    trace.push(`Mapeando evento: ${input.eventCode}`);
    const mapping = this.resolveEventMapping(input.eventCode);
    if (!mapping) {
      trace.push(`Evento "${input.eventCode}" não é reconhecido pelo motor.`);
      return this.notResolved(trace, violations, snapshot);
    }
    trace.push(`Tipo de regra: ${mapping.ruleType}, Resolver: ${mapping.resolver}`);

    // Step 3: Resolve rule
    trace.push('Resolvendo regra...');
    const resolution = this.resolveRule(rules, mapping, input);
    if (!resolution.found) {
      trace.push(`Regra não encontrada: ${resolution.reason}`);
      return this.notResolved(trace, violations, snapshot);
    }
    trace.push(`Regra encontrada: ${resolution.ruleCode}`);

    // Step 4: Calculate points
    const points = resolution.points;
    const action = mapping.ruleType === 'SPENDING' ? 'DEBIT' : 'CREDIT';
    trace.push(`Pontos calculados: ${points} (${action})`);

    // Step 5: Validate constraints
    trace.push('Validando constraints...');
    this.validateConstraints(rules, mapping.ruleType, input, points, violations, trace);

    // Step 6: Resolve approval
    trace.push('Verificando requisitos de aprovação...');
    const approval = this.resolveApproval(rules, mapping.ruleType, points);
    if (approval.requiresApproval) {
      trace.push(`Aprovação necessária: política ${approval.approvalPolicyCode}`);
    } else {
      trace.push('Nenhuma aprovação necessária.');
    }

    // Step 7: Build ledger command preview
    trace.push('Construindo preview do lançamento no Ledger...');
    const ledgerPreview: LedgerCommandPreview = {
      entryType: action,
      amount: points,
      reasonCode: `POLICY_${mapping.ruleType}_${resolution.ruleCode}`,
      journeyCode: input.eventCode,
      journeyTrigger: input.eventCode,
    };
    trace.push(`Preview: ${action} ${points} pts, reason=${ledgerPreview.reasonCode}`);

    // Step 8: Build result
    const resolved = violations.length === 0 && points > 0;
    if (resolved) {
      trace.push('Simulação concluída: RESOLVED');
    } else if (violations.length > 0) {
      trace.push(`Simulação concluída: NOT RESOLVED (${violations.length} violação(ões))`);
    } else {
      trace.push('Simulação concluída: NOT RESOLVED (0 pontos)');
    }

    return {
      resolved,
      ruleMatched: resolution.ruleCode,
      ruleType: mapping.ruleType as 'EARNING' | 'BONUS' | 'SPENDING',
      points,
      action,
      requiresApproval: approval.requiresApproval,
      approvalPolicyCode: approval.approvalPolicyCode,
      constraintViolations: violations,
      ledgerCommandPreview: resolved ? ledgerPreview : null,
      policySnapshot: snapshot,
      resolverTrace: trace,
    };
  }

  private resolveEventMapping(eventCode: string): { ruleType: string; resolver: string } | null {
    const mappings: Record<string, { ruleType: string; resolver: string }> = {
      PROFILE_BLOCK_COMPLETED: { ruleType: 'EARNING', resolver: 'PROFILE_COMPLETION_RESOLVER' },
      PROFILE_ALL_BLOCKS_COMPLETED: { ruleType: 'BONUS', resolver: 'FULL_COMPLETION_BONUS_RESOLVER' },
      BENEFIT_REQUESTED: { ruleType: 'SPENDING', resolver: 'AVATAR_SPENDING_RESOLVER' },
    };
    return mappings[eventCode] || null;
  }

  private resolveRule(
    rules: Record<string, any>,
    mapping: { ruleType: string; resolver: string },
    input: SimulatePointsInput,
  ): { found: boolean; ruleCode: string; points: number; reason?: string } {
    switch (mapping.ruleType) {
      case 'EARNING': {
        const units = rules.earningRules?.units || [];
        const unit = units.find(
          (u: any) => u.code === input.payload.blockCode && u.enabled,
        );
        if (!unit) {
          return {
            found: false,
            ruleCode: '',
            points: 0,
            reason: `Unit "${input.payload.blockCode}" não encontrada ou desabilitada`,
          };
        }
        return { found: true, ruleCode: unit.code, points: unit.points };
      }

      case 'BONUS': {
        const bonuses = rules.bonusRules || [];
        const bonus = bonuses.find(
          (b: any) => (b.type === 'COMPLETION_BONUS' || b.code === 'ALL_UNITS_COMPLETED') && b.enabled,
        );
        if (!bonus) {
          return { found: false, ruleCode: '', points: 0, reason: 'Nenhuma regra de bônus ativa encontrada' };
        }
        return { found: true, ruleCode: bonus.code, points: bonus.points };
      }

      case 'SPENDING': {
        const matrix = rules.spendingRules?.matrix || [];
        const row = matrix.find((r: any) => r.avatar === input.payload.avatar);
        if (!row) {
          return {
            found: false,
            ruleCode: '',
            points: 0,
            reason: `Avatar "${input.payload.avatar}" não encontrado na matrix`,
          };
        }
        const permission = row.permissions?.[input.payload.benefit || ''];
        if (!permission) {
          return {
            found: false,
            ruleCode: '',
            points: 0,
            reason: `Benefício "${input.payload.benefit}" não encontrado para avatar "${input.payload.avatar}"`,
          };
        }
        if (!permission.allowed) {
          return {
            found: true,
            ruleCode: `${input.payload.avatar}:${input.payload.benefit}`,
            points: 0,
            reason: 'Benefício não permitido para este avatar',
          };
        }
        return {
          found: true,
          ruleCode: `${input.payload.avatar}:${input.payload.benefit}`,
          points: permission.cost || 0,
        };
      }

      default:
        return { found: false, ruleCode: '', points: 0, reason: 'Tipo de regra desconhecido' };
    }
  }

  private validateConstraints(
    rules: Record<string, any>,
    ruleType: string,
    input: SimulatePointsInput,
    calculatedPoints: number,
    violations: ConstraintViolation[],
    trace: string[],
  ): void {
    const ctx = input.context || {};

    if (ruleType === 'EARNING') {
      // NO_DUPLICATE_EARNING
      const alreadyRewarded = ctx.alreadyRewardedUnits || [];
      if (input.payload.blockCode && alreadyRewarded.includes(input.payload.blockCode)) {
        violations.push({
          code: 'NO_DUPLICATE_EARNING',
          message: `Bloco "${input.payload.blockCode}" já foi recompensado anteriormente`,
        });
        trace.push(`CONSTRAINT NO_DUPLICATE_EARNING: VIOLADO — "${input.payload.blockCode}" já recompensado`);
      } else {
        trace.push('CONSTRAINT NO_DUPLICATE_EARNING: OK');
      }

      // EXPECTED_TOTAL_LIMIT
      const totalExpected = rules.earningRules?.constraints?.totalExpectedPoints || 0;
      if (totalExpected > 0) {
        const units = rules.earningRules?.units || [];
        const alreadyEarnedPoints = alreadyRewarded.reduce((sum: number, code: string) => {
          const unit = units.find((u: any) => u.code === code);
          return sum + (unit?.points || 0);
        }, 0);
        if (alreadyEarnedPoints + calculatedPoints > totalExpected) {
          violations.push({
            code: 'EXPECTED_TOTAL_LIMIT',
            message: `Soma (${alreadyEarnedPoints} + ${calculatedPoints} = ${alreadyEarnedPoints + calculatedPoints}) excede o limite de ${totalExpected} pontos`,
          });
          trace.push(`CONSTRAINT EXPECTED_TOTAL_LIMIT: VIOLADO — ${alreadyEarnedPoints + calculatedPoints} > ${totalExpected}`);
        } else {
          trace.push(`CONSTRAINT EXPECTED_TOTAL_LIMIT: OK (${alreadyEarnedPoints + calculatedPoints} <= ${totalExpected})`);
        }
      }
    }

    if (ruleType === 'BONUS') {
      // BONUS_SINGLE_GRANT
      if (ctx.bonusAlreadyGranted) {
        violations.push({
          code: 'BONUS_SINGLE_GRANT',
          message: 'Bônus de cadastro completo já foi concedido',
        });
        trace.push('CONSTRAINT BONUS_SINGLE_GRANT: VIOLADO — bônus já concedido');
      } else {
        trace.push('CONSTRAINT BONUS_SINGLE_GRANT: OK');
      }
    }

    if (ruleType === 'SPENDING') {
      // SUFFICIENT_BALANCE
      const balance = ctx.assumedBalance ?? 0;
      if (calculatedPoints > 0 && balance < calculatedPoints) {
        violations.push({
          code: 'SUFFICIENT_BALANCE',
          message: `Saldo insuficiente: ${balance} < ${calculatedPoints} pontos necessários`,
        });
        trace.push(`CONSTRAINT SUFFICIENT_BALANCE: VIOLADO — saldo ${balance} < ${calculatedPoints}`);
      } else {
        trace.push(`CONSTRAINT SUFFICIENT_BALANCE: OK (saldo ${balance} >= ${calculatedPoints})`);
      }
    }
  }

  private resolveApproval(
    rules: Record<string, any>,
    ruleType: string,
    points: number,
  ): { requiresApproval: boolean; approvalPolicyCode: string | null } {
    // Check governance config
    const governance = rules.governance || {};

    // Override: spending > 100 requires approval
    if (ruleType === 'SPENDING' && points > 100) {
      return {
        requiresApproval: true,
        approvalPolicyCode: governance.approvalPolicyCode || 'POINTS_SPENDING_APPROVAL',
      };
    }

    return { requiresApproval: false, approvalPolicyCode: null };
  }

  private notResolved(
    trace: string[],
    violations: ConstraintViolation[],
    snapshot: PolicySnapshot | null,
  ): SimulationResult {
    return {
      resolved: false,
      ruleMatched: null,
      ruleType: null,
      points: 0,
      action: null,
      requiresApproval: false,
      approvalPolicyCode: null,
      constraintViolations: violations,
      ledgerCommandPreview: null,
      policySnapshot: snapshot,
      resolverTrace: trace,
    };
  }
}
