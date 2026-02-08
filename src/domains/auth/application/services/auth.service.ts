import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string, tenantId: string) {
    const user = await this.prisma.identityUser.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (!user || !user.passwordHash) {
      throw new HttpException(
        { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new HttpException(
        { error: 'USER_INACTIVE', message: 'User account is not active' },
        HttpStatus.FORBIDDEN,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new HttpException(
        { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Get user permissions
    const { permissions, roles } = await this.getUserPermissions(user.id, tenantId);

    // Generate JWT
    const payload = { sub: user.id, tenantId, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // Create session
    await this.prisma.userSession.create({
      data: {
        tenantId,
        userId: user.id,
        deviceType: 'DESKTOP',
        status: 'ACTIVE',
      },
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        tenantId: user.tenantId,
        status: user.status,
      },
      permissions,
      roles,
    };
  }

  async me(userId: string, tenantId: string) {
    const user = await this.prisma.identityUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException({ error: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const { permissions, roles } = await this.getUserPermissions(userId, tenantId);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        tenantId: user.tenantId,
        status: user.status,
      },
      permissions,
      roles,
    };
  }

  async logout(userId: string, tenantId: string) {
    // Revoke all active sessions for this user
    await this.prisma.userSession.updateMany({
      where: { userId, tenantId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedReason: 'LOGOUT' },
    });

    return { success: true };
  }

  private async getUserPermissions(userId: string, tenantId: string) {
    // Get active assignments with roles and permissions
    const assignments = await this.prisma.accessAssignment.findMany({
      where: { userId, tenantId, status: 'ACTIVE' },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const roles = assignments.map((a) => ({
      code: a.role.code,
      name: a.role.name,
    }));

    // Collect unique permission codes
    const permissionSet = new Set<string>();
    for (const assignment of assignments) {
      if (assignment.role.effect === 'ALLOW') {
        for (const rp of assignment.role.rolePermissions) {
          if (rp.effect === 'ALLOW') {
            permissionSet.add(rp.permission.code);
          }
        }
      }
    }

    return {
      permissions: Array.from(permissionSet),
      roles,
    };
  }
}
