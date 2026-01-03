import { Global, Module } from '@nestjs/common';
import { EventBusPort } from './event-bus.port';
import { InMemoryEventBus } from './in-memory-event-bus';

@Global()
@Module({
  providers: [
    InMemoryEventBus,
    {
      provide: EventBusPort,
      useExisting: InMemoryEventBus,
    },
  ],
  exports: [EventBusPort, InMemoryEventBus],
})
export class EventingModule {}
