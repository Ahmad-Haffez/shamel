import React, { useState } from 'react';
import './AudioSearch.css';

interface SearchResult {
  id: string;
  score: number;
  filename: string;
  transcription: string;
  language?: string;
  duration?: number;
}

const AudioSearch: React.FC = () => {
  const [searchMode, setSearchMode] = useState<'text' | 'audio' | 'hybrid'>('text');
  const [textQuery, setTextQuery] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const API_BASE_URL = '/api/audio';

  const handleTextSearch = async () => {
    if (!textQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('query', textQuery);
      formData.append('k', '10');

      const response = await fetch(`${API_BASE_URL}/search-by-text`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAudioSearch = async () => {
    if (!audioFile) {
      setError('Please select an audio file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('k', '10');

      const response = await fetch(`${API_BASE_URL}/search-by-audio`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Audio search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleHybridSearch = async () => {
    if (!textQuery.trim() && !audioFile) {
      setError('Please provide text query or audio file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (textQuery.trim()) {
        formData.append('text_query', textQuery);
      }
      if (audioFile) {
        formData.append('audio_file', audioFile);
      }
      formData.append('k', '10');
      formData.append('text_weight', '0.5');
      formData.append('audio_weight', '0.5');

      const response = await fetch(`${API_BASE_URL}/hybrid-search`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Hybrid search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hybrid search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setError('Please select an audio file to upload');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch(`${API_BASE_URL}/upload-audio`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setUploadStatus(`✅ Uploaded successfully! Transcription: "${data.transcription}"`);
      setUploadFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    switch (searchMode) {
      case 'text':
        handleTextSearch();
        break;
      case 'audio':
        handleAudioSearch();
        break;
      case 'hybrid':
        handleHybridSearch();
        break;
    }
  };

  return (
    <div className="audio-search-container">
      <h1>🎵 Multimodal Audio Search</h1>
      <p className="subtitle">Search audio files using text, audio samples, or both (multi-vector semantic search)</p>

      {/* Upload Section */}
      <div className="upload-section">
        <h2>Upload Audio File</h2>
        <div className="upload-controls">
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            disabled={loading}
          />
          <button onClick={handleUpload} disabled={!uploadFile || loading}>
            {loading ? 'Uploading...' : 'Upload & Index'}
          </button>
        </div>
        {uploadStatus && <div className="upload-status">{uploadStatus}</div>}
      </div>

      {/* Search Section */}
      <div className="search-section">
        <h2>Search Audio Files</h2>
        
        {/* Mode Selection */}
        <div className="mode-selector">
          <button
            className={searchMode === 'text' ? 'active' : ''}
            onClick={() => setSearchMode('text')}
          >
            📝 Text Search
          </button>
          <button
            className={searchMode === 'audio' ? 'active' : ''}
            onClick={() => setSearchMode('audio')}
          >
            🎤 Audio Search
          </button>
          <button
            className={searchMode === 'hybrid' ? 'active' : ''}
            onClick={() => setSearchMode('hybrid')}
          >
            🔀 Hybrid Search
          </button>
        </div>

        {/* Search Inputs */}
        <div className="search-inputs">
          {(searchMode === 'text' || searchMode === 'hybrid') && (
            <div className="input-group">
              <label>Text Query:</label>
              <input
                type="text"
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                placeholder="Enter search query (e.g., 'meeting discussion', 'music with guitar')"
                disabled={loading}
              />
            </div>
          )}

          {(searchMode === 'audio' || searchMode === 'hybrid') && (
            <div className="input-group">
              <label>Audio File:</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                disabled={loading}
              />
            </div>
          )}

          <button
            className="search-button"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? '🔍 Searching...' : '🔍 Search'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <div className="results-section">
          <h2>Search Results ({results.length})</h2>
          <div className="results-grid">
            {results.map((result) => (
              <div key={result.id} className="result-card">
                <div className="result-header">
                  <h3>{result.filename}</h3>
                  <span className="score">Score: {result.score.toFixed(3)}</span>
                </div>
                <div className="result-body">
                  <p className="transcription">
                    <strong>Transcription:</strong> {result.transcription}
                  </p>
                  <div className="result-meta">
                    {result.language && (
                      <span className="meta-item">
                        🌍 Language: {result.language}
                      </span>
                    )}
                    {result.duration && (
                      <span className="meta-item">
                        ⏱️ Duration: {result.duration.toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="info-section">
        <h3>How it works:</h3>
        <ul>
          <li><strong>Text Search:</strong> Search by keywords using semantic text embeddings</li>
          <li><strong>Audio Search:</strong> Upload an audio sample to find similar sounding files</li>
          <li><strong>Hybrid Search:</strong> Combine both text and audio for multi-modal search</li>
        </ul>
        <p className="tech-note">
          Powered by multi-vector embeddings in OpenSearch with Whisper transcription and
          sentence transformers for semantic search.
        </p>
      </div>
    </div>
  );
};

export default AudioSearch;
