import React, { useState, useEffect } from 'react';

export default function SearchBar({ onSearch, onClear }) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);

  const handleSearch = () => {
    onSearch(query, {
      city: city,
      category: categories.length > 0 ? categories[0] : ''
    });
  };

  const handleClear = () => {
    setQuery('');
    setCity('');
    setCategories([]);
    onClear?.();
  };

  useEffect(() => {
    const timer = setTimeout(handleSearch, 500);
    return () => clearTimeout(timer);
  }, [query, city, categories]);

  const toggleCategory = (cat) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [cat]
    );
  };

  return (
    <div className="search-container">
      <div className="search-input-group">
        <input
          type="text"
          placeholder="🔍 Webcam suchen (Name, Stadt)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        {query && (
          <button onClick={handleClear} className="clear-button">✕</button>
        )}
      </div>

      <button 
        className="filter-toggle"
        onClick={() => setShowFilters(!showFilters)}
      >
        ⚙️ Filter {showFilters ? '▲' : '▼'}
      </button>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Stadt:</label>
            <input
              type="text"
              placeholder="z.B. Berlin"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Kategorie:</label>
            <div className="category-buttons">
              {['city', 'traffic', 'nature', 'beach'].map(cat => (
                <button
                  key={cat}
                  className={`category-btn ${categories.includes(cat) ? 'active' : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat === 'city' && '🏙️'}
                  {cat === 'traffic' && '🚗'}
                  {cat === 'nature' && '🌲'}
                  {cat === 'beach' && '🏖️'}
                  {' '}
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
