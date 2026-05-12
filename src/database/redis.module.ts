import { Module, Global, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const client: RedisClientType = createClient({
          url: config.get<string>('REDIS_URL') || 'redis://localhost:6379',
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          socket: {
            reconnectStrategy: (retries) =>
              retries > 10 ? new Error('Redis: reconnect limit') : Math.min(retries * 100, 3000),
          },
        }) as RedisClientType;

        client.on('error', (err) => console.error('[Redis] Error:', err.message));
        client.on('connect', () => console.log('[Redis] Conectado'));

        await client.connect();
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor() {}
  async onApplicationShutdown() {}
}
