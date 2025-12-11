import React, { useState } from 'react';
import './App.css';
import SearchForm from './components/SearchForm';
import ResultsTable from './components/ResultsTable';
import { searchUnifiedSessions } from './services/opensearchService';

function App() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalHits, setTotalHits] = useState(0);

  const handleSearch = async (searchParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await searchUnifiedSessions(searchParams);
      setResults(response.hits);
      setTotalHits(response.total);
    } catch (err) {
      setError(err.message || 'Failed to search. Please try again.');
      setResults([]);
      setTotalHits(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Unified Sessions Search</h1>
        <p>Search sessions by time range, Subscriber ID, or IP address</p>
      </header>
      
      <main className="App-main">
        <SearchForm onSearch={handleSearch} loading={loading} />
        
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Searching...</p>
          </div>
        )}
        
        {!loading && results.length > 0 && (
          <ResultsTable results={results} totalHits={totalHits} />
        )}
        
        {!loading && !error && results.length === 0 && totalHits === 0 && (
          <div className="no-results">
            <p>No results found. Try adjusting your search criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
