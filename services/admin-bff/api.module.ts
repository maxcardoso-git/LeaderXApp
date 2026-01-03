import { DynamicModule, Module, Global, Provider } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { AsyncConfiguration, Configuration, ConfigurationFactory } from './configuration';

import { ApprovalsService } from './api/approvals.service';
import { AuditService } from './api/audit.service';
import { BillingService } from './api/billing.service';
import { CommunicationsService } from './api/communications.service';
import { CyclesService } from './api/cycles.service';
import { EventsService } from './api/events.service';
import { FeedbackService } from './api/feedback.service';
import { MembersService } from './api/members.service';
import { NavigationService } from './api/navigation.service';
import { PointsService } from './api/points.service';
import { SessionService } from './api/session.service';
import { StructureService } from './api/structure.service';
import { SuppliersService } from './api/suppliers.service';

@Global()
@Module({
  imports:      [ HttpModule ],
  exports:      [
    ApprovalsService,
    AuditService,
    BillingService,
    CommunicationsService,
    CyclesService,
    EventsService,
    FeedbackService,
    MembersService,
    NavigationService,
    PointsService,
    SessionService,
    StructureService,
    SuppliersService
  ],
  providers: [
    ApprovalsService,
    AuditService,
    BillingService,
    CommunicationsService,
    CyclesService,
    EventsService,
    FeedbackService,
    MembersService,
    NavigationService,
    PointsService,
    SessionService,
    StructureService,
    SuppliersService
  ]
})
export class ApiModule {
    public static forRoot(configurationFactory: () => Configuration): DynamicModule {
        return {
            module: ApiModule,
            providers: [ { provide: Configuration, useFactory: configurationFactory } ]
        };
    }

    /**
     * Register the module asynchronously.
     */
    static forRootAsync(options: AsyncConfiguration): DynamicModule {
        const providers = [...this.createAsyncProviders(options)];
        return {
            module: ApiModule,
            imports: options.imports || [],
            providers,
            exports: providers,
        };
    }

    private static createAsyncProviders(options: AsyncConfiguration): Provider[] {
        if (options.useClass) {
            return [
                this.createAsyncConfigurationProvider(options),
                {
                    provide: options.useClass,
                    useClass: options.useClass,
                },
            ];
        }
        return [this.createAsyncConfigurationProvider(options)];
    }

    private static createAsyncConfigurationProvider(
        options: AsyncConfiguration,
    ): Provider {
        if (options.useFactory) {
            return {
                provide: Configuration,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }
        return {
            provide: Configuration,
            useFactory: async (optionsFactory: ConfigurationFactory) =>
                await optionsFactory.createConfiguration(),
            inject: (options.useExisting && [options.useExisting]) || (options.useClass && [options.useClass]) || [],
        };
    }

    constructor( httpService: HttpService) { }
}
