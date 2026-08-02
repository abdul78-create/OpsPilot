import { PartialType } from '@nestjs/swagger';
import { CreateVariableDto } from './create-variable.dto';

export class UpdateVariableDto extends PartialType(CreateVariableDto) {}
