import { HttpException, HttpStatus } from '@nestjs/common';

export class ResourceNotFoundError extends HttpException {
  constructor(identifier: string) {
    super(`Resource not found: ${identifier}`, HttpStatus.NOT_FOUND);
  }
}

export class ResourceNameAlreadyExistsError extends HttpException {
  constructor(name: string) {
    super(`Resource with name '${name}' already exists`, HttpStatus.CONFLICT);
  }
}

export class ResourceTestFailedError extends HttpException {
  constructor(message: string) {
    super(`Resource test failed: ${message}`, HttpStatus.BAD_REQUEST);
  }
}
