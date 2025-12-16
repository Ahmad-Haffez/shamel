FROM python:3.11-slim

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install PyTorch with CUDA 11.8 support first
RUN pip install --no-cache-dir torch==2.1.0 torchaudio==2.1.0 --index-url https://download.pytorch.org/whl/cu118

# Install all Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download models (cached in Docker layer)
RUN python -c "import whisper; whisper.load_model('tiny')" && \
    python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application code (only layer that changes frequently)
COPY main.py .

# Expose port
EXPOSE 8090

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090"]
