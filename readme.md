# DouDian - 供应商管理系统

基于 Go + React 构建的抖店代发供应商管理系统，支持多店铺管理、供应商管理、商品管理、订单管理和采购单管理。参考 3x-ui 风格部署，支持一键安装/卸载。

## 目录

- [技术栈](#技术栈)
- [功能模块](#功能模块)
- [项目结构](#项目结构)
- [依赖清单](#依赖清单)
- [本地开发](#本地开发)
- [构建生产版本](#构建生产版本)
- [部署方式](#部署方式)
  - [方式一：一键远程部署（推荐）](#方式一一键远程部署推荐)
  - [方式二：本地编译 + install.sh 部署](#方式二本地编译--installsh-部署)
  - [方式三：Docker 部署](#方式三docker-部署)
  - [方式四：手动部署](#方式四手动部署)
- [API 接口](#api-接口)
- [环境变量](#环境变量)
- [安全配置](#安全配置)
- [管理命令](#管理命令)
- [License](#license)

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端框架 | Go 1.22+ / Gin | 高性能 HTTP Web 框架 |
| ORM | GORM | Go 语言 ORM |
| 数据库 | SQLite (modernc.org/sqlite) | 纯 Go 实现，无需 CGO，交叉编译友好 |
| 认证 | JWT + 安全路径 | 双重防护机制 |
| 前端框架 | React 18 | 组件化 UI |
| UI 组件库 | Ant Design 5 | 企业级 UI 组件 |
| 构建工具 | Vite 5 | 极速前端构建 |
| HTTP 客户端 | Axios | 前端 API 请求 |
| 路由 | React Router DOM 6 | SPA 前端路由 |
| 部署 | Systemd / Docker | 多种部署方式 |

---

## 功能模块

| 模块 | 功能 | CSV 导入 | CSV 导出 | 模板下载 |
|------|------|:--------:|:--------:|:--------:|
| 仪表板 | 销售统计、订单概览、数据可视化 | - | - | - |
| 抖店管理 | 多店铺区分管理（店铺名称、平台、联系人） | - | - | - |
| 订单管理 | 订单 CRUD、状态流转 | ✓ | ✓ | ✓ |
| 采购单管理 | 采购单 CRUD、从订单自动生成 | - | ✓ | - |
| 商品管理 | 商品 CRUD、SKU 查找、按供应商筛选 | ✓ | ✓ | ✓ |
| 供应商管理 | 供应商 CRUD、关联商品 | ✓ | ✓ | ✓ |
| 工具 | 数据库备份、一键处理所有订单 | - | - | - |

### 订单状态流转

```
pending（待处理） → matched（已匹配） → purchased（已采购） → shipped（已发货） → completed（已完成）
```

### 采购单状态流转

```
pending（待下单） → ordered（已下单） → shipped（已发货） → received（已收货）
```

---

## 项目结构

```
DouDian/
├── main.go                          # 程序入口
├── internal/
│   ├── config/
│   │   └── config.go                # 配置管理（单例模式，读取环境变量）
│   ├── database/
│   │   ├── db.go                    # 数据库初始化（GORM AutoMigrate）
│   │   └── model/
│   │       └── models.go            # 数据模型（Shop/Supplier/Product/Order/PurchaseOrder/User）
│   ├── eventbus/
│   │   └── bus.go                   # 事件总线（发布/订阅模式）
│   ├── service/
│   │   ├── auth_service.go          # 认证服务（登录/注册/密码验证）
│   │   ├── dashboard_service.go     # 仪表盘服务（统计数据聚合）
│   │   ├── order_service.go         # 订单服务
│   │   ├── product_service.go       # 商品服务
│   │   ├── purchase_service.go      # 采购单服务
│   │   ├── shop_service.go          # 抖店服务
│   │   └── supplier_service.go      # 供应商服务
│   ├── util/
│   │   └── jwt.go                   # JWT 工具（生成/验证 Token）
│   └── web/
│       ├── routes.go                # 路由配置（API + SPA 静态文件）
│       ├── controller/
│       │   ├── auth.go              # 认证控制器（登录/登出）
│       │   ├── dashboard.go         # 仪表盘控制器
│       │   ├── order.go             # 订单控制器
│       │   ├── product.go           # 商品控制器
│       │   ├── purchase.go           # 采购单控制器
│       │   ├── shop.go              # 抖店控制器
│       │   ├── supplier.go          # 供应商控制器
│       │   └── tool.go              # 工具控制器（备份/批量处理）
│       └── middleware/
│           ├── auth.go              # 认证中间件（JWT 校验）
│           └── cors.go              # CORS 中间件
├── frontend/
│   ├── index.html                   # HTML 入口
│   ├── package.json                 # 前端依赖管理
│   ├── vite.config.js               # Vite 构建配置
│   └── src/
│       ├── main.jsx                 # React 入口
│       ├── App.jsx                  # 应用根组件（路由定义）
│       ├── index.css                # 全局样式
│       ├── api/
│       │   └── request.js           # Axios 封装（拦截器、Token 注入）
│       ├── components/
│       │   ├── ModalForm.jsx         # 通用表单弹窗
│       │   ├── PageHeader.jsx        # 页面标题栏
│       │   ├── Pagination.jsx        # 分页组件
│       │   ├── SearchBar.jsx         # 搜索栏
│       │   └── StatusTag.jsx         # 状态标签
│       ├── layouts/
│       │   ├── LoginLayout.jsx       # 登录页布局
│       │   └── MainLayout.jsx        # 主布局（侧边栏 + 顶栏）
│       ├── pages/
│       │   ├── Dashboard.jsx         # 仪表板
│       │   ├── Login.jsx             # 登录页
│       │   ├── orders/
│       │   │   └── OrderList.jsx      # 订单列表
│       │   ├── products/
│       │   │   └── ProductList.jsx    # 商品列表
│       │   ├── purchase-orders/
│       │   │   └── PurchaseList.jsx   # 采购单列表
│       │   ├── shops/
│       │   │   └── ShopList.jsx       # 抖店列表
│       │   ├── suppliers/
│       │   │   └── SupplierList.jsx   # 供应商列表
│       │   └── tools/
│       │       └── Tools.jsx          # 工具页
│       └── utils/
│           ├── constants.js          # 常量定义
│           └── format.js             # 格式化工具（日期、金额）
├── nginx/
│   └── doudian.conf                 # Nginx 反向代理配置示例
├── Makefile                         # 构建自动化（make build/clean/run...）
├── deploy.sh                        # 一键远程部署脚本（从 GitHub 下载/编译）
├── install.sh                       # 本地安装脚本（需提前上传二进制文件）
├── manage.sh                        # 交互式管理面板（15 个功能菜单）
├── uninstall.sh                     # 一键卸载脚本
├── Dockerfile                       # 多阶段 Docker 构建
├── docker-compose.yml               # Docker Compose 编排
├── .env.example                     # 环境变量示例
├── go.mod / go.sum                  # Go 依赖管理
├── .gitignore                       # Git 忽略规则
└── .dockerignore                    # Docker 忽略规则
```

---

## 依赖清单

### 后端依赖（go.mod）

| 包 | 版本 | 说明 |
|----|------|------|
| `github.com/gin-gonic/gin` | v1.10.0 | Web 框架 |
| `gorm.io/gorm` | v1.25.12 | ORM |
| `gorm.io/driver/sqlite` | v1.5.6 | GORM SQLite 驱动 |
| `modernc.org/sqlite` | v1.58.0 | 纯 Go SQLite 驱动（无需 CGO） |
| `golang.org/x/crypto` | v0.28.0 | 密码哈希（bcrypt） |

### 前端依赖（package.json）

| 包 | 版本 | 说明 |
|----|------|------|
| `react` / `react-dom` | ^18.2.0 | UI 框架 |
| `antd` | ^5.12.0 | UI 组件库 |
| `axios` | ^1.6.2 | HTTP 客户端 |
| `react-router-dom` | ^6.20.0 | 前端路由 |
| `@ant-design/icons` | ^5.2.6 | 图标库 |
| `dayjs` | ^1.11.10 | 日期处理 |
| `vite` | ^5.0.0 | 构建工具 |
| `@vitejs/plugin-react` | ^4.2.0 | React 插件 |

---

## 本地开发

### 前置要求

- Go 1.22+
- Node.js 18+
- npm 或 yarn

### 启动后端

```bash
# 安装 Go 依赖
go mod download

# 启动后端开发服务器（默认端口 2095）
go run .
```

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器默认运行在 `http://localhost:5173`，API 请求会代理到后端。

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

---

## 构建生产版本

### 构建当前平台

```bash
make build
```

此命令会依次执行：
1. 构建前端（`npm install` + `npm run build`）
2. 将前端产物复制到 `static/` 目录
3. 编译 Go 后端为单二进制文件 `doudian`（CGO 禁用，ldflags 裁剪）

### 交叉编译 Linux

```bash
# amd64（大多数 VPS）
make build-linux

# arm64（如树莓派、ARM 服务器）
make build-arm64
```

### 清理构建产物

```bash
make clean
```

---

## 部署方式

### 方式一：一键远程部署（推荐）

在 VPS 上一行命令完成部署，脚本会自动从 GitHub 下载二进制文件（或源码编译）、配置 Systemd 服务并启动。

#### 交互式部署

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/simon2026-spe/DouDian/master/deploy.sh)
```

#### 非交互式部署（适合自动化/CI）

```bash
PORT=2095 \
SECRET_PATH=yourSecretPath \
ADMIN_PASSWORD=YourStrongPass123 \
NONINTERACTIVE=1 \
bash <(curl -fsSL https://raw.githubusercontent.com/simon2026-spe/DouDian/master/deploy.sh)
```

#### 部署脚本功能

| 功能 | 说明 |
|------|------|
| 自动下载 | 从 GitHub Releases 下载预编译二进制文件 |
| 源码编译 | Releases 不可用时自动 clone 源码并用 Go 编译 |
| 系统检测 | 自动识别 Debian/Ubuntu/CentOS/Rocky/Alpine |
| 架构检测 | 支持 amd64 和 arm64 |
| 依赖安装 | 自动安装 curl/sqlite3/openssl 等系统依赖 |
| 交互配置 | 端口、安全路径、管理员密码 |
| 更新备份 | 检测到已安装时自动备份旧数据 |
| 防火墙配置 | 自动放行端口（ufw/firewalld/iptables） |
| Nginx 配置 | 可选交互式配置反向代理 + 域名 |
| Systemd 服务 | 自动创建服务并设置开机自启 |

#### 部署脚本流程

```
检查 root → 检测系统/架构 → 安装依赖 → 交互配置 → 备份旧数据(如有)
→ 创建目录 → 下载/编译程序 → 安装文件 → 写配置 → 创建 Systemd 服务
→ 配置防火墙 → 启动服务 → 配置 Nginx(可选) → 打印完成信息
```

#### 部署完成后

```bash
# 管理服务
systemctl start doudian      # 启动
systemctl stop doudian       # 停止
systemctl restart doudian    # 重启
systemctl status doudian     # 状态

# 管理面板（15 个功能菜单）
bash /opt/doudian/manage.sh

# 卸载
bash /opt/doudian/manage.sh  # 选择菜单 14
```

---

### 方式二：本地编译 + install.sh 部署

适用于已在本地构建好二进制文件的场景。

#### 步骤

```bash
# 1. 在本地交叉编译 Linux 版本
make build-linux

# 2. 上传文件到服务器
scp doudian-linux-amd64 install.sh manage.sh root@YOUR_SERVER_IP:/opt/

# 3. SSH 登录服务器
ssh root@YOUR_SERVER_IP

# 4. 重命名二进制文件
cd /opt
mv doudian-linux-amd64 doudian
chmod +x doudian

# 5. 运行安装脚本
bash install.sh
```

#### 安装脚本交互流程

安装脚本会引导你配置以下参数：

```
=== 配置参数 ===
请输入服务端口 [默认 2095]: 
请输入安全路径前缀（留空则不启用）: 
请输入管理员密码 [默认 admin123]: 

=== 配置确认 ===
端口: 2095
安全路径: xxx
管理员密码: xxx
确认安装？[Y/n]: 
```

#### 安装完成后

安装脚本会自动完成以下操作：
- 安装系统依赖（curl、sqlite3、openssl 等）
- 创建目录（`/opt/doudian/`、`/var/log/doudian/`、`/opt/doudian/data/`）
- 生成 JWT 密钥并写入配置文件 `/etc/default/doudian`
- 创建 Systemd 服务并设置开机自启
- 启动服务并验证

#### 卸载

```bash
bash /opt/doudian/manage.sh
# 选择菜单 14 卸载系统

# 或直接运行卸载脚本
bash uninstall.sh
```

---

### 方式三：Docker 部署

#### 前置要求

- Docker 20+
- Docker Compose 2+

#### 步骤

```bash
# 1. 克隆仓库
git clone https://github.com/simon2026-spe/DouDian.git
cd DouDian

# 2. 创建环境变量文件（可选）
cp .env.example .env
# 编辑 .env 修改密码和密钥

# 3. 构建并启动
docker-compose up -d --build

# 4. 查看日志
docker-compose logs -f

# 5. 停止
docker-compose down
```

Docker 镜像采用多阶段构建：
- **阶段 1**：Node 18 Alpine 构建前端
- **阶段 2**：Go 1.22 Alpine 编译后端
- **运行阶段**：Alpine 3.19，包含时区配置和健康检查

数据持久化通过 Docker Volume `doudian_data` 挂载到 `/opt/doudian/data`。

---

### 方式四：手动部署

```bash
# 1. 构建二进制
make build-linux

# 2. 上传到服务器
scp doudian-linux-amd64 root@YOUR_SERVER_IP:/opt/doudian
scp -r static root@YOUR_SERVER_IP:/opt/doudian/

# 3. 创建配置文件
ssh root@YOUR_SERVER_IP
cat > /etc/default/doudian << EOF
HOST=0.0.0.0
PORT=2095
DB_PATH=/opt/doudian/data/doudian.db
JWT_SECRET=$(openssl rand -hex 32)
SECRET_PATH=
LOG_LEVEL=info
EOF

# 4. 创建 Systemd 服务
cat > /etc/systemd/system/doudian.service << EOF
[Unit]
Description=DouDian Supplier Management System
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/doudian
EnvironmentFile=/etc/default/doudian
ExecStart=/opt/doudian/doudian
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 5. 启动服务
systemctl daemon-reload
systemctl enable doudian
systemctl start doudian
```

---

## API 接口

所有 API 路径前缀：`/{SECRETPath}/api`（未设置 SECRET_PATH 时为 `/api`）

### 认证

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|:----:|
| POST | `/api/login` | 登录 | ✗ |
| POST | `/api/logout` | 登出 | ✗ |

### 仪表板

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard/stats` | 获取统计数据 |
| GET | `/api/dashboard/recent-orders` | 获取最近订单 |

### 抖店

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/shops` | 抖店列表 |
| GET | `/api/shops/:id` | 抖店详情 |
| POST | `/api/shops` | 创建抖店 |
| PUT | `/api/shops/:id` | 更新抖店 |
| DELETE | `/api/shops/:id` | 删除抖店 |

### 供应商

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/suppliers` | 供应商列表 |
| GET | `/api/suppliers/:id` | 供应商详情 |
| POST | `/api/suppliers` | 创建供应商 |
| PUT | `/api/suppliers/:id` | 更新供应商 |
| DELETE | `/api/suppliers/:id` | 删除供应商 |
| GET | `/api/suppliers/template` | 下载 CSV 模板 |
| GET | `/api/suppliers/export` | 导出 CSV |
| POST | `/api/suppliers/import` | 导入 CSV |

### 商品

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/products` | 商品列表 |
| GET | `/api/products/:id` | 商品详情 |
| GET | `/api/products/lookup/:sku` | 按 SKU 查询 |
| GET | `/api/products/supplier/:supplier_id` | 按供应商筛选 |
| POST | `/api/products` | 创建商品 |
| PUT | `/api/products/:id` | 更新商品 |
| DELETE | `/api/products/:id` | 删除商品 |
| GET | `/api/products/template` | 下载 CSV 模板 |
| GET | `/api/products/export` | 导出 CSV |
| POST | `/api/products/import` | 导入 CSV |

### 订单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/orders` | 订单列表 |
| GET | `/api/orders/:id` | 订单详情 |
| POST | `/api/orders` | 创建订单 |
| DELETE | `/api/orders/:id` | 删除订单 |
| GET | `/api/orders/template` | 下载 CSV 模板 |
| GET | `/api/orders/export` | 导出 CSV |
| POST | `/api/orders/import` | 导入 CSV |

### 采购单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/purchase-orders` | 采购单列表 |
| GET | `/api/purchase-orders/:id` | 采购单详情 |
| POST | `/api/purchase-orders` | 创建采购单 |
| PUT | `/api/purchase-orders/:id` | 更新采购单 |
| POST | `/api/purchase-orders/generate/:order_id` | 从订单生成采购单 |
| GET | `/api/purchase-orders/export` | 导出 CSV |

### 工具

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/tools/process-all` | 一键处理所有订单 |
| POST | `/api/tools/backup` | 数据库备份 |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HOST` | `0.0.0.0` | 监听地址（`127.0.0.1` 仅本机访问） |
| `PORT` | `2095` | 监听端口 |
| `DB_PATH` | `./instance/doudian.db` | SQLite 数据库文件路径 |
| `JWT_SECRET` | `change-me-in-production` | JWT 签名密钥（生产环境务必修改） |
| `SECRET_PATH` | （空） | 安全路径前缀，设置后需通过 `/{path}/` 访问 |
| `LOGIN_USERNAME` | `admin` | 登录用户名 |
| `LOGIN_PASSWORD` | `admin123` | 登录密码（生产环境务必修改） |
| `LOG_LEVEL` | `info` | 日志级别（debug/info/warn/error） |

---

## 安全配置

### 双重防护机制（参考 3x-ui）

**第一道防线 - 安全路径**：通过 `SECRET_PATH` 环境变量设置随机路径前缀。设置后，所有 API 和页面均需通过 `/{secret_path}/` 前缀访问，不知道路径无法访问系统。

```bash
# 生成 18 位随机路径
openssl rand -hex 9
# 示例：a1b2c3d4e5f6a7b8c9
```

**第二道防线 - 账号密码**：用户需输入正确的用户名和密码登录，登录成功后颁发 JWT Token，后续 API 请求需携带 `Authorization: Bearer <token>`。

### 生产环境建议

1. 修改默认密码：设置强密码（至少 12 位，含大小写字母、数字、特殊字符）
2. 设置安全路径：生成 18 位随机字符串作为 `SECRET_PATH`
3. 修改 JWT 密钥：使用 `openssl rand -hex 32` 生成 64 位随机密钥
4. 配置 Nginx 反向代理 + HTTPS：使用 Let's Encrypt 免费证书
5. 开启防火墙：仅放行必要端口（80/443 + 应用端口）

---

## 管理命令

### Systemd 命令

```bash
systemctl start doudian      # 启动
systemctl stop doudian       # 停止
systemctl restart doudian    # 重启
systemctl status doudian     # 状态
systemctl enable doudian     # 开机自启
systemctl disable doudian    # 禁用自启
journalctl -u doudian -f     # 实时日志
```

### 管理面板

```bash
bash /opt/doudian/manage.sh
```

管理面板提供以下 15 个功能：

| 菜单 | 功能 | 说明 |
|:----:|------|------|
| 0 | 退出脚本 | 退出管理面板 |
| 1 | 启动服务 | `systemctl start doudian` |
| 2 | 停止服务 | `systemctl stop doudian` |
| 3 | 重启服务 | `systemctl restart doudian` |
| 4 | 查看状态 | 服务状态 + 端口监听 |
| 5 | 查看日志 | 实时日志/访问日志/错误日志 |
| 6 | 数据库备份 | 自动备份到 `/opt/doudian/data/backups/` |
| 7 | 数据库恢复 | 从备份文件恢复 |
| 8 | 更新应用 | 更新二进制文件后重启 |
| 9 | 查看配置 | 显示配置文件内容 |
| 10 | 编辑配置 | 使用 nano/vi 编辑配置 |
| 11 | 重新生成密钥 | 重置 JWT 密钥（强制下线所有用户） |
| 12 | 配置 Nginx | 交互式配置反向代理 |
| 13 | 查看版本 | 显示二进制文件信息 |
| 14 | 卸载系统 | 完全卸载（可选保留数据） |

### Nginx 反向代理

```bash
# 复制配置文件
cp nginx/doudian.conf /etc/nginx/conf.d/

# 测试配置
nginx -t

# 重载
systemctl reload nginx

# 申请 SSL 证书（Let's Encrypt）
certbot --nginx -d your-domain.com
```

---

## License

MIT
