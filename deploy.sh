#!/bin/bash
# ==============================================================================
# DouDian - 抖店一键代发供应商管理系统
# 一键远程部署脚本
#
# 用法:
#   bash <(curl -fsSL https://raw.githubusercontent.com/simon2026-spe/DouDian/master/deploy.sh)
#
# 环境变量（非交互模式）:
#   PORT=2095              服务端口
#   SECRET_PATH=           安全路径前缀（留空不启用）
#   ADMIN_PASSWORD=admin123 管理员密码
#   NONINTERACTIVE=1       非交互模式
#   KEEP_DATA=1            更新时保留旧数据
#   GITHUB_USER=simon2026-spe  GitHub 用户名
#   GITHUB_REPO=DouDian       GitHub 仓库名
# ==============================================================================

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
PLAIN='\033[0m'

# 配置
APP_NAME="doudian"
APP_DIR="/opt/doudian"
LOG_DIR="/var/log/doudian"
DATA_DIR="/opt/doudian/data"
BACKUP_DIR="/opt/doudian/data/backups"
CONFIG_FILE="/etc/default/doudian"
SERVICE_FILE="/etc/systemd/system/doudian.service"
NGINX_CONF="/etc/nginx/conf.d/doudian.conf"
DEFAULT_PORT=2095
GITHUB_USER="${GITHUB_USER:-simon2026-spe}"
GITHUB_REPO="${GITHUB_REPO:-doudian-ysm}"

# 临时目录
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# ==============================================================================
# 基础函数
# ==============================================================================

print_info() {
    echo -e "${BLUE}[INFO]${PLAIN} $1"
}

print_ok() {
    echo -e "${GREEN}[OK]${PLAIN} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${PLAIN} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${PLAIN} $1"
}

print_step() {
    echo ""
    echo -e "${CYAN}${BOLD}── $1 ──${PLAIN}"
}

confirm() {
    if [[ "${NONINTERACTIVE:-0}" == "1" ]]; then
        return 0
    fi
    read -p "$1 [Y/n]: " choice
    choice=${choice:-Y}
    [[ "$choice" =~ ^[Yy]$ ]]
}

# ==============================================================================
# 检查 root
# ==============================================================================

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "请使用 root 用户运行此脚本"
        echo -e "  ${YELLOW}sudo bash deploy.sh${PLAIN}"
        exit 1
    fi
}

# ==============================================================================
# 检测系统
# ==============================================================================

detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        OS_VER=$VERSION_ID
        OS_PRETTY=$PRETTY_NAME
    elif [[ -f /etc/redhat-release ]]; then
        OS="centos"
        OS_VER=$(rpm -q --qf "%{VERSION}" centos-release 2>/dev/null || echo "7")
        OS_PRETTY=$(cat /etc/redhat-release)
    else
        OS=$(uname -s)
        OS_VER=$(uname -r)
        OS_PRETTY="$OS $OS_VER"
    fi

    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64|amd64) ARCH="amd64" ;;
        aarch64|arm64) ARCH="arm64" ;;
        *)
            print_error "不支持的架构: $ARCH"
            exit 1
            ;;
    esac

    print_info "系统: $OS_PRETTY"
    print_info "架构: $ARCH"
}

# ==============================================================================
# 安装系统依赖
# ==============================================================================

install_deps() {
    print_step "安装系统依赖"

    case "$OS" in
        debian|ubuntu)
            apt-get update -qq
            apt-get install -y -qq curl wget tar sqlite3 openssl ca-certificates
            ;;
        centos|rocky|rhel|fedora|amzn)
            if command -v dnf &>/dev/null; then
                dnf install -y -q curl wget tar sqlite openssl ca-certificates
            else
                yum install -y -q curl wget tar sqlite openssl ca-certificates
            fi
            ;;
        alpine)
            apk add --no-cache curl wget tar sqlite openssl ca-certificates
            ;;
        *)
            print_warn "未知系统类型 ($OS)，尝试继续..."
            ;;
    esac

    print_ok "系统依赖安装完成"
}

# ==============================================================================
# 获取用户输入
# ==============================================================================

