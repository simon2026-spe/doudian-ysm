#!/bin/bash

# DouDian - 抖店代发供应商管理系统 - 管理面板

APP_NAME="doudian"
APP_DIR="/opt/doudian"
LOG_DIR="/var/log/doudian"
DATA_DIR="/opt/doudian/data"
CONFIG_FILE="/etc/default/doudian"
SERVICE_FILE="/etc/systemd/system/doudian.service"
GITHUB_USER="simon2026-spe"
GITHUB_REPO="doudian-ysm"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PLAIN='\033[0m'

check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}请使用 root 用户运行${PLAIN}"
        exit 1
    fi
}

show_menu() {
    echo ""
    echo -e "${GREEN}========================================${PLAIN}"
    echo -e "${GREEN}  DouDian 管理面板${PLAIN}"
    echo -e "${GREEN}========================================${PLAIN}"
    echo ""
    echo -e "  ${CYAN}0.${PLAIN} 退出脚本"
    echo -e "  ${CYAN}1.${PLAIN} 启动服务"
    echo -e "  ${CYAN}2.${PLAIN} 停止服务"
    echo -e "  ${CYAN}3.${PLAIN} 重启服务"
    echo -e "  ${CYAN}4.${PLAIN} 查看状态"
    echo -e "  ${CYAN}5.${PLAIN} 查看日志"
    echo -e "  ${CYAN}6.${PLAIN} 数据库备份"
    echo -e "  ${CYAN}7.${PLAIN} 数据库恢复"
    echo -e "  ${CYAN}8.${PLAIN} 更新应用（从 GitHub 自动下载）"
    echo -e "  ${CYAN}9.${PLAIN} 查看配置"
    echo -e "  ${CYAN}10.${PLAIN} 编辑配置"
    echo -e "  ${CYAN}11.${PLAIN} 重新生成密钥"
    echo -e "  ${CYAN}12.${PLAIN} 配置 Nginx 反向代理"
    echo -e "  ${CYAN}13.${PLAIN} 查看版本"
    echo -e "  ${CYAN}14.${PLAIN} 卸载系统"
    echo ""
    read -p "请选择 [0-14]: " choice
}

start_service() {
    echo -e "${BLUE}启动服务...${PLAIN}"
    systemctl start doudian
    sleep 1
    if systemctl is-active --quiet doudian; then
        echo -e "${GREEN}服务启动成功${PLAIN}"
    else
        echo -e "${RED}服务启动失败${PLAIN}"
    fi
    pause
}

stop_service() {
    echo -e "${BLUE}停止服务...${PLAIN}"
    systemctl stop doudian
    echo -e "${GREEN}服务已停止${PLAIN}"
    pause
}

restart_service() {
    echo -e "${BLUE}重启服务...${PLAIN}"
    systemctl restart doudian
    sleep 1
    if systemctl is-active --quiet doudian; then
        echo -e "${GREEN}服务重启成功${PLAIN}"
    else
        echo -e "${RED}服务重启失败${PLAIN}"
    fi
    pause
}

show_status() {
    echo -e "${BLUE}=== 服务状态 ===${PLAIN}"
    systemctl status doudian --no-pager -n 10
    echo ""
    echo -e "${BLUE}=== 端口监听 ===${PLAIN}"
    ss -tlnp | grep doudian || echo "无监听端口"
    pause
}

show_logs() {
    echo ""
    echo "1. 实时日志 (最近 50 行)"
    echo "2. 访问日志"
    echo "3. 错误日志"
    echo "0. 返回"
    read -p "请选择 [0-3]: " log_choice
    
    case "$log_choice" in
        1) journalctl -u doudian -f -n 50 ;;
        2) 
            if [ -f "$LOG_DIR/access.log" ]; then
                tail -n 100 "$LOG_DIR/access.log"
            else
                echo "暂无访问日志"
            fi
            pause
            ;;
        3)
            if [ -f "$LOG_DIR/error.log" ]; then
                tail -n 100 "$LOG_DIR/error.log"
            else
                echo "暂无错误日志"
            fi
            pause
            ;;
        0) ;;
        *) echo -e "${RED}无效选项${PLAIN}"; pause ;;
    esac
}

