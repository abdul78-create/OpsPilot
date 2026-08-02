import { PartialType } from '@nestjs/swagger';
import { CreatePipelineDefinitionDto } from './create-pipeline-definition.dto';

export class UpdatePipelineDefinitionDto extends PartialType(CreatePipelineDefinitionDto) {}
