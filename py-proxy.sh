#!/bin/sh
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
MAGENTA="\033[1;35m"
CYAN="\033[1;36m"
RED="\033[1;31m"
BLUE="\033[0;34m"
NC="\033[0m"
BIN_PATH_PH="/usr/bin/tg-ws-proxy"
INIT_PATH_PH="/etc/init.d/tg-ws-proxy"
TG_URL="https://github.com/Flowseal/tg-ws-proxy/archive/refs/heads/master.zip"
RAW_INIT_URL="https://raw.githubusercontent.com/Flowseal/tg-ws-proxy/master/proxy/__init__.py"
PROXY_DIR="/root/tg-ws-proxy"
INIT_FILE="$PROXY_DIR/proxy/__init__.py"
REQUIRED_PKGS="python3-light python3-pip python3-cryptography"
PAUSE() { echo -ne "\nНажмите Enter..."; read dummy; }

# Определение IP для OpenWrt с фоллбэками
get_lan_ip() {
    local ip
    ip=$(uci get network.lan.ipaddr 2>/dev/null | cut -d/ -f1)
    [ -n "$ip" ] && [ "$ip" != "0.0.0.0" ] && { echo "$ip"; return 0; }
    for iface in lan br-lan eth0; do
        ip=$(uci get network.$iface.ipaddr 2>/dev/null | cut -d/ -f1)
        [ -n "$ip" ] && [ "$ip" != "0.0.0.0" ] && { echo "$ip"; return 0; }
    done
    ip=$(ip addr show 2>/dev/null | grep -E 'inet (192\.168|10\.|172\.(1[6-9]|2[0-9]|3[01]))' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d/ -f1)
    [ -n "$ip" ] && { echo "$ip"; return 0; }
    echo "192.168.1.1"
}
LAN_IP="$(get_lan_ip)"

# Менеджер пакетов
if command -v opkg >/dev/null 2>&1; then
    PKG="opkg"; UPDATE="opkg update"; INSTALL="opkg install"
    CHECK_AVAIL="opkg list | cut -d ' ' -f1"
    DELETE="opkg remove --autoremove --force-removal-of-dependent-packages"
    CHECK_CMD="opkg list-installed"
else
    PKG="apk"; UPDATE="apk update"; INSTALL="apk add"
    CHECK_AVAIL="apk search -e"; DELETE="apk del"; CHECK_CMD="apk info"
fi

# Универсальная функция запроса (curl с фоллбэком на wget)
fetch_url() {
    if command -v curl >/dev/null 2>&1; then
        curl -sLk --connect-timeout 10 "$1" 2>/dev/null
    elif command -v wget >/dev/null 2>&1; then
        wget -qO- --no-check-certificate --timeout=10 "$1" 2>/dev/null
    fi
}

# Получение последней версии из raw-файла __init__.py
get_latest_version() {
    local version
    version="$(fetch_url "$RAW_INIT_URL" | grep '^__version__' | head -1 | cut -d"'" -f2 | cut -d'"' -f2)"
    [ -n "$version" ] && echo "$version" && return 0
    return 1
}

# Получение установленной версии
get_installed_version() {
    [ -f "$INIT_FILE" ] || return 1
    grep '^__version__' "$INIT_FILE" 2>/dev/null | head -1 | cut -d"'" -f2 | cut -d'"' -f2
}

# Сравнение версий: 0 = есть обновление, 1 = нет
check_update() {
    local latest installed
    latest="$(get_latest_version)"
    installed="$(get_installed_version)"
    [ -z "$latest" ] || [ -z "$installed" ] && return 1
    [ "$installed" = "$latest" ] && return 1
    return 0
}

