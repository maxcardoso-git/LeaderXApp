import { Injectable, Logger } from '@nestjs/common';
import { NetworkReadPort } from '../../domain';

/**
 * NetworkClientAdapter - Implementation of NetworkReadPort
 * Provides read-only integration with Network Domain for authority validation
 *
 * Currently returns true (permissive) as Network domain is not yet implemented.
 * When Network domain is available, this should be updated to make actual calls.
 */
@Injectable()
export class NetworkClientAdapter implements NetworkReadPort {
  private readonly logger = new Logger(NetworkClientAdapter.name);

  async validateAuthority(
    tenantId: string,
    userId: string,
    nodeId: string,
    requiredLevel?: string,
  ): Promise<boolean> {
    this.logger.debug(
      `Validating authority: tenant=${tenantId}, user=${userId}, node=${nodeId}, level=${requiredLevel}`,
    );

    // TODO: Implement actual Network domain integration
    // For now, return true to be permissive (Network domain not yet implemented)
    // When Network is available:
    // return await this.networkService.validateAuthority(tenantId, userId, nodeId, requiredLevel);

    this.logger.warn(
      'NetworkClientAdapter: Network domain not implemented, returning true (permissive)',
    );
    return true;
  }
}
