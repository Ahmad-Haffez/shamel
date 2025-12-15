# Use local base image by tag (buildkit should find it locally)
FROM localhost/audio-processor-base:1.0

WORKDIR /app

# Pre-download models in this layer (only rebuild if requirements change)
RUN python -c "import whisper; whisper.load_model('tiny')" && \
    python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application code (only layer that changes frequently)
COPY main.py .

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090"]
