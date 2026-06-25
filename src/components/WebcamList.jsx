import React from 'react';

export default function WebcamList({
  webcams,
  onSelectWebcam,
  onToggleFavorite,
  favorites,
  selectedWebcam,
  isLoading
}) {
  if (isLoading) {
    return <div className="webcam-list-loading">Lädt Webcams...</div>;
  }

  if (webcams.length === 0) {
    return <div className="webcam-list-empty">Keine Webcams gefunden.</div>;
  }

  return (
    <div className="webcam-list">
      {webcams.map(cam => (
        <div 
          key={cam.id} 
          className={`webcam-list-item ${selectedWebcam?.id === cam.id ? 'selected' : ''}`}
          onClick={() => onSelectWebcam(cam)}
        >
          {cam.thumbnail_url && (
            <img src={cam.thumbnail_url} alt={cam.name} className="webcam-thumbnail" />
          )}
          <div className="webcam-list-item-header">
            <h4>{cam.name}</h4>
            <button 
              className={`favorite-icon ${favorites.has(cam.id) ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(cam.id);
              }}
            >
              {favorites.has(cam.id) ? '★' : '☆'}
            </button>
          </div>
          <div className="webcam-list-item-details">
            <span>
              {cam.source === 'windy' && <span className="windy-badge">💨 Windy</span>}{' '}
              {cam.city}, {cam.country}
            </span>
            <div className="webcam-meta">
              <span className={`status-dot ${cam.is_active == 1 || cam.is_active === true ? 'online' : 'offline'}`} title={cam.is_active == 1 || cam.is_active === true ? 'Online' : 'Offline'}></span>
              {cam.view_count !== undefined && <span className="view-count">👁️ {cam.view_count.toLocaleString()}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
