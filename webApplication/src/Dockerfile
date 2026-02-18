FROM node:20.11.1

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN npm i yarn -g --force && yarn

COPY . .

EXPOSE 9898

CMD ["yarn", "start"]
