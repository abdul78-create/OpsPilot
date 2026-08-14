import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';

@ApiTags('Billing & Subscriptions')
@ApiBearerAuth()
@Controller('organizations/:orgId/billing')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @ApiOperation({ summary: 'Retrieve organization active subscription tier and usage quotas' })
  @ApiParam({ name: 'orgId', description: 'Organization UUID', required: false })
  async getSubscription(@Param('orgId') paramOrgId?: string, @Query('orgId') queryOrgId?: string) {
    const targetOrgId = paramOrgId || queryOrgId || '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913';
    const data = await this.billingService.getSubscriptionAndUsage(targetOrgId);
    return {
      message: 'Subscription and usage data retrieved successfully',
      data,
    };
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Generate checkout session for subscription plan upgrade' })
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  async createCheckout(@Param('orgId') orgId: string, @Body() body: { plan: string }) {
    const data = await this.billingService.createCheckoutSession(orgId, body.plan || 'PRO');
    return {
      message: 'Checkout session created successfully',
      data,
    };
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Retrieve invoice history for organization billing' })
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  async getInvoices(@Param('orgId') orgId: string) {
    const data = await this.billingService.getInvoices(orgId);
    return {
      message: 'Invoices retrieved successfully',
      data,
    };
  }
}
