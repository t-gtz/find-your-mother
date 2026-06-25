FROM node:18-alpine

WORKDIR /app

# Dependencies (need dev dependencies for vite build)
COPY package*.json ./
RUN npm install

# Frontend build
COPY src ./src
COPY index.html ./
COPY vite.config.js ./
RUN npm run build  

# Backend
COPY server ./server

# Data volume
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "server/index.js"]