get_user_input() {
    print_step "配置参数"

    # 端口
    if [[ -z "${PORT:-}" ]]; then
        read -p "请输入服务端口 [默认 $DEFAULT_PORT]: " INPUT_PORT
        PORT=${INPUT_PORT:-$DEFAULT_PORT}
    fi

    if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [[ "$PORT" -lt 1 || "$PORT" -gt 65535 ]]; then
        print_warn "无效端口号，使用默认端口 $DEFAULT_PORT"
        PORT=$DEFAULT_PORT
    fi

    if ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
        print_warn "端口 $PORT 已被占用"
    fi

    # 安全路径
    if [[ -z "${SECRET_PATH:-}" && "${NONINTERACTIVE:-0}" != "1" ]]; then
        echo ""
        echo -e "  安全路径是第一道防线，设置后需通过 ${CYAN}http://IP:PORT/路径/${PLAIN} 访问"
        echo -e "  可用以下命令生成: ${CYAN}openssl rand -hex 9${PLAIN}"
        read -p "请输入安全路径前缀（留空则不启用）: " SECRET_PATH
    fi
    SECRET_PATH="${SECRET_PATH:-}"

    # 管理员密码
    if [[ -z "${ADMIN_PASSWORD:-}" && "${NONINTERACTIVE:-0}" != "1" ]]; then
        read -p "请输入管理员密码 [默认 admin123]: " INPUT_PWD
        ADMIN_PASSWORD=${INPUT_PWD:-admin123}
    fi
    ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

    # 配置确认
    if [[ "${NONINTERACTIVE:-0}" != "1" ]]; then
        echo ""
        echo -e "${CYAN}=== 配置确认 ===${PLAIN}"
        echo "  端口:       $PORT"
        echo "  安全路径:   ${SECRET_PATH:-无}"
        echo "  管理员密码: $ADMIN_PASSWORD"
        echo ""

        if ! confirm "确认安装？"; then
            echo "安装已取消"
            exit 0
        fi
    fi
}

# ==============================================================================
# 下载二进制文件
# ==============================================================================

download_binary() {
    print_step "下载程序文件"

    # 检查本地是否已有二进制文件（开发模式）
    if [[ -f "./doudian" && -f "./manage.sh" ]]; then
        print_info "检测到本地二进制文件，使用本地文件"
        BINARY_SOURCE="local"
        return
    fi

    BINARY_SOURCE="remote"

    # 方式1: 直接从 GitHub Releases 下载预编译二进制文件（无需 API，无需编译）
    # GitHub 支持通过 releases/latest/download/ 直接下载最新 Release 的资源
    local direct_url="https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/latest/download/doudian-linux-${ARCH}.tar.gz"

    print_info "尝试下载预编译二进制文件..."
    print_info "下载地址: $direct_url"

    # 先检查 URL 是否可用（HTTP 200）
    local http_code
    http_code=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 15 "$direct_url" 2>/dev/null || echo "000")

    if [[ "$http_code" == "200" ]]; then
        print_info "找到预编译二进制文件，下载中（约 10-30 秒）..."
        if curl -sL --max-time 120 -o "$TEMP_DIR/doudian.tar.gz" "$direct_url"; then
            tar -xzf "$TEMP_DIR/doudian.tar.gz" -C "$TEMP_DIR/"
            print_ok "预编译二进制文件下载完成"
            return
        fi
    else
        print_warn "直接下载失败 (HTTP $http_code)，尝试 GitHub API..."

        # 方式1b: 通过 GitHub API 获取下载 URL
        local release_url="https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/latest"
        local release_info
        release_info=$(curl -sL --max-time 15 "$release_url" 2>/dev/null || echo "")

        if [[ -n "$release_info" ]] && echo "$release_info" | grep -q "browser_download_url"; then
            local download_url
            download_url=$(echo "$release_info" | grep "browser_download_url" | grep "${ARCH}" | head -1 | sed 's/.*"browser_download_url": *"//;s/".*//')

            if [[ -n "$download_url" ]]; then
                print_info "通过 API 找到: $download_url"
                if curl -sL --max-time 120 -o "$TEMP_DIR/doudian.tar.gz" "$download_url"; then
                    tar -xzf "$TEMP_DIR/doudian.tar.gz" -C "$TEMP_DIR/"
                    print_ok "预编译二进制文件下载完成"
                    return
                fi
            fi
        fi
    fi

    # 方式2: 从 GitHub Releases 下载失败，尝试源码编译
    print_warn "未找到 GitHub Release 预编译文件"
    print_info "将下载源码并在服务器上编译（自动安装 Go + Node.js）..."
    echo ""

    local repo_url="https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git"

    # 安装 git
    if ! command -v git &>/dev/null; then
        print_info "安装 git..."
        case "$OS" in
            debian|ubuntu) apt-get install -y -qq git ;;
            centos|rocky|rhel|fedora) yum install -y -q git || dnf install -y -q git ;;
            alpine) apk add --no-cache git ;;
        esac
    fi

    if git clone --depth=1 "$repo_url" "$TEMP_DIR/DouDian" 2>/dev/null; then
        print_ok "源码下载完成"

        # 安装 Go
        if ! command -v go &>/dev/null; then
            print_info "安装 Go 1.22..."
            local go_version="go1.22.0"
            local go_url="https://go.dev/dl/${go_version}.linux-${ARCH}.tar.gz"
            curl -sL "$go_url" | tar -C /usr/local -xzf -
            export PATH=$PATH:/usr/local/go/bin
            print_ok "Go 安装完成"
        fi

        # 编译后端
        print_info "编译后端..."
        cd "$TEMP_DIR/DouDian"
        CGO_ENABLED=0 go build -ldflags "-s -w" -o doudian .
        print_ok "后端编译完成"

        # 安装 Node.js 并构建前端
        if ! command -v node &>/dev/null; then
            print_info "安装 Node.js 18..."
            case "$OS" in
                debian|ubuntu)
                    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
                    apt-get install -y -qq nodejs
                    ;;
                centos|rocky|rhel|fedora)
                    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
                    yum install -y -q nodejs || dnf install -y -q nodejs
                    ;;
                alpine)
                    apk add --no-cache nodejs npm
                    ;;
            esac
            print_ok "Node.js 安装完成"
        fi

        if command -v npm &>/dev/null; then
            print_info "构建前端..."
            cd frontend && npm install --silent 2>/dev/null && npm run build
            cd ..
            cp -r frontend/dist static
            print_ok "前端构建完成"
        else
            print_warn "npm 不可用，跳过前端构建（将仅使用后端 API）"
        fi

        cd "$TEMP_DIR/DouDian"
        cp manage.sh "$TEMP_DIR/" 2>/dev/null || true
        BINARY_SOURCE="compiled"
        print_ok "源码编译完成"
        return
    fi

    print_error "无法下载程序文件"
    echo -e "  ${YELLOW}请手动操作:${PLAIN}"
    echo -e "  ${YELLOW}  1. 在本地运行 make build-linux 编译${PLAIN}"
    echo -e "  ${YELLOW}  2. 上传 doudian-linux-amd64 和 static/ 到服务器${PLAIN}"
    echo -e "  ${YELLOW}  3. 运行 bash install.sh${PLAIN}"
    exit 1
}

