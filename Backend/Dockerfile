FROM mcr.microsoft.com/playwright/python:v1.59.0-jammy

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Force python3.11 as default (already exists in base image, just set the symlink)
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Force correct playwright version and use fixed browser path
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pip install playwright==1.59.0 --force-reinstall
RUN playwright install chromium --with-deps

COPY . .

EXPOSE 8000

CMD ["python", "run.py"]