backup_db() {
    BACKUP_DIR="$DATA_DIR/backups"
    BACKUP_FILE="$BACKUP_DIR/doudian_$(date +%Y%m%d_%H%M%S).db"
    mkdir -p "$BACKUP_DIR"
    
    echo -e "${BLUE}备份数据库...${PLAIN}"
    if [ -f "$DATA_DIR/doudian.db" ]; then
        cp "$DATA_DIR/doudian.db" "$BACKUP_FILE"
        echo -e "${GREEN}备份完成: $BACKUP_FILE${PLAIN}"
    else
        echo -e "${RED}数据库文件不存在${PLAIN}"
    fi
    
    echo ""
    echo -e "${BLUE}现有备份:${PLAIN}"
    ls -lh "$BACKUP_DIR"/*.db 2>/dev/null | tail -5 || echo "暂无备份"
    pause
}

restore_db() {
    BACKUP_DIR="$DATA_DIR/backups"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${RED}备份目录不存在${PLAIN}"
        pause
        return
    fi
    
    echo -e "${BLUE}可用备份文件:${PLAIN}"
    ls -1t "$BACKUP_DIR"/*.db 2>/dev/null | head -10 || echo "暂无备份"
    
    echo ""
    read -p "请输入要恢复的备份文件路径: " backup_file
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}文件不存在${PLAIN}"
        pause
        return
    fi
    
    read -p "确定要恢复吗？这将覆盖当前数据库！[y/N]: " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "已取消"
        pause
        return
    fi
    
    echo -e "${BLUE}停止服务...${PLAIN}"
    systemctl stop doudian
    
    echo -e "${BLUE}恢复数据库...${PLAIN}"
    cp "$backup_file" "$DATA_DIR/doudian.db"
    
    echo -e "${BLUE}启动服务...${PLAIN}"
    systemctl start doudian
    
    echo -e "${GREEN}数据库恢复完成${PLAIN}"
    pause
}

update_app() {
    echo -e "${BLUE}=== 更新应用 ===${PLAIN}"
    echo ""

    # 检测架构
    local arch
    arch=$(uname -m)
    case "$arch" in
        x86_64|amd64) arch="amd64" ;;
        aarch64|arm64) arch="arm64" ;;
            *) echo -e "${RED}不支持的架构: $arch${PLAIN}"; pause; return ;;
    esac
    echo -e "${CYAN}系统架构: $arch${PLAIN}"

    # 检查 GitHub Releases 是否有新版本
    local release_url="https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/latest"
    local release_info
    release_info=$(curl -sL --max-time 15 "$release_url" 2>/dev/null || echo "")

    if [[ -z "$release_info" ]] || ! echo "$release_info" | grep -q "tag_name"; then
        echo -e "${RED}无法获取最新版本信息，请检查网络连接${PLAIN}"
        echo -e "${YELLOW}也可以手动上传二进制文件到 $APP_DIR/ 后重启服务${PLAIN}"
        pause
        return
    fi

    # 提取版本号
    local latest_tag
    latest_tag=$(echo "$release_info" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"//;s/".*//')
    echo -e "${CYAN}最新版本: $latest_tag${PLAIN}"

    # 提取发布时间
    local published_at
    published_at=$(echo "$release_info" | grep '"published_at"' | head -1 | sed 's/.*"published_at": *"//;s/".*//')
    echo -e "${CYAN}发布时间: $published_at${PLAIN}"

    # 查找对应架构的下载链接
    local download_url
    download_url=$(echo "$release_info" | grep "browser_download_url" | grep "linux-${arch}" | head -1 | sed 's/.*"browser_download_url": *"//;s/".*//')

    if [[ -z "$download_url" ]]; then
        echo -e "${RED}未找到 linux-${arch} 的预编译文件${PLAIN}"
        echo -e "${YELLOW}请确认 GitHub Actions 构建已完成并发布了 Release${PLAIN}"
        pause
        return
    fi

    echo ""
    echo -e "${CYAN}下载地址: $download_url${PLAIN}"
    echo ""
    read -p "确认下载并更新？[Y/n]: " confirm
    confirm=${confirm:-Y}
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "已取消"
        pause
        return
    fi

    # 备份数据库
    local backup_time=$(date +%Y%m%d_%H%M%S)
    local backup_dir="$DATA_DIR/backups"
    mkdir -p "$backup_dir"

    if [[ -f "$DATA_DIR/doudian.db" ]]; then
        echo -e "${BLUE}备份数据库...${PLAIN}"
        cp "$DATA_DIR/doudian.db" "$backup_dir/pre-update_${backup_time}.db"
        echo -e "${GREEN}数据库已备份到 $backup_dir/pre-update_${backup_time}.db${PLAIN}"
    fi

    # 停止服务
    echo -e "${BLUE}停止服务...${PLAIN}"
    systemctl stop doudian 2>/dev/null || true

    # 备份旧二进制
    if [[ -f "$APP_DIR/doudian" ]]; then
        cp "$APP_DIR/doudian" "$APP_DIR/doudian.bak.${backup_time}"
        echo -e "${CYAN}旧版本已备份: $APP_DIR/doudian.bak.${backup_time}${PLAIN}"
    fi

    # 下载新版本
    local tmp_dir
    tmp_dir=$(mktemp -d)
    echo -e "${BLUE}下载新版本...${PLAIN}"

    if ! curl -sL --max-time 120 -o "$tmp_dir/doudian.tar.gz" "$download_url"; then
        echo -e "${RED}下载失败${PLAIN}"
        echo -e "${YELLOW}正在回滚...${PLAIN}"
        if [[ -f "$APP_DIR/doudian.bak.${backup_time}" ]]; then
            cp "$APP_DIR/doudian.bak.${backup_time}" "$APP_DIR/doudian"
        fi
        systemctl start doudian 2>/dev/null
        rm -rf "$tmp_dir"
        pause
        return
    fi

    # 解压
    tar -xzf "$tmp_dir/doudian.tar.gz" -C "$tmp_dir/" 2>/dev/null || true

    # 安装新二进制
    local installed=0
    if [[ -f "$tmp_dir/doudian-linux-${arch}" ]]; then
        cp "$tmp_dir/doudian-linux-${arch}" "$APP_DIR/doudian"
        installed=1
    elif [[ -f "$tmp_dir/doudian" ]]; then
        cp "$tmp_dir/doudian" "$APP_DIR/doudian"
        installed=1
    fi

    if [[ "$installed" -eq 0 ]]; then
        echo -e "${RED}解压后未找到二进制文件${PLAIN}"
        echo -e "${YELLOW}正在回滚...${PLAIN}"
        if [[ -f "$APP_DIR/doudian.bak.${backup_time}" ]]; then
            cp "$APP_DIR/doudian.bak.${backup_time}" "$APP_DIR/doudian"
        fi
        systemctl start doudian 2>/dev/null
        rm -rf "$tmp_dir"
        pause
        return
    fi

    chmod +x "$APP_DIR/doudian"
    echo -e "${GREEN}新二进制文件已安装${PLAIN}"

    # 更新静态资源（如果存在）
    if [[ -d "$tmp_dir/static" ]]; then
        rm -rf "$APP_DIR/static"
        cp -r "$tmp_dir/static" "$APP_DIR/static"
        echo -e "${GREEN}静态资源已更新${PLAIN}"
    fi

    # 更新管理脚本自身
    if [[ -f "$tmp_dir/manage.sh" ]]; then
        cp "$tmp_dir/manage.sh" "$APP_DIR/manage.sh"
        chmod +x "$APP_DIR/manage.sh"
        echo -e "${GREEN}管理脚本已更新${PLAIN}"
    fi

    rm -rf "$tmp_dir"

    # 启动服务
    echo -e "${BLUE}启动服务...${PLAIN}"
    systemctl start doudian
    sleep 2

    if systemctl is-active --quiet doudian; then
        echo -e "${GREEN}========================================${PLAIN}"
        echo -e "${GREEN}  更新完成！${PLAIN}"
        echo -e "${GREEN}========================================${PLAIN}"
        echo -e "  ${CYAN}版本: $latest_tag${PLAIN}"
        echo -e "  ${CYAN}数据库备份: $backup_dir/pre-update_${backup_time}.db${PLAIN}"
        echo -e "  ${CYAN}旧版本备份: $APP_DIR/doudian.bak.${backup_time}${PLAIN}"
    else
        echo -e "${RED}服务启动失败！正在回滚...${PLAIN}"
        if [[ -f "$APP_DIR/doudian.bak.${backup_time}" ]]; then
            cp "$APP_DIR/doudian.bak.${backup_time}" "$APP_DIR/doudian"
            chmod +x "$APP_DIR/doudian"
            systemctl start doudian
            sleep 2
            if systemctl is-active --quiet doudian; then
                echo -e "${YELLOW}已回滚到旧版本${PLAIN}"
            else
                echo -e "${RED}回滚也失败，请检查日志: journalctl -u doudian -n 20${PLAIN}"
            fi
        else
            echo -e "${RED}无旧版本可回滚，请检查日志: journalctl -u doudian -n 20${PLAIN}"
        fi
    fi

    echo ""
    pause
}

