/**
 * NetworkReadPort - Port for read-only integration with Network Domain
 * Used to validate authority/hierarchy in access assignments and evaluations
 */
export interface NetworkReadPort {
  /**
   * Validates if a user has authority over a network node
   * @param tenantId - Tenant ID
   * @param userId - User ID to check
   * @param nodeId - Network node ID
   * @param requiredLevel - Optional required authority level
   * @returns true if user has authority, false otherwise
   */
  validateAuthority(
    tenantId: string,
    userId: string,
    nodeId: string,
    requiredLevel?: string,
  ): Promise<boolean>;
}

export const NETWORK_READ_PORT = Symbol('NETWORK_READ_PORT');
