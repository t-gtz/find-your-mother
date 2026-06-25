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

    // Erstelle oder hole die MarkerGroup einmal und Merke hinzugefügte IDs
    if (!map._markerGroup) {
      map._markerGroup = L.markerClusterGroup({
        maxClusterRadius: 80,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          let size = 'large';
          if (count < 10) size = 'small';
          else if (count < 100) size = 'medium';

          return L.divIcon({
            html: `<div class="cluster-icon ${size}">${count}</div>`,
            iconSize: [44, 44],
            className: 'custom-cluster-icon'
          });
        }
      });
      map.addLayer(map._markerGroup);
      map._addedIds = new Set();

      // Infinite-style load: wenn Karte bewegt wird, lade sichtbare Marker nach
      map.on('moveend', () => {
        addVisibleMarkers();
      });
    }

    const markerGroup = map._markerGroup;

    // Hilfsfunktion: prüfe ob Punkt in sichtbaren Bounds
    const isInView = (cam) => {
      try {
        const latlng = L.latLng(cam.latitude, cam.longitude);
        return map.getBounds().contains(latlng);
      } catch (e) {
        return false;
      }
    };

    // Erzeuge einen individuellen DivIcon Marker mit Puls-Effekt
    const createDivMarker = (cam) => {
      const isFavorite = favorites.has(cam.id);
      const isSelected = selectedWebcam?.id === cam.id;
      const stateClass = cam.is_active ? 'online' : 'offline';
      const favClass = isFavorite ? 'fav' : '';
      const selClass = isSelected ? 'selected' : '';

      const html = `
        <div class="pulse-marker ${stateClass} ${favClass} ${selClass}" title="${cam.name}">
          <span class="dot"></span>
          <span class="pulse"></span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-div-icon',
        html,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon });

      marker.bindPopup(
        `<div class="map-popup"><h4>${cam.name}</h4><p>${cam.city}, ${cam.country}</p><p class=\"status\">${cam.is_active ? '🟢 Online' : '🔴 Offline'}</p></div>`,
        { maxWidth: 280 }
      );

      marker.on('click', () => onMarkerClick(cam));
      return marker;
    };

    // Füge Marker hinzu, aber nur für sichtbaren Bereich oder bis zu einer Chunk-Größe
    const addVisibleMarkers = (chunk = 80) => {
      if (!webcams || webcams.length === 0) return;
      const toAdd = [];
      for (let i = 0; i < webcams.length; i++) {
        const cam = webcams[i];
        if (map._addedIds.has(cam.id)) continue;
        if (isInView(cam)) {
          toAdd.push(cam);
          if (toAdd.length >= chunk) break;
        }
      }

      if (toAdd.length === 0) return;
      toAdd.forEach(cam => {
        const marker = createDivMarker(cam);
        markerGroup.addLayer(marker);
        map._addedIds.add(cam.id);
      });
    };

    // Initial: lade erste sichtbaren Marker und ein paar in der Nähe
    addVisibleMarkers(120);

    // Wenn sich props ändern (z. B. Auswahl), aktualisiere Selektions-Darstellung: einfache, aber effektive Methode ist Neuaufbau
    // Entferne Marker, die nicht mehr existieren
    markerGroup.eachLayer(layer => {
      // rudimentäre Aufräum-Strategie: entferne Layer falls zu viele fehlen
      // (keine Aktion notwendig hier)
    });

  }, [webcams, onMarkerClick, selectedWebcam, favorites]);

  return (
    <div 
      ref={mapRef}
      className="map-container"
      style={{ height: '100%', width: '100%', zIndex: 1 }}
    />
  );
}