show_config() {
    if [ -f "$CONFIG_FILE" ]; then
        echo -e "${BLUE}=== 配置文件 ===${PLAIN}"
        cat "$CONFIG_FILE"
    else
        echo -e "${RED}配置文件不存在${PLAIN}"
    fi
    pause
}

edit_config() {
    if command -v nano &> /dev/null; then
        nano "$CONFIG_FILE"
    elif command -v vi &> /dev/null; then
        vi "$CONFIG_FILE"
    else
        echo -e "${RED}未找到编辑器 (nano/vi)${PLAIN}"
        pause
        return
    fi
    
    read -p "配置已修改，是否重启服务？[Y/n]: " confirm
    confirm=${confirm:-Y}
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        systemctl restart doudian
        echo -e "${GREEN}服务已重启${PLAIN}"
    fi
}

regen_secret() {
    NEW_SECRET=$(openssl rand -hex 32)
    
    if [ -f "$CONFIG_FILE" ]; then
        sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" "$CONFIG_FILE"
        echo -e "${GREEN}JWT 密钥已重新生成${PLAIN}"
        echo -e "${YELLOW}注意：所有用户将被强制下线${PLAIN}"
        read -p "是否重启服务？[Y/n]: " confirm
        confirm=${confirm:-Y}
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            systemctl restart doudian
            echo -e "${GREEN}服务已重启${PLAIN}"
        fi
    else
        echo -e "${RED}配置文件不存在${PLAIN}"
    fi
    pause
}

