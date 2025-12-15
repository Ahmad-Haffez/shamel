import os
import logging
from typing import List, Dict, Optional
import torch
import whisper
import librosa
import numpy as np
from sentence_transformers import SentenceTransformer
from opensearchpy import OpenSearch, helpers
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import soundfile as sf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Audio Search Service")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment configuration
OPENSEARCH_HOST = os.getenv("OPENSEARCH_HOST", "opensearch-svc")
OPENSEARCH_PORT = int(os.getenv("OPENSEARCH_PORT", "9200"))
AUDIO_INDEX_NAME = os.getenv("AUDIO_INDEX_NAME", "audio_multimodal_search")

# Initialize models
logger.info("Loading Whisper model for audio transcription...")
whisper_model = whisper.load_model("base")  # Options: tiny, base, small, medium, large

logger.info("Loading sentence transformer for text embeddings...")
text_embedding_model = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dimensions

# Initialize OpenSearch client
opensearch_client = OpenSearch(
    hosts=[{'host': OPENSEARCH_HOST, 'port': OPENSEARCH_PORT}],
    http_compress=True,
    use_ssl=False,
    verify_certs=False,
    ssl_assert_hostname=False,
    ssl_show_warn=False
)


def extract_audio_features(audio_path: str) -> np.ndarray:
    """
    Extract audio embeddings using mel-spectrogram features.
    Returns a fixed-size feature vector for audio similarity search.
    """
    try:
        # Load audio file
        y, sr = librosa.load(audio_path, sr=16000, duration=30)  # Limit to 30 seconds
        
        # Extract mel-spectrogram
        mel_spec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, fmax=8000)
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        
        # Aggregate features (mean pooling across time)
        audio_embedding = np.mean(mel_spec_db, axis=1)
        
        # Normalize
        audio_embedding = (audio_embedding - audio_embedding.mean()) / (audio_embedding.std() + 1e-8)
        
        return audio_embedding.tolist()
    except Exception as e:
        logger.error(f"Error extracting audio features: {e}")
        raise


def transcribe_audio(audio_path: str) -> Dict:
    """
    Transcribe audio using Whisper model.
    Returns transcription text and metadata.
    """
    try:
        result = whisper_model.transcribe(audio_path)
        return {
            "text": result["text"],
            "language": result.get("language", "unknown"),
            "segments": result.get("segments", [])
        }
    except Exception as e:
        logger.error(f"Error transcribing audio: {e}")
        raise


def create_text_embedding(text: str) -> List[float]:
    """
    Create text embedding using sentence transformer.
    """
    try:
        embedding = text_embedding_model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
    except Exception as e:
        logger.error(f"Error creating text embedding: {e}")
        raise


async def create_audio_index():
    """
    Create OpenSearch index with multi-vector mapping for audio and text embeddings.
    """
    index_mapping = {
        "settings": {
            "index": {
                "number_of_shards": 1,
                "number_of_replicas": 1,
                "knn": True,
                "knn.algo_param.ef_search": 100
            }
        },
        "mappings": {
            "properties": {
                "filename": {"type": "keyword"},
                "transcription": {"type": "text"},
                "language": {"type": "keyword"},
                "duration": {"type": "float"},
                "upload_timestamp": {"type": "date"},
                "metadata": {"type": "object"},
                
                # Multi-vector embeddings
                "text_embedding": {
                    "type": "knn_vector",
                    "dimension": 384,  # all-MiniLM-L6-v2 dimension
                    "method": {
                        "name": "hnsw",
                        "space_type": "cosinesimil",
                        "engine": "nmslib",
                        "parameters": {
                            "ef_construction": 128,
                            "m": 16
                        }
                    }
                },
                "audio_embedding": {
                    "type": "knn_vector",
                    "dimension": 128,  # mel-spectrogram features
                    "method": {
                        "name": "hnsw",
                        "space_type": "cosinesimil",
                        "engine": "nmslib",
                        "parameters": {
                            "ef_construction": 128,
                            "m": 16
                        }
                    }
                }
            }
        }
    }
    
    try:
        if not opensearch_client.indices.exists(index=AUDIO_INDEX_NAME):
            opensearch_client.indices.create(index=AUDIO_INDEX_NAME, body=index_mapping)
            logger.info(f"Created index: {AUDIO_INDEX_NAME}")
        else:
            logger.info(f"Index {AUDIO_INDEX_NAME} already exists")
    except Exception as e:
        logger.error(f"Error creating index: {e}")
        raise


