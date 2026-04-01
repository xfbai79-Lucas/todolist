# 任务管理系统（Node.js + Express + SQLite）

这是一个完整的任务管理系统示例，包含：
- Express 后端 API
- SQLite 本地数据库
- 简单前端页面（HTML + 原生 JavaScript）

## 功能

- 获取所有任务：`GET /api/tasks`
- 新建任务：`POST /api/tasks`
- 更新任务状态：`PATCH /api/tasks/:id/status`
- 删除任务：`DELETE /api/tasks/:id`

## 数据库表结构

项目启动时会自动创建 `tasks` 表：

- `id`：主键，自增
- `title`：任务标题（必填）
- `description`：任务描述
- `completed`：任务状态（0/1）
- `due_date`：截止日期（可选）
- `created_at`：创建时间
- `updated_at`：更新时间

SQLite 数据库文件位置：`data/tasks.db`

## 运行步骤

1. 安装依赖

```bash
npm install
```

2. 启动项目

```bash
npm start
```

3. 打开浏览器访问

```text
http://localhost:3000
```

## API 示例

### 1) 获取所有任务

```bash
curl http://localhost:3000/api/tasks
```

### 2) 新建任务

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"学习 Express","description":"完成任务管理系统","dueDate":"2026-04-01"}'
```

### 3) 更新任务状态

```bash
curl -X PATCH http://localhost:3000/api/tasks/1/status \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

### 4) 删除任务

```bash
curl -X DELETE http://localhost:3000/api/tasks/1
```
