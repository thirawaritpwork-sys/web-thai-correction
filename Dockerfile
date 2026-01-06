# Use Python 3.11 slim image based on latest Linux
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements files
COPY requirements-server.txt requirements-tokenizer.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-server.txt
RUN pip install --no-cache-dir -r requirements-tokenizer.txt

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p audio

# Expose ports for both servers
EXPOSE 5000 5001

# Create startup script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Set entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]