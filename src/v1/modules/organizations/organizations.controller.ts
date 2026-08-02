import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { InvitationResponseDto } from './dto/invitation-response.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';
import { OrganizationPermissions } from '@shared/constants/permissions.constants';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Provision a new Organization and assign creator as Owner' })
  @ApiResponse({ status: HttpStatus.CREATED, type: OrganizationResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Organization slug already exists' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrganizationDto) {
    const org = await this.orgsService.create(user.sub, dto);
    return {
      message: 'Organization successfully created',
      data: org,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all Organizations for authenticated user' })
  @ApiResponse({ status: HttpStatus.OK, type: [OrganizationResponseDto] })
  async findAll(@CurrentUser() user: JwtPayload) {
    const orgs = await this.orgsService.findUserOrganizations(user.sub);
    return {
      message: 'Organizations retrieved successfully',
      data: orgs,
    };
  }

  @Get('current')
  @ApiOperation({ summary: 'Retrieve currently active Organization from tenant context' })
  @ApiResponse({ status: HttpStatus.OK, type: OrganizationResponseDto })
  async getCurrent(@CurrentUser() user: JwtPayload) {
    const org = await this.orgsService.getCurrentOrganization(user.sub);
    return {
      message: 'Active Organization details retrieved',
      data: org,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve Organization metadata by ID or Slug' })
  @ApiParam({ name: 'id', description: 'Organization UUID or Slug' })
  @ApiResponse({ status: HttpStatus.OK, type: OrganizationResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Organization not found' })
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') idOrSlug: string) {
    const org = await this.orgsService.findByIdOrSlug(user.sub, idOrSlug);
    return {
      message: 'Organization details retrieved',
      data: org,
    };
  }

  @Patch(':id')
  @UseGuards(TenantGuard, PermissionsGuard)
  @Permissions(OrganizationPermissions.UPDATE)
  @ApiOperation({ summary: 'Update Organization metadata' })
  @ApiParam({ name: 'id', description: 'Organization UUID or Slug' })
  @ApiResponse({ status: HttpStatus.OK, type: OrganizationResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') idOrSlug: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const org = await this.orgsService.update(user.sub, idOrSlug, dto);
    return {
      message: 'Organization details updated',
      data: org,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TenantGuard, PermissionsGuard)
  @Permissions(OrganizationPermissions.DELETE)
  @ApiOperation({ summary: 'Soft-delete Organization (OWNER only)' })
  @ApiParam({ name: 'id', description: 'Organization UUID or Slug' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Organization soft-deleted' })
  async remove(@CurrentUser() user: JwtPayload, @Param('id') idOrSlug: string): Promise<void> {
    await this.orgsService.softDelete(user.sub, idOrSlug);
  }

  // --- Member Management Endpoints ---

  @Get(':id/members')
  @UseGuards(TenantGuard, PermissionsGuard)
  @Permissions(OrganizationPermissions.MEMBER_READ)
  @ApiOperation({ summary: 'List members for target Organization' })
  @ApiParam({ name: 'id', description: 'Organization UUID or Slug' })
  @ApiResponse({ status: HttpStatus.OK, type: [MemberResponseDto] })
  async findMembers(@Param('id') idOrSlug: string) {
    const members = await this.orgsService.findMembers(idOrSlug);
    return {
      message: 'Organization members retrieved successfully',
      data: members,
    };
  }

  @Patch(':id/members/:memberId')
  @UseGuards(TenantGuard, PermissionsGuard)
  @Permissions(OrganizationPermissions.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Update Organization member role' })
  @ApiParam({ name: 'id', description: 'Organization UUID or Slug' })
  @ApiParam({ name: 'memberId', description: 'Member UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: MemberResponseDto })
  async updateMemberRole(
    @CurrentUser() user: JwtPayload,
    @Param('id') idOrSlug: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const member = await this.orgsService.updateMemberRole(idOrSlug, memberId, dto, user.sub);
    return {
      message: 'Member role updated successfully',
      data: member,
    };
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TenantGuard, PermissionsGuard)
  @Permissions(OrganizationPermissions.MEMBER_DELETE)
  @ApiOperation({ summary: 'Remove member from Organization' })
  @ApiParam({ name: 'id', description: 'Organization UUID or Slug' })
  @ApiParam({ name: 'memberId', description: 'Member UUID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Member removed' })
  async removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('id') idOrSlug: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    await this.orgsService.removeMember(idOrSlug, memberId, user.sub);
  }

  // --- Invitation Endpoints ---

  @Post(':id/invitations')
  @UseGuards(TenantGuard, PermissionsGuard)
  @Permissions(OrganizationPermissions.INVITE)
  @ApiOperation({ summary: 'Dispatch Organization invitation email' })
  @ApiParam({ name: 'id', description: 'Organization UUID or Slug' })
  @ApiResponse({ status: HttpStatus.CREATED, type: InvitationResponseDto })
  async createInvitation(
    @CurrentUser() user: JwtPayload,
    @Param('id') idOrSlug: string,
    @Body() dto: CreateInvitationDto,
  ) {
    const { invitation } = await this.orgsService.createInvitation(idOrSlug, dto, user.sub);
    return {
      message: 'Invitation successfully dispatched',
      data: invitation,
    };
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept Organization invitation token and activate membership' })
  @ApiResponse({ status: HttpStatus.OK, type: MemberResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid or expired token' })
  async acceptInvitation(@CurrentUser() user: JwtPayload, @Body() dto: AcceptInvitationDto) {
    const member = await this.orgsService.acceptInvitation(dto, user.sub);
    return {
      message: 'Invitation accepted and membership activated',
      data: member,
    };
  }

  @Delete(':id/invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(TenantGuard, PermissionsGuard)
  @Permissions(OrganizationPermissions.INVITE)
  @ApiOperation({ summary: 'Revoke pending Organization invitation' })
  @ApiParam({ name: 'id', description: 'Organization UUID or Slug' })
  @ApiParam({ name: 'invitationId', description: 'Invitation UUID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Invitation revoked' })
  async revokeInvitation(
    @CurrentUser() user: JwtPayload,
    @Param('id') idOrSlug: string,
    @Param('invitationId') invitationId: string,
  ): Promise<void> {
    await this.orgsService.revokeInvitation(idOrSlug, invitationId, user.sub);
  }
}
