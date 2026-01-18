import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ClockPort, UuidGeneratorPort } from '../../domain';

@Injectable()
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}

@Injectable()
export class UuidGenerator implements UuidGeneratorPort {
  generate(): string {
    return uuidv4();
  }
}
