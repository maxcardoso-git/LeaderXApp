import { Injectable, Logger } from '@nestjs/common';
import {
  PointsPort,
  HoldPointsRequest,
  HoldPointsResponse,
  CommitHoldRequest,
  CommitHoldResponse,
  ReleaseHoldRequest,
  ReleaseHoldResponse,
} from '../../domain/ports';
import {
  HoldPointsHandler,
  CommitHoldHandler,
  ReleaseHoldHandler,
} from '../../../points/application/handlers';
import {
  HoldPointsCommand,
  CommitHoldCommand,
  ReleaseHoldCommand,
} from '../../../points/application/commands';
import { OwnerType } from '../../../points/domain';

/**
 * Points Client Adapter
 * Calls the Points domain internally (same service)
 */
@Injectable()
export class PointsClientAdapter implements PointsPort {
  private readonly logger = new Logger(PointsClientAdapter.name);

  constructor(
    private readonly holdHandler: HoldPointsHandler,
    private readonly commitHandler: CommitHoldHandler,
    private readonly releaseHandler: ReleaseHoldHandler,
  ) {}

  async holdPoints(request: HoldPointsRequest): Promise<HoldPointsResponse> {
    this.logger.debug(`Holding ${request.amount} points for ${request.ownerId}`);

    const command = new HoldPointsCommand(
      request.tenantId,
      request.ownerType as OwnerType,
      request.ownerId,
      request.amount,
      request.reasonCode,
      request.referenceType,
      request.referenceId,
      undefined, // expiresAt - let points domain handle it
      undefined, // metadata
      undefined, // requestId
      undefined, // actorId
      request.idempotencyKey,
    );

    const result = await this.holdHandler.execute(command);

    return {
      holdId: result.holdId,
      accountId: result.accountId,
      amount: result.amount,
    };
  }

  async commitHold(request: CommitHoldRequest): Promise<CommitHoldResponse> {
    this.logger.debug(
      `Committing hold for ${request.referenceType}:${request.referenceId}`,
    );

    const command = new CommitHoldCommand(
      request.tenantId,
      request.ownerType as OwnerType,
      request.ownerId,
      request.referenceType,
      request.referenceId,
      request.reasonCode,
      undefined, // metadata
      undefined, // requestId
      undefined, // actorId
      request.idempotencyKey,
    );

    const result = await this.commitHandler.execute(command);

    return {
      holdId: result.holdId,
      status: result.status,
    };
  }

  async releaseHold(request: ReleaseHoldRequest): Promise<ReleaseHoldResponse> {
    this.logger.debug(
      `Releasing hold for ${request.referenceType}:${request.referenceId}`,
    );

    const command = new ReleaseHoldCommand(
      request.tenantId,
      request.ownerType as OwnerType,
      request.ownerId,
      request.referenceType,
      request.referenceId,
      request.reasonCode,
      undefined, // metadata
      undefined, // requestId
      undefined, // actorId
      request.idempotencyKey,
    );

    const result = await this.releaseHandler.execute(command);

    return {
      holdId: result.holdId,
      status: result.status,
    };
  }
}