# ==============================================================================
# 备份旧数据（更新模式）
# ==============================================================================

backup_old_data() {
    if [[ -d "$APP_DIR" && -f "$APP_DIR/doudian" ]]; then
        print_step "检测到已安装，备份数据并更新"

        local backup_time=$(date +%Y%m%d_%H%M%S)
        local backup_path="${BACKUP_DIR}/pre-update_${backup_time}"

        mkdir -p "$backup_path"

        # 备份数据库
        if [[ -f "$DATA_DIR/doudian.db" ]]; then
            cp "$DATA_DIR/doudian.db" "$backup_path/"
            print_ok "数据库已备份到 $backup_path"
        fi

        # 备份配置
        if [[ -f "$CONFIG_FILE" ]]; then
            cp "$CONFIG_FILE" "$backup_path/doudian.env"
            print_ok "配置文件已备份"
        fi

        # 停止旧服务
        print_info "停止旧服务..."
        systemctl stop doudian 2>/dev/null || true

        IS_UPDATE=1
    else
        IS_UPDATE=0
    fi
}

# ==============================================================================
# 创建目录
# ==============================================================================

create_dirs() {
    print_step "创建目录"

    mkdir -p "$APP_DIR"
    mkdir -p "$DATA_DIR"
    mkdir -p "$DATA_DIR/backups"
    mkdir -p "$LOG_DIR"

    print_ok "目录创建完成:"
    echo -e "    ${CYAN}应用目录:  $APP_DIR${PLAIN}"
    echo -e "    ${CYAN}数据目录:  $DATA_DIR${PLAIN}"
    echo -e "    ${CYAN}日志目录:  $LOG_DIR${PLAIN}"
}

# ==============================================================================
# 安装程序文件
# ==============================================================================

