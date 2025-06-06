# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Define build arguments
ARG VITE_API_URL
ARG VITE_ALLOWED_HOSTS

# Set environment variables for build time
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ALLOWED_HOSTS=$VITE_ALLOWED_HOSTS

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Build the project
RUN npm run build

# Expose port 4173 (Vite's preview port)
EXPOSE 4173

# Start the application in preview mode
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"] 