import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';

export default function MapComponent({
  webcams,
  onMarkerClick,
  selectedWebcam,
  favorites
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialisiere Karte nur einmal
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([51.1657, 10.4515], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Vorherige Marker entfernen
    map.eachLayer((layer) => {
      if (layer instanceof L.MarkerClusterGroup) {
        map.removeLayer(layer);
      }
    });

    // Marker Cluster Group
    const markerGroup = L.markerClusterGroup({
      maxClusterRadius: 80,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'large';
        if (count < 10) size = 'small';
        else if (count < 100) size = 'medium';

        return L.divIcon({
          html: `<div class="cluster-icon ${size}">${count}</div>`,
          iconSize: [40, 40],
          className: 'custom-cluster-icon'
        });
      }
    });

    // Füge Marker hinzu
    webcams.forEach(cam => {
      const isFavorite = favorites.has(cam.id);
      const isSelected = selectedWebcam?.id === cam.id;

      const markerColor = isFavorite ? '#fbbf24' : (cam.is_active ? '#3b82f6' : '#9ca3af');

      const marker = L.circleMarker(
        [cam.latitude, cam.longitude],
        {
          radius: isSelected ? 10 : 7,
          fillColor: markerColor,
          color: isSelected ? '#000' : '#fff',
          weight: isSelected ? 3 : 2,
          opacity: 1,
          fillOpacity: 0.9
        }
      );

      marker.bindPopup(`
        <div class="map-popup">
          <h4>${cam.name}</h4>
          <p>${cam.city}, ${cam.country}</p>
          <p class="status">${cam.is_active ? '🟢 Online' : '🔴 Offline'}</p>
        </div>
      `, {
        maxWidth: 250
      });

      marker.on('click', () => onMarkerClick(cam));

      markerGroup.addLayer(marker);
    });

    markerGroup.addTo(map);

  }, [webcams, onMarkerClick, selectedWebcam, favorites]);

  return (
    <div 
      ref={mapRef}
      className="map-container"
      style={{ height: '100%', width: '100%', zIndex: 1 }}
    />
  );
}
