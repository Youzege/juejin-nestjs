<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>
# Nest JS 网关系统

学习目的，前端想多认识一下接口开发，运维，数据库等知识



## Nest 初

### 一、工程创建

`nest new gateway`     

默认生成测试controller false

```json
// nest-cli.json
{
  ...
  "generateOptions": {
    "spec": false
  }
}
```

使用 nest cli 快速生成一个 CURD user

`nest g resource user` 



#### Fastify 框架 配置

应用程序更新

**新增适配器:** `yarn add @nestjs/platform-fastify`

使用 `FastifyAdapter` 替换默认的 `Express` 。



#### 版本控制器 配置

例如： https://gitlab.example.com/api/v4/xxx

**全局版本控制**

1. 修改配置项

   ```ts
   // src/main.ts
   import { VERSION_NEUTRAL } from '@nestjs/common';
   
   app.enableVersioning({
      defaultVersion: [VERSION_NEUTRAL, 1, 2],
   });
   ```

   

2. 在controller 中测试

   ```ts
   // src/user/user.controller.ts
   import {
     Version,
     VERSION_NEUTRAL,
   } from '@nestjs/common';
   
   @Get()
   @Version([VERSION_NEUTRAL, '1'])
   findAll() {
     return this.userService.findAll();
   }
   
   @Get()
   @Version('2')
   findAll2() {
     return 'i am new one';
   }
   ```

