FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY index.js ./
COPY app.js ./
COPY ecosystem.config.cjs ./

EXPOSE 6065

CMD ["node", "index.js"]
