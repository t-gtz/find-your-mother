import React, { useState, useEffect } from 'react';

export default function SearchBar({ onSearch, onClear }) {
  const [query, setQuery] = useState('');

  const doSearch = (q) => {
    onSearch(q || '');
  };

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleClear = () => {
    setQuery('');
    onClear?.();
  };

  return (
    <div className="search-container">
      <div className="search-input-group">
        <input
          type="text"
          placeholder="🔍 Suche nach Stadt oder Land (z. B. Berlin, Germany)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        {query && (
          <button onClick={handleClear} className="clear-button">✕</button>
        )}
      </div>
    </div>
  );
}
