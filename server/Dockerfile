FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build TypeScript to JavaScript
RUN npm run build

EXPOSE 3001

# Start the compiled JavaScript
CMD ["npm", "start"]