install_TG_PH() {
    [ -z "$SECRET" ] && SECRET="$(head -c16 /dev/urandom | hexdump -e '16/1 "%02x"')"
    if [ "$(df -m /root 2>/dev/null | awk 'NR==2 {print $4+0}')" -lt 25 ]; then
        echo -e "\n${RED}Недостаточно свободного места!${NC}"; PAUSE; return 1
    fi
    echo -e "\n${MAGENTA}Обновляем пакеты${NC}"
    $UPDATE >/dev/null 2>&1 || { echo -e "\n${RED}Ошибка обновления пакетов!${NC}"; PAUSE; return 1; }

    echo -e "\n${MAGENTA}Проверяем доступность пакетов Python${NC}"
    failed=0
    for pkg in $REQUIRED_PKGS; do
        if sh -c "$CHECK_AVAIL" | grep -qw "$pkg"; then echo -e "${GREEN}[OK]   ${NC}$pkg"
        else echo -e "${RED}[FAIL] ${NC}$pkg"; failed=1; fi
    done
    if [ $failed -ne 0 ]; then
        echo -e "\n${RED}Архитектура не поддерживается! Установка невозможна!${NC}"; PAUSE; return 1
    fi

    echo -e "\n${MAGENTA}Устанавливаем необходимые пакеты${NC}"
    $INSTALL python3-light python3-pip python3-cryptography unzip >/dev/null 2>&1

    echo -e "\n${MAGENTA}Скачиваем и распаковываем TG WS Proxy Python${NC}"
    rm -rf "$PROXY_DIR"
    cd /root
    wget -q -O tg-ws-proxy.zip "$TG_URL" || { echo -e "\n${RED}Ошибка скачивания!${NC}"; PAUSE; return 1; }
    unzip -q tg-ws-proxy.zip || { echo -e "\n${RED}Ошибка распаковки!${NC}"; PAUSE; return 1; }
    mv tg-ws-proxy-main tg-ws-proxy
    rm -f tg-ws-proxy.zip
    cd "$PROXY_DIR"

    echo -e "\n${MAGENTA}Устанавливаем TG WS Proxy Python${NC}"
    pip install --root-user-action=ignore --no-deps --disable-pip-version-check --timeout 2 --retries 1 -e . >/dev/null 2>&1

    cat << EOF > /etc/init.d/tg-ws-proxy
#!/bin/sh /etc/rc.common
START=99
USE_PROCD=1
start_service() {
    procd_open_instance
    procd_set_param command /usr/bin/tg-ws-proxy --host 0.0.0.0 --secret $SECRET
    procd_set_param respawn
    procd_close_instance
}
EOF
    chmod +x /etc/init.d/tg-ws-proxy
    /etc/init.d/tg-ws-proxy enable >/dev/null 2>&1
    /etc/init.d/tg-ws-proxy start >/dev/null 2>&1

    if pgrep -f tg-ws-proxy >/dev/null 2>&1; then
        echo -e "\n${GREEN}Сервис TG WS Proxy Python запущен!${NC}"
    else
        echo -e "\n${RED}Ошибка установки!${NC}"
    fi
    PAUSE
}

delete_TG_PH() {
    echo -e "\n${MAGENTA}Удаляем TG WS Proxy Python${NC}"
    /etc/init.d/tg-ws-proxy stop >/dev/null 2>&1
    /etc/init.d/tg-ws-proxy disable >/dev/null 2>&1
    echo -e "${CYAN}Удаляем пакеты и зависимости${NC}"
    pip uninstall -y tg-ws-proxy >/dev/null 2>&1
    attempts=0
    while [ $attempts -lt 10 ]; do
        $DELETE python3-light python3-pip python3-cryptography unzip >/dev/null 2>&1
        $CHECK_CMD 2>/dev/null | grep -qE "python3-light|python3-pip|python3-cryptography" || break
        attempts=$((attempts + 1))
    done
    [ $attempts -eq 10 ] && echo -e "\n${RED}Некоторые пакеты не удалились!${NC}"
    rm -rf "$PROXY_DIR" "$BIN_PATH_PH" "$INIT_PATH_PH" /root/.cache/pip /root/.local/lib/python* 2>/dev/null
    echo -e "\n${GREEN}Удаление завершено!${NC}"
    PAUSE
}

update_TG_PH() {
    echo -e "\n${MAGENTA}Обновление TG WS Proxy Python${NC}"
    LATEST_VER="$(get_latest_version)"
    INSTALLED_VER="$(get_installed_version)"
    [ -z "$LATEST_VER" ] && { echo -e "${YELLOW}⚠ Не удалось проверить обновления (сеть/файл недоступен)${NC}\n${CYAN}Продолжить переустановку текущей версии?${NC}"; echo -en "${GREEN}[y/N]: ${NC}"; read confirm; [ "$confirm" != "y" ] && [ "$confirm" != "Y" ] && { PAUSE; return 1; }; }
    [ -z "$INSTALLED_VER" ] && { echo -e "${RED}Не удалось определить установленную версию${NC}"; PAUSE; return 1; }
    if [ -n "$LATEST_VER" ] && [ "$INSTALLED_VER" = "$LATEST_VER" ]; then
        echo -e "${GREEN}Уже установлена последняя версия: ${NC}$INSTALLED_VER"; PAUSE; return 0
    fi
    [ -n "$LATEST_VER" ] && echo -e "${CYAN}Обновление: ${NC}$INSTALLED_VER ${YELLOW}→${NC} $LATEST_VER"
    
    # Сохраняем SECRET перед удалением
    OLD_SECRET="$(sed -n 's/.*--secret[[:space:]]*\([0-9a-fA-F]\{32\}\).*/\1/p' "$INIT_PATH_PH" 2>/dev/null)"
    if [ -z "$OLD_SECRET" ]; then
        echo -e "\n${RED}Не удалось прочитать текущий секрет! Обновление прервано.${NC}"
        PAUSE; return 1
    fi
    echo -e "${CYAN}Секрет сохранён — ссылка для подключения не изменится${NC}"

    /etc/init.d/tg-ws-proxy stop >/dev/null 2>&1
    /etc/init.d/tg-ws-proxy disable >/dev/null 2>&1
    rm -rf "$PROXY_DIR" "$BIN_PATH_PH" "$INIT_PATH_PH" /root/.cache/pip 2>/dev/null
    pip uninstall -y tg-ws-proxy >/dev/null 2>&1
    
    SECRET="$OLD_SECRET"
    install_TG_PH
    PAUSE
}

