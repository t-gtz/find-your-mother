import React, { useEffect, useRef, useState } from 'react';
import HLS from 'hls.js';

export default function VideoPlayer({ webcam }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamInfo, setStreamInfo] = useState(null);

  useEffect(() => {
    if (!webcam) return;

    const loadStream = async () => {
      try {
        setLoading(true);
        setError(null);

        let info;
        // Skip backend fetch for proxy APIs since we already have the URL
        if (webcam.source === 'windy' || webcam.source === 'earthcam') {
          info = { streamUrl: webcam.stream_url, streamType: webcam.stream_type };
        } else {
          const response = await fetch(`/api/stream/${webcam.id}`);
          info = await response.json();
        }

        setStreamInfo(info);

        const streamUrl = info.streamUrl;
        const streamType = info.streamType;
        const video = videoRef.current;

        // Abhängig vom Stream-Typ laden
        if (streamType === 'iframe') {
          // handled in render below
        } else if (streamType === 'hls' && HLS.isSupported() && video) {
          const hls = new HLS();
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(HLS.Events.ERROR, (event, data) => {
            if (data.fatal) {
              setError(`HLS Error: ${data.response?.statusText}`);
            }
          });
          video.play().catch(err => setError(`Playback error: ${err.message}`));
        } else if ((streamType === 'http' || streamType === 'mjpeg') && video) {
          video.src = streamUrl;
          video.play().catch(err => setError(`Playback error: ${err.message}`));
        } else {
          setError(`Stream-Typ nicht unterstützt: ${streamType}`);
        }
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

      {streamInfo?.streamType === 'iframe' ? (
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
          style={{
            width: '100%',
            maxHeight: '600px',
            backgroundColor: '#000',
            borderRadius: '8px',
            display: streamInfo?.streamType === 'iframe' ? 'none' : 'block'
          }}
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
