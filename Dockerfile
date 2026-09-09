FROM node:22-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG GROQ_API_KEY
ENV GROQ_API_KEY=${GROQ_API_KEY}
RUN npm run build:local

FROM python:3.12-slim
WORKDIR /app
COPY backend ./backend
COPY --from=frontend /app/dist-local ./dist-local
ENV HOST=0.0.0.0 PORT=8000 RESOLVETECH_DATA=/app/data PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["python", "backend/server.py"]
