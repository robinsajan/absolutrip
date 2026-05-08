FROM python:3.11-slim-bullseye

WORKDIR /app

# Install ALL chromium system dependencies explicitly
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    postgresql-client \
    libpq-dev \
    gcc \
    libglib2.0-0 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libx11-6 \
    libxext6 \
    libxfixes3 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Tell Playwright to use the system's chromium instead of downloading its own
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

RUN playwright install chromium --with-deps

COPY . .

EXPOSE 8000

CMD ["python", "run.py"]