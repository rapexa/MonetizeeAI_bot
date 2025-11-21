#!/bin/bash

# رنگ‌های ترمینال
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear

echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}              🚀 MonetizeAI Landing Page Viewer${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}📋 فایل‌های موجود:${NC}"
echo -e "  ${GREEN}1.${NC} landing-pro.html    ${BLUE}(طراحی جدید - حرفه‌ای)${NC}"
echo -e "  ${GREEN}2.${NC} landing-sale.html   ${BLUE}(طراحی اولیه)${NC}"
echo ""

echo -e "${YELLOW}کدام فایل را می‌خواهید مشاهده کنید؟${NC}"
echo -e "${CYAN}لطفاً شماره را وارد کنید (1 یا 2):${NC} "
read -r choice

case $choice in
    1)
        FILE="landing-pro.html"
        echo -e "${GREEN}✓ فایل landing-pro.html انتخاب شد${NC}"
        ;;
    2)
        FILE="landing-sale.html"
        echo -e "${GREEN}✓ فایل landing-sale.html انتخاب شد${NC}"
        ;;
    *)
        echo -e "${RED}❌ انتخاب نامعتبر. فایل پیش‌فرض: landing-pro.html${NC}"
        FILE="landing-pro.html"
        ;;
esac

echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🌐 در حال راه‌اندازی سرور...${NC}"
echo ""
echo -e "${CYAN}لندینگ پیج در آدرس‌های زیر در دسترس است:${NC}"
echo ""
echo -e "  ${YELLOW}➜${NC} http://localhost:8000/${FILE}"
echo -e "  ${YELLOW}➜${NC} http://127.0.0.1:8000/${FILE}"
echo ""
echo -e "${GREEN}👆 روی یکی از لینک‌ها Cmd+Click کنید تا در مرورگر باز شود${NC}"
echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}برای متوقف کردن سرور: ${RED}Ctrl+C${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# شروع سرور
python3 -m http.server 8000