3. Postman 测试...

   [localhost:3000/user](http://localhost:3000/v2/user) 默认

   [localhost:3000/v2/user](http://localhost:3000/v2/user) v2版本



#### 全局参数返回 配置

接口返回参数统一参数处理的配置，利于前端对数据接口进行适配管理。

**目标结构**

```json
{

    data, // 数据
    status: 0, // 接口状态值
    extra: {}, // 拓展信息
    message: 'success', // 异常信息
    success：true // 接口业务返回状态
}
```

1. 设置转换拦截器功能

   Nest 提供了几个实用程序类

   **ExecutionContext**：执行上下文

   **CallHandler**：调用处理程序

   RxJS 是使用 Observables 的响应式编程的库，它使编写异步或基于回调的代码更容易。

   ```ts
   // src/common/interceptors/transform.interceptor.ts
   import {
     CallHandler,
     ExecutionContext,
     Injectable,
     NestInterceptor,
   } from '@nestjs/common';
   import { map, Observable } from 'rxjs';
   
   interface Response<T> {
     data: T;
   }
   @Injectable()
   export class TransformInterceptor<T>
     implements NestInterceptor<T, Response<T>>
   {
     intercept(
       context: ExecutionContext,
       next: CallHandler,
     ): Observable<Response<T>> {
       return next.handle().pipe(
         map((data) => ({
           data,
           status: 0,
           extra: {},
           message: 'success',
           success: true,
         })),
       );
     }
   }
   ```

   

2.  全局注册 拦截器

   ```ts
   // main.ts
   
   import { TransformInterceptor } from './common/interceptors/transform.interceptor';
   // 统一响应体格式
   app.useGlobalInterceptors(new TransformInterceptor());
   ```

3. Postman测试

   [localhost:3000](http://localhost:3000/) 查看响应数据



#### 全局异常拦截 配置

对于异常处理也应该同样做一层标准的封装，这样利于开发前端的同学统一处理这类异常错误。



1. 设置异常过滤器 

   **统一异常**与 `HTTP` 类型的接口相关异常

   ```ts
   // src/common/exceptions/base.exception.filter.ts
   import { FastifyReply, FastifyRequest } from 'fastify';
   
   import {
     ExceptionFilter,
     Catch,
     ArgumentsHost,
     HttpStatus,
     ServiceUnavailableException,
   } from '@nestjs/common';
   
   @Catch()
   export class AllExceptionsFilter implements ExceptionFilter {
     catch(exception: Error, host: ArgumentsHost) {
       const ctx = host.switchToHttp();
       const response = ctx.getResponse<FastifyReply>();
       const request = ctx.getRequest<FastifyRequest>();
   
       request.log.error(exception);
   
       // 非 HTTP 标准异常的处理。
       response.status(HttpStatus.SERVICE_UNAVAILABLE).send({
         statusCode: HttpStatus.SERVICE_UNAVAILABLE,
         timestamp: new Date().toISOString(),
         path: request.url,
         message: new ServiceUnavailableException().getResponse(),
       });
     }
   }
   ```

   ```ts
   // src/common/exceptions/http.exception.filter.ts
   import { FastifyReply, FastifyRequest } from 'fastify';
   import {
     ArgumentsHost,
     Catch,
     ExceptionFilter,
     HttpException,
   } from '@nestjs/common';
   
   @Catch(HttpException)
   export class HttpExceptionFilter implements ExceptionFilter {
     catch(exception: HttpException, host: ArgumentsHost) {
       const ctx = host.switchToHttp();
       const response = ctx.getResponse<FastifyReply>();
       const request = ctx.getRequest<FastifyRequest>();
       const status = exception.getStatus();
   
       response.status(status).send({
         statusCode: status,
         timestamp: new Date().toISOString(),
         path: request.url,
         message: exception.getResponse(),
       });
     }
   }
   ```

   

2. 全局注册 过滤器

   ```ts
   app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
   ```

   

3. Postman 测试

   [localhost:3000/test](http://localhost:3000/test) 不存在的路由

   

4. 处理业务运行中预知且主动抛出的异常

   

   ```ts
   // business.exception.ts
   import { HttpException, HttpStatus } from '@nestjs/common';
   import { BUSINESS_ERROR_CODE } from './business.error.codes';
   
   type BusinessError = {
     code: number;
     message: string;
   };
   
   export class BusinessException extends HttpException {
     constructor(err: BusinessError | string) {
       if (typeof err === 'string') {
         err = {
           code: BUSINESS_ERROR_CODE.COMMON,
           message: err,
         };
       }
       super(err, HttpStatus.OK);
     }
   
     static throwForbidden() {
       throw new BusinessException({
         code: BUSINESS_ERROR_CODE.ACCESS_FORBIDDEN,
         message: '抱歉哦，您无此权限！',
       });
     }
   }
   ```

   **错误码**

   ```ts
   // business.error.codes.ts
   
   /*
    * @Author: Cookie
    * @Description: business.error.codes
    */
   export const BUSINESS_ERROR_CODE = {
     // 公共错误码
     COMMON: 10001,
   
     // 特殊错误码
     TOKEN_INVALID: 10002,
   
     // 禁止访问
     ACCESS_FORBIDDEN: 10003,
   
     // 权限已禁用
     PERMISSION_DISABLED: 10003,
   
     // 用户已冻结
     USER_DISABLED: 10004,
   };
   
   ```

   **更新** `HttpExceptionFilter`

   ```ts
   // src/common/exceptions/http.exception.filter.ts
   
   // 处理业务异常
       if (exception instanceof BusinessException) {
         const error = exception.getResponse();
         response.status(HttpStatus.OK).send({
           data: null,
           status: error['code'],
           extra: {},
           message: error['message'],
           success: false,
         });
         return;
       }
   ```

5.  Postman 测试

   [localhost:3000/user](http://localhost:3000/user) 

   测试代码

   ```ts
    @Get()
     @Version([VERSION_NEUTRAL, '1'])
     findAll() {
       const a: any = {};
       try {
         console.log(a.b.c);
       } catch (error) {
         throw new BusinessException('你这个参数错了');
       }
       return this.userService.findAll();
     }
   ```



#### 环境配置

项目开发中，至少会经历过 `Dev` -> `Test` -> `Prod` 三个环境。实现环境配置。



**自带环境配置**

1. 安装 插件 @nestjs/config

   `yarn add  @nestjs/config`

2. 注册 插件

   ```ts
   // app.module.ts
   
   import { Module } from '@nestjs/common';
   import { ConfigModule } from '@nestjs/config';
   
   @Module({
     imports: [ConfigModule.forRoot()],
   })
   export class AppModule {}
   ```

   `@nestjs/config` 默认会从**项目根目录**载入并解析一个 `.env` 文件，从 `.env` 文件和 `process.env` 合并环境变量键值对，并将结果存储到一个可以通过 `ConfigService` 访问的私有结构。

   `forRoot()` 方法注册了 `ConfigService` 提供者，后者提供了一个 `get()` 方法来读取这些**解析/合并**的配置变量。

**自定义 YAML**

使用结构更加清晰的 `YAML` 来覆盖默认配置

YAML的了解点击[链接](https://link.juejin.cn/?target=https%3A%2F%2Fbaike.baidu.com%2Fitem%2FYAML%2F1067697)

使用YAML

1. 修改 `app.module.ts` 中 `ConfigModule` 的配置项 `ignoreEnvFile`，禁用默认读取 `.env` 的规则

   ```ts
   ConfigModule.forRoot({ ignoreEnvFile: true, });
   ```

   

2. 安装 Node 的 YAML 包

   `yarn add yaml`

   

3. 根目录新建 `.config` 文件夹，并创建对应环境的 `yaml` 文件

   ```
   .config
     .dev.yaml
     .prod.yaml
     .test.yaml
   ```

   

4. 新建 `utils/index.ts` 文件，添加读取 `YAML` 配置文件的方法

   ```ts
   // utils/index.ts
   
   import { parse } from 'yaml'
   const path = require('path');
   const fs = require('fs');
   
   // 获取项目运行环境
   export const getEnv = () => {
     return process.env.RUNNING_ENV
   }
   
   // 读取项目配置
   export const getConfig = () => {
     const environment = getEnv()
     const yamlPath = path.join(process.cwd(), `./.config/.${environment}.yaml`)
     const file = fs.readFileSync(yamlPath, 'utf8')
     const config = parse(file)
     return config
   }
   ```

   

5. 添加自定义配置项即可正常使用环境变量

   ```ts
   // app.module.ts
   
   import { getConfig } from './utils';
   
   ConfigModule.forRoot({
         ignoreEnvFile: true,
         isGlobal: true,
         load: [getConfig]
       }),
   ```

6. 使用 自定义 配置

   安装 插件:  `yarn add cross-env -D`

   修改启动脚本

   ```json
   "start:dev": "cross-env RUNNING_ENV=dev nest start --watch",
   ```

   测试代码

   ```ts
   // src/user/user.controller.ts
   
   export class UserController {
     constructor(
       private readonly userService: UserService,
       private readonly configService: ConfigService
     ) { }
   
     @Get('getTestName')
     getTestName() {
       return this.configService.get('TEST_VALUE').name;
     }
   }
   ```

   [localhost:3000/v1/user/getTestName](http://localhost:3000/v1/user/getTestName) 测试地址

这并没有注册 `ConfigModule`。这是因为在 `app.module` 中添加 `isGlobal` 属性，开启 `Config` 全局注册，如果 `isGlobal` 没有添加的话，则需要先在对应的 `module` 文件中注册后才能正常使用 `ConfigService`。



#### 热重载

`NestJS` 的 `dev` 模式是将 `TS` 代码编译成 `JS` 再启动，这样每次我们修改代码都会重复经历一次编译的过程。每一次更新代码导致的重新编译会异常痛苦。

`NestJS` 也提供了热重载的功能，借助 `Webpack` 的 `HMR`，使得每次更新只需要替换更新的内容，减少编译的时间与过程。



由于我们是使用 `CLI` 插件安装的工程模板，可以直接使用 `HotModuleReplacementPlugin` 创建配置，减少工作量。

1. 安装 依赖包

   `yarn add webpack-node-externals run-script-webpack-plugin webpack`

   

2. 根目录新建 `webpack-hmr.config.js` 文件

   ```js
   // webpack-hmr.config.js
   
   const nodeExternals = require('webpack-node-externals');
   const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');
   
   module.exports = function (options, webpack) {
     return {
       ...options,
       entry: ['webpack/hot/poll?100', options.entry],
       externals: [
         nodeExternals({
           allowlist: ['webpack/hot/poll?100'],
         }),
       ],
       plugins: [
         ...options.plugins,
         new webpack.HotModuleReplacementPlugin(),
         new webpack.WatchIgnorePlugin({
           paths: [/.js$/, /.d.ts$/],
         }),
         new RunScriptWebpackPlugin({ name: options.output.filename }),
       ],
     };
   };
   ```

   

3. 修改 `main.ts`，开启 `HMR` 功能

   ```ts
   // main.ts
   
   declare const module: any;
   
   async function bootstrap() {
     if (module.hot) {
       module.hot.accept();
       module.hot.dispose(() => app.close());
     }
   }
   bootstrap();
   ```

   

