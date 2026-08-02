import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { OrganizationsRepository } from './organizations.repository';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { EventBusService } from '../../../core/events/event-bus.service';
import { HashService } from '../../../core/security/hash.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { INotificationService } from '../../../core/notifications/notification.interface';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import {
  Organization,
  Member,
  Invitation,
  OrgRole,
  MemberStatus,
  InvitationStatus,
} from '@prisma/client';
import { slugify, validateSlug } from '@shared/utils/slug.util';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly orgRepository: OrganizationsRepository,
    private readonly prisma: PrismaService,
    private readonly transactionManager: TransactionManager,
    private readonly hashService: HashService,
    private readonly eventBus: EventBusService,
    private readonly contextService: RequestContextService,
    @Inject('INotificationService')
    private readonly notificationService: INotificationService,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto): Promise<Organization> {
    const rawSlug = dto.slug || dto.name;
    const targetSlug = slugify(rawSlug);

    validateSlug(targetSlug);

    const existingSlug = await this.orgRepository.findBySlug(targetSlug);
    if (existingSlug) {
      throw new ConflictException(`Organization with slug '${targetSlug}' already exists`);
    }

    const organization = await this.transactionManager.execute(async (tx) => {
      const createdOrg = await tx.organization.create({
        data: {
          name: dto.name,
          slug: targetSlug,
          billingEmail: dto.billingEmail,
        },
      });

      await tx.member.create({
        data: {
          organizationId: createdOrg.id,
          userId,
          role: OrgRole.OWNER,
          status: MemberStatus.ACTIVE,
        },
      });

      return createdOrg;
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'organization.created.v1',
      aggregateId: organization.id,
      aggregateType: 'Organization',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        organizationId: organization.id,
        name: organization.name,
        slug: organization.slug,
        ownerUserId: userId,
      },
    });

    return organization;
  }

  async findUserOrganizations(userId: string): Promise<Organization[]> {
    return this.orgRepository.findUserOrganizations(userId);
  }

  async findByIdOrSlug(userId: string, idOrSlug: string): Promise<Organization> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const org = isUuid
      ? await this.orgRepository.findById(idOrSlug)
      : await this.orgRepository.findBySlug(idOrSlug);

    if (!org) {
      throw new NotFoundException(`Organization '${idOrSlug}' not found`);
    }

    const membership = await this.orgRepository.findUserOrganizations(userId);
    const isMember = membership.some((userOrg) => userOrg.id === org.id);

    if (!isMember) {
      throw new ForbiddenException('Access denied to requested Organization');
    }

    return org;
  }

  async getCurrentOrganization(userId: string): Promise<Organization> {
    const tenantId = this.contextService.getTenantId();
    if (!tenantId) {
      const userOrgs = await this.findUserOrganizations(userId);
      if (userOrgs.length === 0) {
        throw new NotFoundException('No active Organization context found for user');
      }
      return userOrgs[0];
    }

    return this.findByIdOrSlug(userId, tenantId);
  }

  async update(
    userId: string,
    idOrSlug: string,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const org = await this.findByIdOrSlug(userId, idOrSlug);

    if (dto.slug && dto.slug !== org.slug) {
      const targetSlug = slugify(dto.slug);
      validateSlug(targetSlug);

      const existingSlug = await this.orgRepository.findBySlug(targetSlug);
      if (existingSlug && existingSlug.id !== org.id) {
        throw new ConflictException(`Organization with slug '${targetSlug}' already exists`);
      }
      dto.slug = targetSlug;
    }

    const updatedOrg = await this.orgRepository.update(org.id, dto);

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'organization.updated.v1',
      aggregateId: updatedOrg.id,
      aggregateType: 'Organization',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        organizationId: updatedOrg.id,
        name: updatedOrg.name,
        slug: updatedOrg.slug,
        updatedByUserId: userId,
      },
    });

    return updatedOrg;
  }

  async softDelete(userId: string, idOrSlug: string): Promise<Organization> {
    const org = await this.findByIdOrSlug(userId, idOrSlug);

    const deletedOrg = await this.orgRepository.softDelete(org.id);

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'organization.deleted.v1',
      aggregateId: deletedOrg.id,
      aggregateType: 'Organization',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        organizationId: deletedOrg.id,
        deletedByUserId: userId,
      },
    });

    return deletedOrg;
  }

  // --- Member Management Methods ---

  async findMembers(orgIdOrSlug: string): Promise<Member[]> {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
        deletedAt: null,
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization '${orgIdOrSlug}' not found`);
    }

    return this.prisma.member.findMany({
      where: { organizationId: org.id, deletedAt: null },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMemberRole(
    orgIdOrSlug: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
    requesterUserId: string,
  ): Promise<Member> {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
        deletedAt: null,
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization '${orgIdOrSlug}' not found`);
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId: org.id, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID '${memberId}' not found`);
    }

    if (member.role === OrgRole.OWNER) {
      throw new BadRequestException(
        'Primary OWNER role cannot be demoted via member update endpoint',
      );
    }

    const updatedMember = await this.prisma.member.update({
      where: { id: member.id },
      data: { role: dto.role },
      include: { user: true },
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'member.role_updated.v1',
      aggregateId: updatedMember.id,
      aggregateType: 'Member',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        organizationId: org.id,
        memberId: updatedMember.id,
        newRole: updatedMember.role,
        updatedByUserId: requesterUserId,
      },
    });

    return updatedMember;
  }

  async removeMember(
    orgIdOrSlug: string,
    memberId: string,
    requesterUserId: string,
  ): Promise<Member> {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
        deletedAt: null,
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization '${orgIdOrSlug}' not found`);
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId: org.id, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID '${memberId}' not found`);
    }

    if (member.role === OrgRole.OWNER) {
      throw new BadRequestException('Primary OWNER cannot be removed from organization');
    }

    const removedMember = await this.prisma.member.update({
      where: { id: member.id },
      data: {
        deletedAt: new Date(),
        status: MemberStatus.REMOVED,
      },
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'member.removed.v1',
      aggregateId: removedMember.id,
      aggregateType: 'Member',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        organizationId: org.id,
        memberId: removedMember.id,
        removedUserId: member.userId,
        removedByUserId: requesterUserId,
      },
    });

    return removedMember;
  }

  // --- Invitation Security & Lifecycle Methods ---

  async createInvitation(
    orgIdOrSlug: string,
    dto: CreateInvitationDto,
    inviterUserId: string,
  ): Promise<{ invitation: Invitation; rawToken: string }> {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
        deletedAt: null,
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization '${orgIdOrSlug}' not found`);
    }

    const existingMember = await this.prisma.member.findFirst({
      where: {
        organizationId: org.id,
        user: { email: dto.email },
        deletedAt: null,
      },
    });

    if (existingMember) {
      throw new ConflictException(`User '${dto.email}' is already a member of this Organization`);
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashService.hashSha256(rawToken);

    const intendedRole = dto.role || OrgRole.MEMBER;

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId: org.id,
        invitedEmail: dto.email,
        invitedByUserId: inviterUserId,
        intendedRole,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const inviter = await this.prisma.user.findUnique({ where: { id: inviterUserId } });

    await this.notificationService.sendInvitation({
      toEmail: dto.email,
      organizationName: org.name,
      inviterName: inviter?.name || 'A team member',
      inviteUrl: `https://app.opspilot.ai/accept-invite?token=${rawToken}`,
      role: intendedRole,
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'invitation.created.v1',
      aggregateId: invitation.id,
      aggregateType: 'Invitation',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        invitationId: invitation.id,
        organizationId: org.id,
        invitedEmail: dto.email,
        intendedRole,
      },
    });

    return { invitation, rawToken };
  }

  async acceptInvitation(dto: AcceptInvitationDto, acceptingUserId: string): Promise<Member> {
    const tokenHash = this.hashService.hashSha256(dto.token);

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invalid, revoked, or already accepted invitation token');
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation token has expired');
    }

    const acceptingUser = await this.prisma.user.findUnique({
      where: { id: acceptingUserId },
    });

    if (
      !acceptingUser ||
      acceptingUser.email.toLowerCase() !== invitation.invitedEmail.toLowerCase()
    ) {
      throw new ForbiddenException(
        'Authenticated user email does not match invitation recipient email',
      );
    }

    const member = await this.transactionManager.execute(async (tx) => {
      const existingMembership = await tx.member.findFirst({
        where: {
          organizationId: invitation.organizationId,
          userId: acceptingUserId,
          deletedAt: null,
        },
      });

      let activeMember: Member;

      if (existingMembership) {
        activeMember = existingMembership;
      } else {
        activeMember = await tx.member.create({
          data: {
            organizationId: invitation.organizationId,
            userId: acceptingUserId,
            role: invitation.intendedRole,
            status: MemberStatus.ACTIVE,
          },
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      return activeMember;
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'invitation.accepted.v1',
      aggregateId: invitation.id,
      aggregateType: 'Invitation',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        invitationId: invitation.id,
        organizationId: invitation.organizationId,
        userId: acceptingUserId,
        role: member.role,
      },
    });

    return member;
  }

  async revokeInvitation(
    orgIdOrSlug: string,
    invitationId: string,
    revokerUserId: string,
  ): Promise<Invitation> {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
        deletedAt: null,
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization '${orgIdOrSlug}' not found`);
    }

    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: org.id },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation not found or cannot be revoked');
    }

    const revokedInvitation = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'invitation.revoked.v1',
      aggregateId: revokedInvitation.id,
      aggregateType: 'Invitation',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        invitationId: revokedInvitation.id,
        organizationId: org.id,
        revokedByUserId: revokerUserId,
      },
    });

    return revokedInvitation;
  }
}
