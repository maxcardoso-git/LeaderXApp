import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import {
  CreateNetworkNodeDto,
  UpdateNetworkNodeDto,
  LinkNetworkNodeDto,
  UnlinkNetworkNodeDto,
  ListNetworkNodesQueryDto,
  ValidateAuthorityDto,
  NetworkNodeResponseDto,
  NetworkRelationResponseDto,
  ApprovalChainResponseDto,
  ValidateAuthorityResponseDto,
} from '../dtos';
import {
  CreateNetworkNodeUseCase,
  UpdateNetworkNodeUseCase,
  DeactivateNetworkNodeUseCase,
  LinkNetworkNodeUseCase,
  UnlinkNetworkNodeUseCase,
  GetNetworkNodeUseCase,
  ListNetworkByOwnerUseCase,
  GetDescendantsUseCase,
  GetApprovalChainUseCase,
  ValidateApprovalAuthorityUseCase,
} from '../../application/usecases';
import { NetworkNodeAggregate } from '../../domain/aggregates';
import { NetworkRelationEntity } from '../../domain/entities';
import { ApprovalChain, NodeRole } from '../../domain/value-objects';

@ApiTags('Network')
@Controller('network/nodes')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class NetworkController {
  constructor(
    private readonly createNode: CreateNetworkNodeUseCase,
    private readonly updateNode: UpdateNetworkNodeUseCase,
    private readonly deactivateNode: DeactivateNetworkNodeUseCase,
    private readonly linkNode: LinkNetworkNodeUseCase,
    private readonly unlinkNode: UnlinkNetworkNodeUseCase,
    private readonly getNode: GetNetworkNodeUseCase,
    private readonly listNodes: ListNetworkByOwnerUseCase,
    private readonly getDescendants: GetDescendantsUseCase,
    private readonly getApprovalChain: GetApprovalChainUseCase,
    private readonly validateAuthority: ValidateApprovalAuthorityUseCase,
  ) {}

  private toNodeResponse(node: NetworkNodeAggregate): NetworkNodeResponseDto {
    return {
      id: node.id,
      tenantId: node.tenantId,
      ownerId: node.ownerId,
      ownerType: node.ownerType,
      userId: node.userId,
      role: node.role,
      status: node.status,
      hierarchyLevel: node.hierarchyLevel,
      metadata: node.metadata,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    };
  }

  private toRelationResponse(relation: NetworkRelationEntity): NetworkRelationResponseDto {
    return {
      id: relation.id,
      parentNodeId: relation.parentNodeId,
      childNodeId: relation.childNodeId,
      relationType: relation.relationType,
      createdAt: relation.createdAt.toISOString(),
    };
  }

  private toApprovalChainResponse(chain: ApprovalChain): ApprovalChainResponseDto {
    return {
      targetNodeId: chain.targetNodeId,
      chain: chain.chain.map((node) => ({
        nodeId: node.nodeId,
        userId: node.userId,
        role: node.role,
        hierarchyLevel: node.hierarchyLevel,
        canApprove: node.canApprove,
      })),
      calculatedAt: chain.calculatedAt.toISOString(),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new network node' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateNetworkNodeDto,
  ): Promise<NetworkNodeResponseDto> {
    const node = await this.createNode.execute({
      tenantId,
      ownerId: dto.ownerId,
      ownerType: dto.ownerType,
      userId: dto.userId,
      role: dto.role,
      metadata: dto.metadata,
    });
    return this.toNodeResponse(node);
  }

  @Get()
  @ApiOperation({ summary: 'List network nodes with filters' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListNetworkNodesQueryDto,
  ): Promise<NetworkNodeResponseDto[]> {
    const nodes = await this.listNodes.execute({
      tenantId,
      filters: {
        ownerId: query.ownerId,
        ownerType: query.ownerType,
        userId: query.userId,
        status: query.status,
        role: query.role,
      },
    });
    return nodes.map((n) => this.toNodeResponse(n));
  }

  @Get(':nodeId')
  @ApiOperation({ summary: 'Get network node by ID' })
  async getById(@Param('nodeId') nodeId: string): Promise<NetworkNodeResponseDto> {
    const node = await this.getNode.execute(nodeId);
    return this.toNodeResponse(node);
  }

  @Put(':nodeId')
  @ApiOperation({ summary: 'Update a network node' })
  async update(
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateNetworkNodeDto,
  ): Promise<NetworkNodeResponseDto> {
    const node = await this.updateNode.execute({
      nodeId,
      role: dto.role,
      status: dto.status,
      metadata: dto.metadata,
    });
    return this.toNodeResponse(node);
  }

  @Delete(':nodeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a network node' })
  async deactivate(@Param('nodeId') nodeId: string): Promise<NetworkNodeResponseDto> {
    const node = await this.deactivateNode.execute(nodeId);
    return this.toNodeResponse(node);
  }

  @Post(':nodeId/link')
  @ApiOperation({ summary: 'Link a node to a parent' })
  async link(
    @Headers('x-tenant-id') tenantId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: LinkNetworkNodeDto,
  ): Promise<NetworkRelationResponseDto> {
    const relation = await this.linkNode.execute({
      tenantId,
      childNodeId: nodeId,
      parentNodeId: dto.parentNodeId,
      relationType: dto.relationType,
    });
    return this.toRelationResponse(relation);
  }

  @Delete(':nodeId/link')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink a node from a parent' })
  async unlink(
    @Param('nodeId') nodeId: string,
    @Body() dto: UnlinkNetworkNodeDto,
  ): Promise<void> {
    await this.unlinkNode.execute({
      childNodeId: nodeId,
      parentNodeId: dto.parentNodeId,
    });
  }

  @Get(':nodeId/descendants')
  @ApiOperation({ summary: 'Get all descendants of a node' })
  async descendants(
    @Headers('x-tenant-id') tenantId: string,
    @Param('nodeId') nodeId: string,
    @Query('maxDepth') maxDepth?: number,
  ): Promise<NetworkNodeResponseDto[]> {
    const nodes = await this.getDescendants.execute({
      tenantId,
      nodeId,
      maxDepth,
    });
    return nodes.map((n) => this.toNodeResponse(n));
  }

  @Get(':nodeId/approval-chain')
  @ApiOperation({ summary: 'Get approval chain for a node' })
  async approvalChain(@Param('nodeId') nodeId: string): Promise<ApprovalChainResponseDto> {
    const chain = await this.getApprovalChain.execute({ nodeId });
    return this.toApprovalChainResponse(chain);
  }

  @Post(':nodeId/validate-authority')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate if a node has approval authority' })
  async validateApprovalAuthority(
    @Param('nodeId') nodeId: string,
    @Body() dto: ValidateAuthorityDto,
  ): Promise<ValidateAuthorityResponseDto> {
    const result = await this.validateAuthority.execute({
      approverNodeId: nodeId,
      targetNodeId: dto.targetNodeId,
      rule: dto.minApprovers || dto.allowedRoles || dto.maxDepth
        ? {
            minApprovers: dto.minApprovers || 1,
            allowedRoles: dto.allowedRoles || [NodeRole.OWNER, NodeRole.ADMIN, NodeRole.EMBAIXADOR],
            maxDepth: dto.maxDepth || 10,
          }
        : undefined,
    });

    return {
      approverNodeId: result.approverNodeId,
      targetNodeId: result.targetNodeId,
      hasAuthority: result.hasAuthority,
      validatedAt: result.validatedAt.toISOString(),
    };
  }
}
