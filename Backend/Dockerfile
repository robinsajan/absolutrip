FROM mcr.microsoft.com/playwright/python:v1.59.0-jammy

WORKDIR /app

# Debug: check what python versions exist
RUN which python && python --version && which python3 && python3 --version && ls /usr/bin/python*

RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pip install playwright==1.59.0 --force-reinstall
RUN playwright install chromium --with-deps

COPY . .

EXPOSE 8000

CMD ["python", "run.py"]