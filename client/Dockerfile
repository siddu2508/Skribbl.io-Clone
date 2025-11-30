# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the rest of the client code
COPY . .

# Expose the port Vite runs on (default 5173)
EXPOSE 5173

# Command to run the development server
# Note: For production, you'd build the app and serve it with Nginx, 
# but for development, 'npm run dev' is fine.
CMD ["npm", "run", "dev", "--", "--host"]