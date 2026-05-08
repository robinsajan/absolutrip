# Use Playwright's official Python image as base
# This image comes pre-installed with all system dependencies for Playwright
FROM mcr.microsoft.com/playwright/python:v1.51.0-jammy


# Set working directory
WORKDIR /app

# Install system dependencies for psycopg2 and other essential tools
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Ensure Playwright chromium browser is installed and ready
RUN playwright install chromium

# Copy the rest of the application code
COPY . .



# Expose the port Gunicorn will listen on
EXPOSE 8000

# Start the application using Gunicorn
# Using 4 workers and a long timeout to handle potentially slow scraper tasks
CMD ["python", "run.py"]
