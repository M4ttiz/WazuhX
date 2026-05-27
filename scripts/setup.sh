#!/usr/bin/env bash
# WazuhX Setup Script
# Usage: bash scripts/setup.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "  ██╗    ██╗ █████╗ ███████╗██╗   ██╗██╗  ██╗██╗  ██╗"
echo "  ██║    ██║██╔══██╗╚══███╔╝██║   ██║██║  ██║╚██╗██╔╝"
echo "  ██║ █╗ ██║███████║  ███╔╝ ██║   ██║███████║ ╚███╔╝ "
echo "  ██║███╗██║██╔══██║ ███╔╝  ██║   ██║██╔══██║ ██╔██╗ "
echo "  ╚███╔███╔╝██║  ██║███████╗╚██████╔╝██║  ██║██╔╝ ██╗"
echo "   ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝"
echo ""
echo -e "${GREEN}WazuhX Setup${NC}"
echo ""

# Check Docker
if ! command -v docker &>/dev/null; then
  echo -e "${RED}✗ Docker not found. Install Docker first: https://docs.docker.com/get-docker/${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

# Check Docker Compose
if ! docker compose version &>/dev/null; then
  echo -e "${RED}✗ Docker Compose v2 not found.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker Compose found${NC}"

# Check wazuh-net
if ! docker network inspect wazuh-net &>/dev/null; then
  echo -e "${YELLOW}⚠ Docker network 'wazuh-net' not found.${NC}"
  echo -e "  Creating it now (you can attach your Wazuh stack to it manually)..."
  docker network create wazuh-net
  echo -e "${GREEN}✓ Created wazuh-net${NC}"
else
  echo -e "${GREEN}✓ wazuh-net network exists${NC}"
fi

# .env setup
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}✓ Created .env from .env.example — please edit it before starting.${NC}"
  echo ""
  echo "  Required values to set in .env:"
  echo "    WAZUH_API_URL      → your Wazuh manager URL (default: https://wazuh-manager:55000)"
  echo "    WAZUH_USER         → Wazuh API user"
  echo "    WAZUH_PASSWORD     → Wazuh API password"
  echo "    WAZUH_INDEXER_URL  → Wazuh Indexer URL"
  echo "    GEMINI_API_KEY     → Google Gemini API key (https://aistudio.google.com/app/apikey)"
  echo ""
  echo -e "${YELLOW}  Edit .env then re-run: docker compose up --build -d${NC}"
else
  echo -e "${GREEN}✓ .env already exists${NC}"
  echo ""
  echo -e "${GREEN}Starting WazuhX...${NC}"
  docker compose up --build -d
  echo ""
  echo -e "${GREEN}✅ WazuhX is running at http://localhost:3000${NC}"
fi
