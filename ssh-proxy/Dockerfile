FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
EXPOSE 3002
ENV SSH_PROXY_PORT=3002
CMD ["node", "server.js"]
