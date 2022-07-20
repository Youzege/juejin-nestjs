<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>
# Nest JS 网关系统

学习目的，前端想多认识一下接口开发，运维，数据库等知识

[Swagger UI](http://localhost:3000/api/doc#/)

## 额外的 CHANGELOG 配置

**`conventional-changelog-cli`**

从 git 元数据生成更改日志

```
$ npm install -g conventional-changelog-cli
$ cd my-project
$ conventional-changelog -p angular -i CHANGELOG.md -s
```

第一次使用此工具，并且想要生成所有以前的更改日志，则可以执行以下操作。*这将*覆盖任何以前的更改日志（如果存在）。

```
$ conventional-changelog -p angular -i CHANGELOG.md -s -r 0
```

### `npm version`

通过以下钩子使用 npm 脚本来发挥我们的优势

```json
{
  "scripts": {
    "version": "conventional-changelog -p angular -i CHANGELOG.md -s && git add CHANGELOG.md"
  }
}
```



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

4. 修改启动脚本启动命令

   ```json
   "start:hot": "cross-env RUNNING_ENV=dev nest build --webpack --webpackPath webpack-hmr.config.js --watch"
   ```



#### Swagger文档

后端服务，**API** 文档是必不可少的，除了接口描述、参数描述之外，自测也十分方便。`NestJS` 自带了 `Swagger` 文档，集成非常简单，接下来进行文档的配置部分。

1. 安装 文档 依赖

   `yarn add @nestjs/swagger fastify-swagger`

   

2. 创建 `src/doc.ts` 文件

   ```ts
   // src/doc.ts
   
   import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
   import * as packageConfig from '../package.json'
   
   export const generateDocument = (app) => {
   
     const options = new DocumentBuilder()
       .setTitle(packageConfig.name)
       .setDescription(packageConfig.description)
       .setVersion(packageConfig.version)
       .build();
   
     const document = SwaggerModule.createDocument(app, options);
   
     SwaggerModule.setup('/api/doc', app, document);
   }
   ```

   

3. 在 `main.ts` 中引入方法

   ```ts
   // main.ts
   
    // 创建文档
     generateDocument(app)
   ```

   [Swagger UI ](http://localhost:3000/api/doc)查看API文档

### 二、 飞书应用对接

飞书等企业工具，提高很多开发接口API，例如机器人、消息通知、文档等。



#### 封装底层请求库

`NestJS` 内置了 `@nestjs/axios` 请求库，对于飞书的 `Open API` 封装，还是利用之前的模式，不将它与 `NestJS` 过度的耦合在一起。



1. 添加应用配置，更新yaml配置

   ```
   FEISHU_CONFIG:
     FEISHU_URL: https://open.feishu.cn/open-apis
     FEISHU_API_HOST: https://open.feishu.cn
     FEISHU_APP_ID: balabalabala
     FEISHU_APP_SECRET: balabalabala
   ```

   

2. 建 `utils/request.ts` 文件

   ```ts
   // src/utils/request.ts
   
   import axios, { Method } from 'axios';
   import { getConfig } from './index';
   
   const {
     FEISHU_CONFIG: { FEISHU_URL },
   } = getConfig();
   
   /**
    * @description: 任意请求
    */
   const request = async ({ url, option = {} }) => {
     try {
       return axios.request({
         url,
         ...option,
       });
     } catch (error) {
       throw error;
     }
   };
   
   interface IMethodV {
     url: string;
     method?: Method;
     headers?: { [key: string]: string };
     params?: Record<string, unknown>;
     query?: Record<string, unknown>;
   }
   
   export interface IRequest {
     data: any;
     code: number;
   }
   
   /**
    * @description: 带 version 的通用 api 请求
    */
   const methodV = async ({
     url,
     method,
     headers,
     params = {},
     query = {},
   }: IMethodV): Promise<IRequest> => {
     let sendUrl = '';
     if (/^(http:\/\/|https:\/\/)/.test(url)) {
       sendUrl = url;
     } else {
       sendUrl = `${FEISHU_URL}${url}`;
     }
     try {
       return new Promise((resolve, reject) => {
         axios({
           headers: {
             'Content-Type': 'application/json; charset=utf-8',
             ...headers,
           },
           url: sendUrl,
           method,
           params: query,
           data: {
             ...params,
           },
         })
           .then(({ data, status }) => {
             resolve({ data, code: status });
           })
           .catch((error) => {
             reject(error);
           });
       });
     } catch (error) {
       throw error;
     }
   };
   
   export { request, methodV };
   ```

   

3. 创建飞书基础层

   ```
   src/helper/feishu
     auth.ts
     const.ts
     type.ts
     user.ts
   ```

   **auth.ts**

   ```ts
   
   import { APP_ID, APP_SECRET } from './const';
   
   import { methodV } from '@/utils/request';
   
   export type GetAppTokenRes = {
     code: number;
     msg: string;
     app_access_token: string;
     expire: number;
   };
   
   export const getUserToken = async ({ code, app_token }) => {
     const { data } = await methodV({
       url: `/authen/v1/access_token`,
       method: 'POST',
       headers: {
         Authorization: `Bearer ${app_token}`,
       },
       params: {
         grant_type: 'authorization_code',
         code,
       },
     });
     return data;
   };
   
   export const refreshUserToken = async ({ refreshToken, app_token }) => {
     const { data } = await methodV({
       url: `/authen/v1/refresh_access_token`,
       method: 'POST',
       headers: {
         Authorization: `Bearer ${app_token}`,
       },
       params: {
         grant_type: 'refresh_token',
         refresh_token: refreshToken,
         app_token,
       },
     });
     return data;
   };
   
   export const getUserAccessToken = async (code) => {
     const { data } = await methodV({
       url: `/suite/passport/oauth/token`,
       method: 'POST',
       params: {
         grant_type: 'authorization_code',
         code,
         app_id: APP_ID,
         app_secret: APP_SECRET,
       },
     });
     return data as GetAppTokenRes;
   };
   
   
   export const getAppToken = async () => {
     const { data } = await methodV({
       url: `/auth/v3/app_access_token/internal`,
       method: 'POST',
       params: {
         app_id: APP_ID,
         app_secret: APP_SECRET,
       },
     });
     return data as GetAppTokenRes;
   };
   ```

   

   **const.ts**

   ```ts
   /*
    * @Author: Cookie
    * @Description:
    */
   
   import { getConfig } from '@/utils';
   
   const { FEISHU_CONFIG } = getConfig();
   
   export const APP_ID = FEISHU_CONFIG.FEISHU_APP_ID;
   export const APP_SECRET = FEISHU_CONFIG.FEISHU_APP_SECRET;
   ```

   

   **type.ts**

   ```ts
   export interface CreateApprovalParams {
     approval_code: string;
     user_id: string;
     form: string;
   }
   
   export interface GetApprovalDefinedParams {
     approval_code: string;
   }
   
   export interface GetApprovalInstanceParams {
     instance_code: string;
     user_id?: string;
     open_id?: string;
   }
   ```

   

   **user.ts**

   ```ts
   import { methodV } from '@/utils/request';
   
   export const getUserInfo = async (user_token: string) => {
     const { data } = await methodV({
       url: `/authen/v1/user_info`,
       method: 'GET',
       headers: {
         Authorization: `Bearer ${user_token}`,
       },
     });
     return data;
   };
   
   /**
    * 获取通信录单个用户信息
    * @param feishuUserId
    * @param user_token
    * @returns
    */
   export const getSingleUserInfo = async (
     feishuUserId: string,
     token: string,
   ) => {
     const { data } = await methodV({
       url: `/contact/v3/users/${feishuUserId}`,
       method: 'GET',
       query: {
         user_id_type: 'user_id',
       },
       headers: {
         Authorization: `Bearer ${token}`,
       },
     });
     return data;
   };
   
   /**
    * 获取用户列表
    * @param app_token
    * @returns
    */
   export const getUserListByDepartmentId = async (department_id: string, app_token: string) => {
     const { data } = await methodV({
       url: `https://open.feishu.cn/open-apis/contact/v3/users`,
       // url: `/contact/v3/users/find_by_department`,
       method: 'GET',
       query: {
         department_id_type: 'department_id',
         department_id,
         page_size: 50,
       },
       headers: {
         Authorization: `Bearer ${app_token}`,
       },
     });
     return data;
   };
   
   
   export const getEmployeeTypeEnums = async ({ app_token }) => {
     const { data } = await methodV({
       url: `/contact/v3/employee_type_enums`,
       method: 'GET',
       query: {
         page_token: 1,
         page_size: 100,
       },
       headers: {
         Authorization: `Bearer ${app_token}`,
       },
     });
     return data;
   };
   ```

   

#### 调用飞书 API

根据文档描述，飞书提供了下述 **3** 种访问凭证，分别有不同的用途

| 访问凭证类型        | 是否需要用户授权 | 是否需要租户管理员授权 | 适用的应用场景                 |
| ------------------- | ---------------- | ---------------------- | ------------------------------ |
| app_access_token    | 不需要           | 不需要                 | 纯后台服务等                   |
| tenant_access_token | 不需要           | 需要                   | 网页应用、机器人、纯后台服务等 |
| user_access_token   | 需要             | 不需要                 | 小程序、网页应用等             |



调用三方接口获取凭证后，再使用凭证调用 **API** 的链路过程比较长，同时也可能收网络波动、请求频率的限制，需要将凭证缓存在本地，等有效期小于 **30** 分钟时再去换取新的凭证，减少调用链接、降低请求频率。



`NestJS` 提供了**高速缓存**的插件 `cache-manager`，为对各种缓存存储提供程序提供了统一的 `API`，内置的是内存中的数据存储。

**缓存封装**

1. 安装 依赖 @types

   ```
   yarn add cache-manager 
   yarn add -D @types/cache-manager
   ```

   

2. 注册 Module

   设置`src/user/user.module.ts`

   ```ts
   import { Module } from '@nestjs/common';
   import { FeishuController } from './feishu/feishu.controller';
   
   @Module({
     controllers: [UserController, FeishuController],
     providers: [UserService, FeishuService],
   })
   export class UserModule {}
   ```

   使用的 `Module` 中全局注册 `CacheModule`，配置`app.module.ts`

   ```ts
   import { Module, CacheModule } from '@nestjs/common';
   
   @Module({
     imports: [
       CacheModule.register({
         isGlobal: true,
       }),
     ],
   })
   export class AppModule {}
   ```

   

3. 配置 feishu.service

   ```ts
   import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
   import {
     getAppToken,
   } from 'src/helper/feishu/auth';
   import { Cache } from 'cache-manager';
   import { BusinessException } from '@/common/exceptions/business.exception';
   import { ConfigService } from '@nestjs/config';
   
   @Injectable()
   export class FeishuService {
     private APP_TOKEN_CACHE_KEY;
     constructor(
       @Inject(CACHE_MANAGER) private cacheManager: Cache,
       private configService: ConfigService,
     ) {
       this.APP_TOKEN_CACHE_KEY = this.configService.get('APP_TOKEN_CACHE_KEY');
     }
   
     async getAppToken() {
       let appToken: string;
       appToken = await this.cacheManager.get(this.APP_TOKEN_CACHE_KEY);
       if (!appToken) {
         const response = await getAppToken();
         if (response.code === 0) {
           // token 有效期为 2 小时，在此期间调用该接口 token 不会改变。当 token 有效期小于 30 分的时候,再次请求获取 token 的时候，会生成一个新的 token，与此同时老的 token 依然有效。
           appToken = response.app_access_token;
           this.cacheManager.set(this.APP_TOKEN_CACHE_KEY, appToken, {
             ttl: response.expire - 60,
           });
         } else {
           throw new BusinessException('飞书调用异常');
         }
       }
       return appToken;
     }
   }
   ```

   

#### 飞书机器人

封装完应用凭证之后就可以使用凭证调用飞书的 Open API

1. 首先需要开启机器人的能力。

   [飞书开放平台 (feishu.cn)](https://open.feishu.cn/apps/cli_a24534bd9ce39013/bot)

2. 发布应用并选择应用使用范围，如果不在应用可用范围的用户，机器人是没办法推送消息的。

3. 封装机器人发送消息对应的 API。

   发送消息的接口为 [open.feishu.cn/open-apis/i…](https://link.juejin.cn/?target=https%3A%2F%2Fopen.feishu.cn%2Fopen-apis%2Fim%2Fv1%2Fmessages%3Freceive_id_type%3D%5B%5D) ，可用根据以下几种类型发送消息给指定的用户或群组

   `Query 参数 receive_id_type` **可选值**：

   - `open_id`：以 open_id 来识别用户([什么是 Open ID](https://link.juejin.cn/?target=https%3A%2F%2Fopen.feishu.cn%2Fdocument%2Fhome%2Fuser-identity-introduction%2Fopen-id)) 。
   - `user_id`：以 user_id 来识别用户，需要有获取用户 userID 的权限 ([什么是 User ID](https://link.juejin.cn/?target=https%3A%2F%2Fopen.feishu.cn%2Fdocument%2Fhome%2Fuser-identity-introduction%2Fuser-id))。
   - `union_id`：以 union_id 来识别用户([什么是 Union ID](https://link.juejin.cn/?target=https%3A%2F%2Fopen.feishu.cn%2Fdocument%2Fhome%2Fuser-identity-introduction%2Funion-id))。
   - `email`：以 email 来识别用户，是用户的真实邮箱。
   - `chat_id`：以 chat_id 来识别群聊，群 ID 说明请参考：[群ID 说明](https://link.juejin.cn/?target=https%3A%2F%2Fopen.feishu.cn%2Fdocument%2FuAjLw4CM%2FukTMukTMukTM%2Freference%2Fim-v1%2Fchat-id-description) 。

   根据发送用户与信息的类型有如下几种参数。

   `Body` **参数**：

   | 名称       | 类型   | 必填 | 描述                                                         |
   | ---------- | ------ | ---- | ------------------------------------------------------------ |
   | receive_id | string | 是   | 依据 receive_id_type 的值，填写对应的消息接收者 id**示例值**："ou_7d8a6e6df7621556ce0d21922b676706ccs" |
   | content    | string | 是   | 消息内容，json 结构序列化后的字符串。不同msg_type对应不同内容。消息类型 包括：text、post、image、file、audio、media、sticker、interactive、share_chat、share_user等，具体格式说明参考：[发送消息content说明](https://link.juejin.cn/?target=https%3A%2F%2Fopen.feishu.cn%2Fdocument%2FuAjLw4CM%2FukTMukTMukTM%2Fim-v1%2Fmessage%2Fcreate_json) |
   | msg_type   | string | 是   | 消息类型 包括：text、post、image、file、audio、media、sticker、interactive、share_chat、share_user等，类型定义请参考[发送消息content说明](https://link.juejin.cn/?target=https%3A%2F%2Fopen.feishu.cn%2Fdocument%2FuAjLw4CM%2FukTMukTMukTM%2Fim-v1%2Fmessage%2Fcreate_json) |

4. 封装如下的函数

   ```ts
   // src/helper/feishu/message.ts
   
   import { methodV } from 'src/utils/request';
   
   export enum RECEIVE_TYPE { 'open_id', 'user_id', 'union_id', 'email', 'chat_id' }
   
   export enum MSG_TYPE { text, post, image, file, audio, media, sticker, interactive, share_chat, share_user}
   
   type MESSAGES_PARAMS = {
     receive_id: string
     content: string
     msg_type: MSG_TYPE
   }
   
   export const messages = async (receive_id_type: RECEIVE_TYPE, params: MESSAGES_PARAMS, app_token: string) => {
     console.log(receive_id_type, params, app_token)
   
     const { data } = await methodV({
       url: `/im/v1/messages`,
       method: 'POST',
       query: { receive_id_type },
       params,
       headers: {
         Authorization: `Bearer ${app_token}`,
       },
     });
     return data;
   };
   ```

5. 开发对应的 `Service`

   ```ts
   // src/user/feishu/feishu.service.ts
   
   async sendMessage(receive_id_type, params) {
       const app_token = await this.getAppToken()
       return messages(receive_id_type, params, app_token as string)
     }
   ```

   注意：这里的 `app_token` 获取方式使用上述封装好的访问凭证方法，带有缓存的版本。

   

6. 开发对应的 `Controller` 以及 `Dto`。

   ```ts
   // src/user/feishu/feishu.controller.ts
   
   import { Body, Controller, Post } from '@nestjs/common';
   import { ApiOperation, ApiTags } from '@nestjs/swagger';
   import { FeishuService } from './feishu.service';
   import { FeishuMessageDto } from './feishu.dto';
   
   @ApiTags('飞书')
   @Controller('feishu')
   export class FeishuController {
     constructor(private readonly feishuService: FeishuService) {}
   
     @ApiOperation({
       summary: '消息推送',
     })
     @Post('sendMessage')
     sendMessage(@Body() params: FeishuMessageDto) {
       const { receive_id_type, ...rest } = params;
       return this.feishuService.sendMessage(receive_id_type, rest);
     }
   }
   ```

   ```ts
   // src/user/feishu/feishu.dto.ts
   
   import { RECEIVE_TYPE, MSG_TYPE } from '@/helper/feishu/message';
   import { ApiProperty } from '@nestjs/swagger';
   
   export class FeishuMessageDto {
     @ApiProperty({ example: 'email' })
     receive_id_type: RECEIVE_TYPE;
   
     @ApiProperty({ example: 'cookieboty@qq.com' })
     receive_id?: string;
   
     @ApiProperty({ example: '{"text":" test content"}' })
     content?: string;
   
     @ApiProperty({ example: 'text', enum: MSG_TYPE })
     msg_type?: keyof MSG_TYPE;
   }
   ```

   

7.  完成飞书机器人发送信息~

   swagger中点击 **Try it out** 发送测试信息，如果按照步骤一路下来的话，应该能正常收到飞书机器人推送的消息了。

#### 完善错误提示

返回的接口是业务性质的通用报错 503，但我们已经预先知道了请求参数类型有几种，这种错误可以在请求飞书之后就预先校验出来，减少请求次数同时给予用户正确的反馈，我们可以借助 `class-validator` 来做入参校验

1. 安装 `class-validator` 相关的依赖

   ```
   yarn add class-validator class-transformer
   ```

   

2. `main.ts` 添加 `ValidationPipe` 验证管道，从 `@nestjs/common` 导出

   ```ts
   app.useGlobalPipes(new ValidationPipe());
   ```

   

3. 使用 `class-validator` 内置的验证装饰器对需要验证的 Dto 参数添加校验

   ```ts
   // src\user\feishu\feishu.dto.ts
   
   import { RECEIVE_TYPE, MSG_TYPE } from '@/helper/feishu/message';
   import { ApiProperty } from '@nestjs/swagger';
   import { IsNotEmpty, IsEnum } from 'class-validator';
   
   export class FeishuMessageDto {
     @IsNotEmpty()
     @IsEnum(RECEIVE_TYPE)
     @ApiProperty({ example: 'email', enum: RECEIVE_TYPE })
     receive_id_type: RECEIVE_TYPE;
   
     @IsNotEmpty()
     @ApiProperty({ example: 'cookieboty@qq.com' })
     receive_id?: string;
   
     @IsNotEmpty()
     @ApiProperty({ example: '{"text":" test content"}' })
     content?: string;
   
     @IsNotEmpty()
     @IsEnum(MSG_TYPE)
     @ApiProperty({ example: 'text', enum: MSG_TYPE })
     msg_type?: keyof MSG_TYPE;
   }
   ```

   
