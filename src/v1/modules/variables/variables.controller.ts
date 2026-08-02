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
import { VariablesService } from './variables.service';
import { CreateVariableDto } from './dto/create-variable.dto';
import { UpdateVariableDto } from './dto/update-variable.dto';
import { VariableResponseDto } from './dto/variable-response.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';

@ApiTags('Environment Variables')
@ApiBearerAuth()
@Controller('environments/:environmentId/variables')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class VariablesController {
  constructor(private readonly variablesService: VariablesService) {}

  @Post()
  @Permissions('env:update')
  @ApiOperation({ summary: 'Create a plain-text configuration entry for Environment' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: VariableResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Variable key already exists in Environment',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Type or regex validation failed' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('environmentId') environmentId: string,
    @Body() dto: CreateVariableDto,
  ) {
    const variable = await this.variablesService.create(environmentId, user.sub, dto);
    return {
      message: 'Configuration entry successfully created',
      data: variable,
    };
  }

  @Get()
  @Permissions('env:read')
  @ApiOperation({ summary: 'List all configuration entries for Environment' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: [VariableResponseDto] })
  async findAll(@Param('environmentId') environmentId: string) {
    const variables = await this.variablesService.findAll(environmentId);
    return {
      message: 'Environment variables retrieved successfully',
      data: variables,
    };
  }

  @Get(':id')
  @Permissions('env:read')
  @ApiOperation({ summary: 'Retrieve Variable details by ID' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiParam({ name: 'id', description: 'Variable UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: VariableResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Variable not found' })
  async findOne(@Param('environmentId') environmentId: string, @Param('id') variableId: string) {
    const variable = await this.variablesService.findById(environmentId, variableId);
    return {
      message: 'Variable details retrieved',
      data: variable,
    };
  }

  @Patch(':id')
  @Permissions('env:update')
  @ApiOperation({ summary: 'Update Variable value, type, or regex rules' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiParam({ name: 'id', description: 'Variable UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: VariableResponseDto })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('environmentId') environmentId: string,
    @Param('id') variableId: string,
    @Body() dto: UpdateVariableDto,
  ) {
    const variable = await this.variablesService.update(environmentId, user.sub, variableId, dto);
    return {
      message: 'Variable details updated',
      data: variable,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('env:update')
  @ApiOperation({ summary: 'Soft-delete Variable entry' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiParam({ name: 'id', description: 'Variable UUID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Variable soft-deleted' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('environmentId') environmentId: string,
    @Param('id') variableId: string,
  ): Promise<void> {
    await this.variablesService.softDelete(environmentId, user.sub, variableId);
  }
}
