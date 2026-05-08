FROM mcr.microsoft.com/playwright/python:v1.59.0-jammy

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN python3.11 -m pip install --no-cache-dir --upgrade pip && \
    python3.11 -m pip install --no-cache-dir -r requirements.txt

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN python3.11 -m pip install playwright==1.59.0 --force-reinstall
RUN python3.11 -m playwright install chromium --with-deps

COPY . .

EXPOSE 8000

CMD ["python3.11", "run.py"]