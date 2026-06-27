import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { buildMarkerEl, buildClusterEl } from '../utils/markerUtils';

export default function LeafletMap({
  webcams,
  onMarkerClick,
  selectedWebcam,
  favorites,
  visible
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Trigger size recalculation when the map is revealed
  useEffect(() => {
    if (mapInstanceRef.current && visible) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 100);
    }
  }, [visible]);

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

    // Erstelle oder hole die MarkerGroup einmal und Merke hinzugefügte IDs
    if (!map._markerGroup) {
      map._markerGroup = L.markerClusterGroup({
        maxClusterRadius: 80,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? 'small' : count < 100 ? 'medium' : 'large';
          const dim = size === 'small' ? 36 : size === 'medium' ? 46 : 64;
          const el = buildClusterEl(count);
          return L.divIcon({
            html: el,
            iconSize: [dim, dim],
            // Empty className prevents Leaflet's wrapper from inheriting
            // cluster styles that conflict with the inner element
            className: ''
          });
        }
      });
      map.addLayer(map._markerGroup);
    }

    const markerGroup = map._markerGroup;

    // Clear and rebuild all markers — MarkerClusterGroup handles
    // 1000+ markers efficiently, no need for viewport-based chunking
    markerGroup.clearLayers();

    if (webcams && webcams.length > 0) {
      const markers = webcams.map(cam => {
        const el = buildMarkerEl(cam, {
          isFav: favorites.has(cam.id),
          isSelected: selectedWebcam?.id === cam.id
        });
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: el,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([cam.latitude, cam.longitude], { icon });

        marker.bindPopup(
          `<div class="map-popup"><h4>${cam.name}</h4><p>${cam.city}, ${cam.country}</p><p class="status">${cam.is_active ? '🟢 Online' : '🔴 Offline'}</p></div>`,
          { maxWidth: 280 }
        );
        marker.on('click', () => onMarkerClick(cam));
        return marker;
      });

      // Bulk-add is much faster than adding one by one
      markerGroup.addLayers(markers);
    }


  }, [webcams, onMarkerClick, selectedWebcam, favorites]);

  return (
    <div
      ref={mapRef}
      className="map-container"
      style={{ height: '100%', width: '100%', zIndex: 1 }}
    />
  );
}
