FROM audio-processor-base:1.0

WORKDIR /app

# Copy application code (only layer that changes frequently)
COPY main.py .

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090"]
