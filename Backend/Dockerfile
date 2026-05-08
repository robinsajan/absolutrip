# Use Playwright's official Python image as base
# This image comes pre-installed with all system dependencies for Playwright
FROM mcr.microsoft.com/playwright/python:v1.59.0-jammy


# Set working directory
WORKDIR /app

# Install system dependencies for psycopg2 and other essential tools
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    python3.11 \
    python3.11-dev \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Force python3.11 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1 && \
    update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Ensure Playwright chromium browser is installed and ready
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN playwright install chromium --with-deps

# Copy the rest of the application code
COPY . .



# Expose the port Gunicorn will listen on
EXPOSE 8000

# Start the application using Gunicorn
# Using 4 workers and a long timeout to handle potentially slow scraper tasks
CMD ["python", "run.py"]
