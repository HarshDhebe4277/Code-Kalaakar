# Use official Python base image
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    tesseract-ocr \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy project files
COPY . /app

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Set environment variables (adjust if needed)
ENV PYTHONUNBUFFERED=1

# Expose the port your app runs on (commonly 5000)
EXPOSE 5000

# Start the app with gunicorn (adjust module name if not app.py)
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5000"]
