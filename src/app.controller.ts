import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';

// 具有单个路由的基本控制器。

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
