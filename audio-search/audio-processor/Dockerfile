# Use local base image by ID (temporary - use local.registry/audio-processor-base:1.0 after rebuild)
FROM da1d4b553ea5

WORKDIR /app

# Pre-download models in this layer (only rebuild if requirements change)
RUN python -c "import whisper; whisper.load_model('tiny')" && \
    python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application code (only layer that changes frequently)
COPY main.py .

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090"]