menu() {
    SECRET="$(head -c16 /dev/urandom | hexdump -e '16/1 "%02x"')"
    clear
    echo -e "╔═════════════════════╗"
    echo -e "║ ${BLUE}TG WS Proxy Manager${NC} ║"
    echo -e "╚═════════════════════╝\n"

    IS_INSTALLED=0
    [ -f "$BIN_PATH_PH" ] && [ -f "$INIT_PATH_PH" ] && IS_INSTALLED=1

    if [ $IS_INSTALLED -eq 1 ]; then
        INST_VER="$(get_installed_version)"
        if pgrep -f tg-ws-proxy >/dev/null 2>&1; then
            echo -e "${YELLOW}TG WS Proxy Python: ${GREEN}запущен${NC} ${CYAN}(v${INST_VER:-?})${NC}"
        else
            echo -e "${YELLOW}TG WS Proxy Python: ${RED}не запущен${NC} ${CYAN}(v${INST_VER:-?})${NC}"
        fi
        if check_update; then
            LATEST_VER="$(get_latest_version)"
            echo -e "${YELLOW}⚠ Доступно обновление:${NC} ${CYAN}v${INST_VER:-?} → v${LATEST_VER}${NC}"
        fi
    else
        echo -e "${YELLOW}TG WS Proxy Python: ${RED}не установлен${NC}"
    fi

    if [ $IS_INSTALLED -eq 1 ] && pgrep -f tg-ws-proxy >/dev/null 2>&1; then
        SECRET_IN_PH="$(sed -n 's/.*--secret[[:space:]]*\([0-9a-fA-F]\{32\}\).*/\1/p' "$INIT_PATH_PH")"
        echo -e "\n${YELLOW}Настройки ${CYAN}Python${YELLOW} версии в TG:${NC}"
        echo -e " ${YELLOW}Тип прокси:${NC} MTProto"
        echo -e " ${YELLOW}Хост:${NC} ${CYAN}$LAN_IP${NC}"
        echo -e " ${YELLOW}Порт:${NC} 1443"
        echo -e " ${YELLOW}Ключ:${NC} dd$SECRET_IN_PH"
        echo -e "${YELLOW}Ссылка для подключения:${NC}\ntg://proxy?server=$LAN_IP&port=1443&secret=dd$SECRET_IN_PH"
    fi

    echo -e "\n${CYAN}1)${GREEN} $( [ $IS_INSTALLED -eq 1 ] && echo "Удалить ${NC}TG WS Proxy Python" || echo "Установить ${NC}TG WS Proxy Python" )"
    if [ $IS_INSTALLED -eq 1 ]; then
        if check_update; then
            echo -e "${CYAN}2)${GREEN} ${RED}★ Обновить ${NC}TG WS Proxy Python ${RED}(доступно)${NC}"
        else
            echo -e "${CYAN}2)${GREEN} Обновить ${NC}TG WS Proxy Python"
        fi
    fi
    echo -e "${CYAN}Enter) ${GREEN}Выход${NC}\n"
    echo -en "${YELLOW}Выберите пункт: ${NC}"
    read choice
    case "$choice" in
        1) if [ $IS_INSTALLED -eq 1 ]; then delete_TG_PH; else install_TG_PH; fi;;
        2) if [ $IS_INSTALLED -eq 1 ]; then update_TG_PH; else echo -e "\n${RED}Сначала установите прокси!${NC}"; PAUSE; fi;;
        *) echo; exit 0 ;;
    esac
}
while true; do menu; done