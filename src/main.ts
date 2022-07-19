import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// 应用程序的入口文件，它使用核心函数创建 Nest 应用程序实例。
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(1531);
}
bootstrap();
