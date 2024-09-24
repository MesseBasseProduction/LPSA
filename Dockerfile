FROM node:16
RUN mkdir /valentinedondon.fr
WORKDIR /valentinedondon.fr
COPY package.json .
RUN npm install --quiet
COPY . .
RUN npm run build
