import React, { useEffect, useRef, useState } from 'react';
import HLS from 'hls.js';

export default function VideoPlayer({ webcam }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamInfo, setStreamInfo] = useState(null);

  useEffect(() => {
    if (!webcam || !videoRef.current) return;

    const loadStream = async () => {
      try {
        setLoading(true);
        setError(null);

        // Stream-Info vom Server abrufen
        const response = await fetch(`/api/stream/${webcam.id}`);
        const info = await response.json();
        setStreamInfo(info);

        const streamUrl = info.streamUrl;
        const streamType = info.streamType;
        const video = videoRef.current;

        // Abhängig vom Stream-Typ laden
        if (streamType === 'hls' && HLS.isSupported()) {
          const hls = new HLS();
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(HLS.Events.ERROR, (event, data) => {
            if (data.fatal) {
              setError(`HLS Error: ${data.response?.statusText}`);
            }
          });
        } else if (streamType === 'http' || streamType === 'mjpeg') {
          video.src = streamUrl;
        } else {
          setError(`Stream-Typ nicht unterstützt: ${streamType}`);
        }

        video.play().catch(err => {
          setError(`Playback error: ${err.message}`);
        });
      } catch (err) {
        setError(`Fehler beim Laden des Streams: ${err.message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStream();
  }, [webcam]);

  return (
    <div className="video-player-container">
      {loading && <div className="loading-spinner">Lädt Stream...</div>}

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        className="video-player"
        style={{
          width: '100%',
          maxHeight: '600px',
          backgroundColor: '#000',
          borderRadius: '8px'
        }}
      />

      {streamInfo && (
        <div className="stream-info">
          <span className={`status-badge ${webcam.is_active ? 'online' : 'offline'}`}>
            {webcam.is_active ? '🔴 LIVE' : '⚫ OFFLINE'}
          </span>
          <span className="stream-type">{streamInfo.streamType.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
