
FROM node:22.12.0

ENV NODE_ENV=production

# Set the working directory
WORKDIR /uibchain

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

EXPOSE 3001
EXPOSE 6001

ENTRYPOINT ["sh", "-c", "cd /uibchain && npm install && PEER=$PEER npm start"]