install_files() {
    print_step "安装程序文件"

    case "$BINARY_SOURCE" in
        local)
            cp ./doudian "$APP_DIR/"
            if [[ -d ./static ]]; then
                cp -r ./static "$APP_DIR/"
            fi
            ;;
        remote)
            # tar 包中二进制文件名带平台后缀（如 doudian-linux-amd64），需重命名为 doudian
            if [[ -f "$TEMP_DIR/doudian-linux-${ARCH}" ]]; then
                cp "$TEMP_DIR/doudian-linux-${ARCH}" "$APP_DIR/doudian"
            elif [[ -f "$TEMP_DIR/doudian" ]]; then
                cp "$TEMP_DIR/doudian" "$APP_DIR/"
            else
                print_error "未找到二进制文件，解压内容:"
                ls -la "$TEMP_DIR/"
                exit 1
            fi
            if [[ -d "$TEMP_DIR/static" ]]; then
                cp -r "$TEMP_DIR/static" "$APP_DIR/"
            fi
            ;;
        compiled)
            cp "$TEMP_DIR/DouDian/doudian" "$APP_DIR/"
            if [[ -d "$TEMP_DIR/DouDian/static" ]]; then
                cp -r "$TEMP_DIR/DouDian/static" "$APP_DIR/"
            fi
            ;;
    esac

    chmod +x "$APP_DIR/doudian"

    # 安装管理脚本
    local manage_source=""
    case "$BINARY_SOURCE" in
        local) [[ -f ./manage.sh ]] && manage_source="./manage.sh" ;;
        remote) [[ -f "$TEMP_DIR/manage.sh" ]] && manage_source="$TEMP_DIR/manage.sh" ;;
        compiled) [[ -f "$TEMP_DIR/manage.sh" ]] && manage_source="$TEMP_DIR/manage.sh" ;;
    esac

    if [[ -n "$manage_source" ]]; then
        cp "$manage_source" "$APP_DIR/"
        chmod +x "$APP_DIR/manage.sh"
    fi

    print_ok "程序文件安装完成"
}

# ==============================================================================
# 写入配置文件
# ==============================================================================

write_config() {
    print_step "写入配置文件"

    local jwt_secret
    jwt_secret=$(openssl rand -hex 32)

    cat > "$CONFIG_FILE" << EOF
# DouDian 供应商管理系统配置文件
# 生成时间: $(date)
# 端口: $PORT

HOST=0.0.0.0
PORT=$PORT
DB_PATH=$DATA_DIR/doudian.db
JWT_SECRET=$jwt_secret
SECRET_PATH=$SECRET_PATH
LOGIN_USERNAME=admin
LOGIN_PASSWORD=$ADMIN_PASSWORD
LOG_LEVEL=info
EOF

    chmod 600 "$CONFIG_FILE"
    print_ok "配置文件: $CONFIG_FILE"
}

# ==============================================================================
# 创建 Systemd 服务
# ==============================================================================

create_service() {
    print_step "创建 Systemd 服务"

    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=DouDian - 抖店代发供应商管理系统
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
EnvironmentFile=$CONFIG_FILE
ExecStart=$APP_DIR/doudian
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/access.log
StandardError=append:$LOG_DIR/error.log

# 安全限制
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$APP_DIR $DATA_DIR $LOG_DIR
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable doudian

    print_ok "Systemd 服务已创建并设置开机自启"
}

# ==============================================================================
# 配置防火墙
# ==============================================================================

config_firewall() {
    print_step "配置防火墙"

    if command -v ufw &>/dev/null; then
        ufw allow $PORT/tcp 2>/dev/null
        print_ok "ufw 已放行端口 $PORT"
    elif command -v firewall-cmd &>/dev/null; then
        firewall-cmd --permanent --add-port=$PORT/tcp 2>/dev/null
        firewall-cmd --reload 2>/dev/null
        print_ok "firewalld 已放行端口 $PORT"
    elif command -v iptables &>/dev/null; then
        iptables -I INPUT -p tcp --dport $PORT -j ACCEPT 2>/dev/null
        print_ok "iptables 已放行端口 $PORT"
    else
        print_warn "未检测到防火墙工具，请手动放行端口 $PORT"
    fi
}

# ==============================================================================
# 启动服务
# ==============================================================================

start_service() {
    print_step "启动服务"

    systemctl start doudian
    sleep 3

    if systemctl is-active --quiet doudian; then
        print_ok "服务启动成功"
    else
        print_error "服务启动失败"
        echo ""
        echo -e "${YELLOW}最近日志:${PLAIN}"
        journalctl -u doudian --no-pager -n 20
        echo ""
        echo -e "${YELLOW}错误日志:${PLAIN}"
        tail -n 20 "$LOG_DIR/error.log" 2>/dev/null || echo "无错误日志"
        exit 1
    fi

    # 验证端口监听
    if ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
        print_ok "端口 $PORT 监听正常"
    else
        print_warn "端口 $PORT 未检测到监听，请检查日志"
    fi
}

# ==============================================================================
# 获取公网 IP
# ==============================================================================

