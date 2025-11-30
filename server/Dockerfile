# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# Install backend dependencies
RUN npm install

# Copy the rest of the server code
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Command to run the app
CMD ["npm", "start"]