@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("Starting Audio Search Service...")
    await create_audio_index()
    logger.info("Audio Search Service ready!")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "opensearch_connected": opensearch_client.ping(),
        "models_loaded": True
    }


@app.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    metadata: Optional[str] = Form(None)
):
    """
    Upload and process audio file.
    Extracts both audio and text embeddings for multi-modal search.
    """
    try:
        # Validate file type
        if not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Get audio duration
            audio_data, sample_rate = sf.read(temp_path)
            duration = len(audio_data) / sample_rate
            
            # Extract audio embeddings
            logger.info("Extracting audio features...")
            audio_embedding = extract_audio_features(temp_path)
            
            # Transcribe audio
            logger.info("Transcribing audio...")
            transcription_result = transcribe_audio(temp_path)
            transcription_text = transcription_result["text"]
            
            # Create text embedding from transcription
            logger.info("Creating text embedding...")
            text_embedding = create_text_embedding(transcription_text)
            
            # Prepare document for indexing
            document = {
                "filename": file.filename,
                "transcription": transcription_text,
                "language": transcription_result.get("language", "unknown"),
                "duration": duration,
                "upload_timestamp": "now",
                "metadata": metadata or {},
                "text_embedding": text_embedding,
                "audio_embedding": audio_embedding
            }
            
            # Index in OpenSearch
            response = opensearch_client.index(
                index=AUDIO_INDEX_NAME,
                body=document,
                refresh=True
            )
            
            doc_id = response['_id']
            
            logger.info(f"Successfully indexed audio file: {file.filename} with ID: {doc_id}")
            
            return {
                "status": "success",
                "document_id": doc_id,
                "filename": file.filename,
                "transcription": transcription_text,
                "language": transcription_result.get("language"),
                "duration": duration,
                "text_embedding_dim": len(text_embedding),
                "audio_embedding_dim": len(audio_embedding)
            }
            
        finally:
            # Clean up temp file
            os.unlink(temp_path)
            
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search-by-text")
async def search_by_text(
    query: str = Form(...),
    k: int = Form(10),
    text_weight: float = Form(0.7),
    audio_weight: float = Form(0.3)
):
    """
    Search audio files by text query.
    Uses text embedding for semantic search.
    """
    try:
        # Create query embedding
        query_embedding = create_text_embedding(query)
        
        # Multi-vector search query
        search_body = {
            "size": k,
            "query": {
                "script_score": {
                    "query": {"match_all": {}},
                    "script": {
                        "source": f"""
                            double textScore = {text_weight} * cosineSimilarity(params.query_vector_text, 'text_embedding') + 1.0;
                            return textScore;
                        """,
                        "params": {
                            "query_vector_text": query_embedding
                        }
                    }
                }
            },
            "_source": ["filename", "transcription", "language", "duration", "upload_timestamp"]
        }
        
        response = opensearch_client.search(
            index=AUDIO_INDEX_NAME,
            body=search_body
        )
        
        results = []
        for hit in response['hits']['hits']:
            results.append({
                "id": hit['_id'],
                "score": hit['_score'],
                "filename": hit['_source']['filename'],
                "transcription": hit['_source']['transcription'],
                "language": hit['_source'].get('language'),
                "duration": hit['_source'].get('duration')
            })
        
        return {
            "query": query,
            "results": results,
            "total": response['hits']['total']['value']
        }
        
    except Exception as e:
        logger.error(f"Error searching: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search-by-audio")