get_public_ip() {
    PUBLIC_IP=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || echo "")
    if [[ -z "$PUBLIC_IP" ]]; then
        PUBLIC_IP=$(curl -s --max-time 5 https://ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    fi
}

# ==============================================================================
# 配置 Nginx（可选）
# ==============================================================================

setup_nginx() {
    if [[ "${NONINTERACTIVE:-0}" != "1" ]]; then
        echo ""
        if ! confirm "是否配置 Nginx 反向代理？"; then
            return
        fi
    else
        return
    fi

    print_step "配置 Nginx"

    if ! command -v nginx &>/dev/null; then
        print_info "安装 Nginx..."
        case "$OS" in
            debian|ubuntu)
                apt-get install -y -qq nginx
                ;;
            centos|rocky|rhel|fedora)
                yum install -y -q nginx || dnf install -y -q nginx
                ;;
        esac
        systemctl enable nginx
        systemctl start nginx
    fi

    read -p "请输入域名（留空使用 IP）: " domain
    domain=${domain:-"$PUBLIC_IP"}

    cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name $domain;

    client_max_body_size 16M;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /static/ {
        alias $APP_DIR/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    access_log /var/log/nginx/doudian_access.log;
    error_log /var/log/nginx/doudian_error.log;
}
EOF

    nginx -t && systemctl reload nginx
    print_ok "Nginx 配置完成: $NGINX_CONF"

    # 提示 SSL
    echo ""
    echo -e "${YELLOW}如需配置 HTTPS，请运行:${PLAIN}"
    echo -e "  certbot --nginx -d $domain"
}

# ==============================================================================
# 打印完成信息
# ==============================================================================

print_complete() {
    get_public_ip

    local base_url="http://$PUBLIC_IP:$PORT"
    if [[ -n "$SECRET_PATH" ]]; then
        base_url="$base_url/$SECRET_PATH"
    fi

    local nginx_url=""
    if [[ -f "$NGINX_CONF" ]]; then
        nginx_url="http://$domain"
    fi

    echo ""
    echo -e "${GREEN}${BOLD}========================================================${PLAIN}"
    echo -e "${GREEN}${BOLD}  DouDian 安装完成！${PLAIN}"
    echo -e "${GREEN}${BOLD}========================================================${PLAIN}"
    echo ""
    echo -e "  ${CYAN}访问地址:${PLAIN}  ${BOLD}$base_url/${PLAIN}"
    if [[ -n "$nginx_url" ]]; then
        echo -e "  ${CYAN}Nginx地址:${PLAIN} ${BOLD}$nginx_url${PLAIN}"
    fi
    echo -e "  ${CYAN}用户名:${PLAIN}    admin"
    echo -e "  ${CYAN}密码:${PLAIN}      $ADMIN_PASSWORD"
    echo ""
    echo -e "  ${CYAN}配置文件:${PLAIN}  $CONFIG_FILE"
    echo -e "  ${CYAN}应用目录:${PLAIN}  $APP_DIR"
    echo -e "  ${CYAN}数据目录:${PLAIN}  $DATA_DIR"
    echo -e "  ${CYAN}日志目录:${PLAIN}  $LOG_DIR"
    echo ""
    echo -e "  ${CYAN}管理命令:${PLAIN}"
    echo -e "    systemctl start doudian      # 启动"
    echo -e "    systemctl stop doudian       # 停止"
    echo -e "    systemctl restart doudian    # 重启"
    echo -e "    systemctl status doudian     # 状态"
    echo -e "    journalctl -u doudian -f     # 实时日志"
    echo ""
    echo -e "  ${CYAN}管理面板:${PLAIN}  bash $APP_DIR/manage.sh"
    echo ""
    echo -e "  ${CYAN}卸载命令:${PLAIN}  bash $APP_DIR/manage.sh  (选择 14)"
    echo ""
    echo -e "  ${YELLOW}提示: 请确保防火墙已开放 $PORT 端口${PLAIN}"
    echo ""
}

# ==============================================================================
# 主流程
# ==============================================================================

main() {
    echo ""
    echo -e "${GREEN}${BOLD}========================================================${PLAIN}"
    echo -e "${GREEN}${BOLD}  DouDian - 抖店代发供应商管理系统${PLAIN}"
    echo -e "${GREEN}${BOLD}  一键远程部署脚本${PLAIN}"
    echo -e "${GREEN}${BOLD}========================================================${PLAIN}"
    echo ""

    check_root
    detect_os
    install_deps
    get_user_input
    backup_old_data
    create_dirs
    download_binary
    install_files
    write_config
    create_service
    config_firewall
    start_service
    setup_nginx
    print_complete
}

main "$@"
