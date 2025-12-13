FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application
COPY server.js ./

EXPOSE 3001

USER node

# Run application
CMD ["node", "server.js"]
