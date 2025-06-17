# Use an official Node.js runtime as a parent image. 'alpine' is a small, secure version.
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app/backend

# Copy package.json and package-lock.json first to leverage Docker's layer caching.
# If these files don't change, Docker won't re-run 'npm install'.
COPY package*.json ./
RUN npm install

# Copy the rest of your backend application's source code
COPY . .

# Your app runs on port 5001, so expose it
EXPOSE 5001

# The command to run your app
CMD [ "npm", "start" ]