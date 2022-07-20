import { Module, CacheModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';

import { AppService } from './app.service';

import { UserModule } from './user/user.module';
import { getConfig } from './utils';

// 应用程序的根模块。

@Module({
  imports: [
    UserModule,
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      isGlobal: true,
      load: [getConfig],
    }),
    CacheModule.register({
      isGlobal: true,
    }),
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
