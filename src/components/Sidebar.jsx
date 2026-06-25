import React, { useState } from 'react';
import SearchBar from './SearchBar';
import WebcamList from './WebcamList';

export default function Sidebar({
  webcams,
  onSearch,
  onSelectWebcam,
  favorites,
  onToggleFavorite,
  selectedWebcam,
  isLoading
}) {
  const [showFavorites, setShowFavorites] = useState(false);

  const displayWebcams = showFavorites
    ? webcams.filter(w => favorites.has(w.id))
    : webcams;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Webcams</h2>
        <span className="count">{webcams.length}</span>
      </div>

      <SearchBar onSearch={onSearch} />

      <div className="sidebar-tabs">
        <button
          className={`tab ${!showFavorites ? 'active' : ''}`}
          onClick={() => setShowFavorites(false)}
        >
          Alle ({webcams.length})
        </button>
        <button
          className={`tab ${showFavorites ? 'active' : ''}`}
          onClick={() => setShowFavorites(true)}
        >
          ⭐ ({favorites.size})
        </button>
      </div>

      <WebcamList
        webcams={displayWebcams}
        onSelectWebcam={onSelectWebcam}
        onToggleFavorite={onToggleFavorite}
        favorites={favorites}
        selectedWebcam={selectedWebcam}
        isLoading={isLoading}
      />
    </aside>
  );
}
