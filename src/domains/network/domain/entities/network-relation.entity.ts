import { RelationType } from '../value-objects';

export interface NetworkRelationProps {
  id: string;
  tenantId: string;
  parentNodeId: string;
  childNodeId: string;
  relationType: RelationType;
  createdAt: Date;
}

export class NetworkRelationEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly parentNodeId: string;
  readonly childNodeId: string;
  readonly relationType: RelationType;
  readonly createdAt: Date;

  constructor(props: NetworkRelationProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.parentNodeId = props.parentNodeId;
    this.childNodeId = props.childNodeId;
    this.relationType = props.relationType;
    this.createdAt = props.createdAt;
  }

  /**
   * Check if this is a direct relation.
   */
  isDirect(): boolean {
    return this.relationType === RelationType.DIRECT;
  }

  /**
   * Check if this is an invited relation.
   */
  isInvited(): boolean {
    return this.relationType === RelationType.INVITED;
  }

  /**
   * Check if this is a delegated relation.
   */
  isDelegated(): boolean {
    return this.relationType === RelationType.DELEGATED;
  }
}
