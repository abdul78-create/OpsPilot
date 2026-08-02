import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class EntityNotFoundException extends DomainException {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID '${id}' was not found`, HttpStatus.NOT_FOUND);
  }
}

export class UnauthorizedTenantException extends DomainException {
  constructor() {
    super('Access denied: Unauthorized tenant context', HttpStatus.FORBIDDEN);
  }
}

export class ValidationException extends DomainException {
  constructor(message: string) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
