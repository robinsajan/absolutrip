FROM mcr.microsoft.com/playwright/python:v1.59.0-jammy

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip3.11 install --no-cache-dir --upgrade pip && \
    pip3.11 install --no-cache-dir -r requirements.txt

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pip3.11 install playwright==1.59.0 --force-reinstall
RUN python3.11 -m playwright install chromium --with-deps

COPY . .

EXPOSE 8000

# Explicitly use python3.11 instead of just "python"
CMD ["python3.11", "run.py"]