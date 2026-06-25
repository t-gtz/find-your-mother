import React, { useEffect, useRef, useState } from 'react';
import HLS from 'hls.js';

export default function VideoPlayer({ webcam }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamInfo, setStreamInfo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!webcam) return;
    setIsPlaying(false);

    const loadStream = async () => {
      try {
        setLoading(true);
        setError(null);

        let info;
        if (webcam.source === 'windy' || webcam.source === 'earthcam') {
          info = { 
            streamUrl: webcam.stream_url, 
            streamType: webcam.stream_type,
            thumbnailUrl: webcam.thumbnail_url 
          };
        } else {
          const response = await fetch(`/api/stream/${webcam.id}`);
          info = await response.json();
        }

        setStreamInfo(info);

        if (info.streamType !== 'iframe') {
          const video = videoRef.current;
          if (info.streamType === 'hls' && HLS.isSupported() && video) {
            const hls = new HLS();
            hls.loadSource(info.streamUrl);
            hls.attachMedia(video);
            hls.on(HLS.Events.ERROR, (event, data) => {
              if (data.fatal) setError(`HLS Error: ${data.response?.statusText}`);
            });
          } else if ((info.streamType === 'http' || info.streamType === 'mjpeg') && video) {
            video.src = info.streamUrl;
          }
          setIsPlaying(true);
        }
      } catch (err) {
        setError(`Fehler beim Laden des Streams: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadStream();
  }, [webcam]);

  const handlePlayClick = () => setIsPlaying(true);

  return (
    <div className="video-player-container" style={{ position: 'relative', width: '100%' }}>
      {loading && <div className="loading-spinner">Lädt Stream...</div>}

      {error && <div className="error-message">⚠️ {error}</div>}

      {!isPlaying && streamInfo?.thumbnailUrl ? (
        <div className="thumbnail-overlay" onClick={handlePlayClick} style={{ cursor: 'pointer', position: 'relative' }}>
          <img src={streamInfo.thumbnailUrl} alt="Thumbnail" style={{ width: '100%', borderRadius: '8px' }} />
          <div className="play-button" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '3rem' }}>▶</div>
        </div>
      ) : streamInfo?.streamType === 'iframe' ? (
        <iframe
          src={streamInfo.streamUrl}
          style={{ width: '100%', height: '500px', backgroundColor: '#000', borderRadius: '8px', border: 'none' }}
          allow="autoplay; fullscreen"
          allowFullScreen
        ></iframe>
      ) : (
        <video
          ref={videoRef}
          controls
          autoPlay
          muted
          className="video-player"
          style={{ width: '100%', maxHeight: '600px', backgroundColor: '#000', borderRadius: '8px' }}
        />
      )}

      {streamInfo && (
        <div className="stream-info">
          <span className={`status-badge ${webcam.is_active !== false ? 'online' : 'offline'}`}>
            {webcam.is_active !== false ? '🔴 LIVE' : '⚫ OFFLINE'}
          </span>
          <span className="stream-type">{streamInfo.streamType.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
