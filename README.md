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