setup_nginx() {
    echo -e "${BLUE}=== Nginx 反向代理配置 ===${PLAIN}"
    echo ""
    
    read -p "请输入域名 (例如: doudian.example.com): " domain
    if [ -z "$domain" ]; then
        echo -e "${RED}域名不能为空${PLAIN}"
        pause
        return
    fi
    
    PORT=$(grep "^PORT=" "$CONFIG_FILE" 2>/dev/null | cut -d= -f2)
    PORT=${PORT:-2095}
    
    NGINX_CONF="/etc/nginx/conf.d/doudian.conf"
    if [ ! -d "/etc/nginx/conf.d" ]; then
        NGINX_CONF="/etc/nginx/sites-available/doudian"
    fi
    
    cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name $domain;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    echo -e "${GREEN}Nginx 配置已生成: $NGINX_CONF${PLAIN}"
    
    if command -v nginx &> /dev/null; then
        nginx -t && systemctl reload nginx
        echo -e "${GREEN}Nginx 已重载${PLAIN}"
    else
        echo -e "${YELLOW}未检测到 Nginx，请手动安装和配置${PLAIN}"
    fi
    
    pause
}

show_version() {
    if [ -f "$APP_DIR/doudian" ]; then
        echo -e "${BLUE}=== 版本信息 ===${PLAIN}"
        echo "二进制: $APP_DIR/doudian"
        echo "大小: $(ls -lh $APP_DIR/doudian | awk '{print $5}')"
        echo "修改时间: $(ls -lh $APP_DIR/doudian | awk '{print $6, $7, $8}')"
    else
        echo -e "${RED}未找到二进制文件${PLAIN}"
    fi
    pause
}

uninstall_app() {
    echo -e "${RED}=== 卸载系统 ===${PLAIN}"
    echo -e "${RED}此操作将删除所有数据和配置！${PLAIN}"
    echo ""
    read -p "请输入 YES 确认卸载: " confirm
    
    if [ "$confirm" != "YES" ]; then
        echo "已取消"
        pause
        return
    fi
    
    echo -e "${BLUE}停止服务...${PLAIN}"
    systemctl stop doudian 2>/dev/null
    systemctl disable doudian 2>/dev/null
    
    echo -e "${BLUE}删除服务文件...${PLAIN}"
    rm -f "$SERVICE_FILE"
    systemctl daemon-reload
    
    echo -e "${BLUE}删除应用目录...${PLAIN}"
    rm -rf "$APP_DIR"
    
    echo -e "${BLUE}删除日志目录...${PLAIN}"
    rm -rf "$LOG_DIR"
    
    echo -e "${BLUE}删除配置文件...${PLAIN}"
    rm -f "$CONFIG_FILE"
    
    echo -e "${GREEN}卸载完成${PLAIN}"
    echo -e "${YELLOW}数据目录 $DATA_DIR 未删除，如需彻底清除请手动删除${PLAIN}"
    exit 0
}

pause() {
    echo ""
    read -p "按回车返回菜单..." enter
}

main() {
    check_root
    
    while true; do
        show_menu
        case "$choice" in
            0) echo "再见！"; exit 0 ;;
            1) start_service ;;
            2) stop_service ;;
            3) restart_service ;;
            4) show_status ;;
            5) show_logs ;;
            6) backup_db ;;
            7) restore_db ;;
            8) update_app ;;
            9) show_config ;;
            10) edit_config ;;
            11) regen_secret ;;
            12) setup_nginx ;;
            13) show_version ;;
            14) uninstall_app ;;
            *) echo -e "${RED}无效选项${PLAIN}"; pause ;;
        esac
    done
}

main "$@"
