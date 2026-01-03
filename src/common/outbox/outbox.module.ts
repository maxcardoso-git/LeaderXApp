import { Module } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';
import { OutboxPublisher } from './outbox.publisher';
import { OutboxWorker } from './outbox.worker';

@Module({
  providers: [OutboxRepository, OutboxPublisher, OutboxWorker],
  exports: [OutboxPublisher],
})
export class OutboxModule {}
