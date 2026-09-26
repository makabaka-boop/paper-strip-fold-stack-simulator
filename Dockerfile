# 构建阶段：无后端，纯静态前端
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
# 无 lockfile 时直接安装（package.json 已锁定主版本范围）
RUN npm install
COPY . .
RUN npm run build

# 运行阶段：Nginx 托管 /fold/
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/fold
EXPOSE 8080
