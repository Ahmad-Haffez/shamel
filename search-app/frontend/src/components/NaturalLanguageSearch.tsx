import React, { useState } from 'react';
import axios from 'axios';

interface NLQueryResult {
  query: string;
  sql: string;
  explanation: string;
  confidence: number;
  warnings: string[];
  data: any[];
  rows: number;
  timestamp: string;
}

interface Props {
  onResults: (results: NLQueryResult) => void;
}

const NaturalLanguageSearch: React.FC<Props> = ({ onResults }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const examples = [
    "Show me the top 10 subscribers by data usage",
    "Find all critical anomalies in the last hour",
    "What are the most common destinations?",
    "Show traffic from subscriber 00:11:22:33:44:55",
    "List all traffic spikes detected today",
    "Which destinations have the most packets?",
    "Show me anomalies with high severity",
    "What's the total data usage in the last 6 hours?"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<NLQueryResult>('/api/nl-query', {
        query: query.trim()
      });

      onResults(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Natural language query error:', err);
      setError(
        err.response?.data?.error || 
        err.message || 
        'Failed to process your question. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    setShowExamples(false);
  };

  return (
    <div className="natural-language-search">
      <div className="search-header">
        <h2>Ask a Question</h2>
        <p className="subtitle">
          Use natural language to query your WiFi network data
        </p>
      </div>

      <form onSubmit={handleSubmit} className="search-form">
        <div className="input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Show me the top subscribers by data usage..."
            className="search-input"
            disabled={loading}
          />
          <button 
            type="submit" 
            className="search-button"
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              'Ask'
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          className="examples-toggle"
        >
          {showExamples ? 'Hide' : 'Show'} example questions
        </button>
      </form>

      {showExamples && (
        <div className="examples-list">
          <h3>Example Questions:</h3>
          <div className="examples-grid">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="example-item"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default NaturalLanguageSearch;