async def search_by_audio(
    file: UploadFile = File(...),
    k: int = Form(10),
    audio_weight: float = Form(0.7),
    text_weight: float = Form(0.3)
):
    """
    Search audio files by uploading an audio sample.
    Uses audio embedding for similarity search.
    """
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Extract audio features from query
            query_audio_embedding = extract_audio_features(temp_path)
            
            # Multi-vector search query
            search_body = {
                "size": k,
                "query": {
                    "script_score": {
                        "query": {"match_all": {}},
                        "script": {
                            "source": f"""
                                double audioScore = {audio_weight} * cosineSimilarity(params.query_vector_audio, 'audio_embedding') + 1.0;
                                return audioScore;
                            """,
                            "params": {
                                "query_vector_audio": query_audio_embedding
                            }
                        }
                    }
                },
                "_source": ["filename", "transcription", "language", "duration"]
            }
            
            response = opensearch_client.search(
                index=AUDIO_INDEX_NAME,
                body=search_body
            )
            
            results = []
            for hit in response['hits']['hits']:
                results.append({
                    "id": hit['_id'],
                    "score": hit['_score'],
                    "filename": hit['_source']['filename'],
                    "transcription": hit['_source']['transcription'],
                    "language": hit['_source'].get('language'),
                    "duration": hit['_source'].get('duration')
                })
            
            return {
                "query_type": "audio",
                "results": results,
                "total": response['hits']['total']['value']
            }
            
        finally:
            os.unlink(temp_path)
            
    except Exception as e:
        logger.error(f"Error searching by audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/hybrid-search")
async def hybrid_search(
    text_query: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    k: int = Form(10),
    text_weight: float = Form(0.5),
    audio_weight: float = Form(0.5)
):
    """
    Hybrid search combining both text and audio modalities.
    """
    try:
        if not text_query and not audio_file:
            raise HTTPException(status_code=400, detail="Provide at least text query or audio file")
        
        query_text_embedding = None
        query_audio_embedding = None
        
        # Get text embedding if provided
        if text_query:
            query_text_embedding = create_text_embedding(text_query)
        
        # Get audio embedding if provided
        if audio_file:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
                content = await audio_file.read()
                temp_file.write(content)
                temp_path = temp_file.name
            
            try:
                query_audio_embedding = extract_audio_features(temp_path)
            finally:
                os.unlink(temp_path)
        
        # Build hybrid search query
        script_parts = []
        params = {}
        
        if query_text_embedding:
            script_parts.append(f"{text_weight} * cosineSimilarity(params.query_vector_text, 'text_embedding')")
            params["query_vector_text"] = query_text_embedding
        
        if query_audio_embedding:
            script_parts.append(f"{audio_weight} * cosineSimilarity(params.query_vector_audio, 'audio_embedding')")
            params["query_vector_audio"] = query_audio_embedding
        
        script_source = " + ".join(script_parts) + " + 1.0"
        
        search_body = {
            "size": k,
            "query": {
                "script_score": {
                    "query": {"match_all": {}},
                    "script": {
                        "source": script_source,
                        "params": params
                    }
                }
            },
            "_source": ["filename", "transcription", "language", "duration"]
        }
        
        response = opensearch_client.search(
            index=AUDIO_INDEX_NAME,
            body=search_body
        )
        
        results = []
        for hit in response['hits']['hits']:
            results.append({
                "id": hit['_id'],
                "score": hit['_score'],
                "filename": hit['_source']['filename'],
                "transcription": hit['_source']['transcription'],
                "language": hit['_source'].get('language'),
                "duration": hit['_source'].get('duration')
            })
        
        return {
            "query_type": "hybrid",
            "text_query": text_query,
            "audio_provided": audio_file is not None,
            "results": results,
            "total": response['hits']['total']['value']
        }
        
    except Exception as e:
        logger.error(f"Error in hybrid search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/list-audio")
async def list_audio(limit: int = 50):
    """List all indexed audio files"""
    try:
        response = opensearch_client.search(
            index=AUDIO_INDEX_NAME,
            body={
                "size": limit,
                "query": {"match_all": {}},
                "_source": ["filename", "transcription", "language", "duration", "upload_timestamp"]
            }
        )
        
        results = []
        for hit in response['hits']['hits']:
            results.append({
                "id": hit['_id'],
                "filename": hit['_source']['filename'],
                "transcription": hit['_source']['transcription'],
                "language": hit['_source'].get('language'),
                "duration": hit['_source'].get('duration'),
                "upload_timestamp": hit['_source'].get('upload_timestamp')
            })
        
        return {
            "results": results,
            "total": response['hits']['total']['value']
        }
        
    except Exception as e:
        logger.error(f"Error listing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)
