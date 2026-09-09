FROM python:3.12-slim
WORKDIR /app
COPY backend ./backend
COPY dist-local ./dist-local
ENV HOST=0.0.0.0 PORT=8000 RESOLVETECH_DATA=/app/data PYTHONUNBUFFERED=1
EXPOSE 8000
VOLUME ["/app/data"]
CMD ["python", "backend/server.py"]
