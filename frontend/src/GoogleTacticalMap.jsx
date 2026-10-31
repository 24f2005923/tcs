import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from './googleMapsLoader';

const COLORS = {
  incident: '#ef4444',
  team: '#22c55e',
  shelter: '#06b6d4',
  depot: '#818cf8',
  hospital: '#f97316',
  blocked: '#dc2626',
  highRisk: '#eab308',
  original: '#3b82f6',
  selected: '#22c55e'
};

function markerIcon(label, color, emoji) {
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 1,
    scale: 11,
    labelOrigin: new window.google.maps.Point(0, -22)
  };
}

function markerLabel(label) {
  return { text: label, color: '#f8fafc', fontSize: '10px', fontWeight: '700' };
}

export default function GoogleTacticalMap({
  center,
  zoom,
  layersHUD,
  floodZones,
  roadSegments,
  incidents,
  teams,
  shelters,
  depots,
  hospitals = [],
  accidents = [],
  riskLocations = [],
  routes = [],
  selectedEntity,
  isPlanApproved,
  onSelectEntity
}) {
  const elementRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !elementRef.current || mapRef.current) return;
        mapRef.current = new window.google.maps.Map(elementRef.current, {
          center: { lat: center[0], lng: center[1] },
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#020617' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] }
          ]
        });
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError?.message || 'Google Maps could not be loaded.');
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: center[0], lng: center[1] });
      mapRef.current.setZoom(zoom);
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    const map = mapRef.current;
    const infoWindow = new window.google.maps.InfoWindow();

    const addMarker = (position, label, color, content, onClick) => {
      if (!Number.isFinite(position?.[0]) || !Number.isFinite(position?.[1])) return;
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: position[0], lng: position[1] },
        title: label,
        label: markerLabel(label),
        icon: markerIcon(label, color)
      });
      marker.addListener('click', () => {
        infoWindow.setContent(`<div style="color:#0f172a;font-family:monospace;font-size:12px"><strong>${label}</strong>${content || ''}</div>`);
        infoWindow.open({ map, anchor: marker });
        onClick?.();
      });
      overlaysRef.current.push(marker);
    };

    if (layersHUD.inundation) {
      floodZones.forEach((zone) => {
        const polygon = new window.google.maps.Polygon({
          map,
          paths: zone.coords.map(([lat, lng]) => ({ lat, lng })),
          strokeColor: zone.color,
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: zone.color,
          fillOpacity: zone.fillOpacity
        });
        overlaysRef.current.push(polygon);
      });
    }

    if (layersHUD.transitCorridors) {
      roadSegments.forEach((road) => {
        const severed = road.status === 'SEVERED';
        const bypass = road.id === 'ROAD-WEST-BYPASS';
        const polyline = new window.google.maps.Polyline({
          map,
          path: road.waypoints.map(([lat, lng]) => ({ lat, lng })),
          strokeColor: severed ? COLORS.blocked : bypass ? (isPlanApproved ? COLORS.selected : '#f59e0b') : '#38bdf8',
          strokeOpacity: severed ? 0.95 : 0.8,
          strokeWeight: severed ? 5 : 3,
          geodesic: true
        });
        overlaysRef.current.push(polyline);
      });
    }

    if (layersHUD.incidents) {
      incidents.forEach((incident) => addMarker(
        incident.pos,
        `${incident.id} P${incident.priorityScore}`,
        COLORS.incident,
        `<p>${incident.title}</p>`,
        () => onSelectEntity({ type: 'INCIDENT', data: incident })
      ));
    }
    if (layersHUD.teams) {
      teams.forEach((team) => addMarker(team.pos, team.callsign, COLORS.team, `<p>${team.status}</p>`, () => onSelectEntity({ type: 'TEAM', data: team })));
    }
    if (layersHUD.shelters) {
      shelters.forEach((shelter) => addMarker(shelter.pos, shelter.name, COLORS.shelter, `<p>Occupancy: ${shelter.occupancy}/${shelter.capacity}</p>`, () => onSelectEntity({ type: 'SHELTER', data: shelter })));
    }
    if (layersHUD.depots) {
      depots.forEach((depot) => addMarker(depot.pos, depot.id, COLORS.depot, `<p>${depot.name}</p>`));
    }
    hospitals.forEach((hospital) => addMarker(hospital.pos, hospital.name || 'Hospital', COLORS.hospital, '<p>Emergency medical facility</p>'));

    accidents.forEach((accident) => {
      const confirmed = String(accident.status).includes('VERIFIED');
      addMarker(accident.pos, accident.id, confirmed ? COLORS.blocked : COLORS.highRisk,
        `<p>${accident.status}: ${accident.road_name || ''}</p>`);
    });

    riskLocations.forEach((risk) => {
      if (risk.risk_level === 'HIGH') {
        addMarker([risk.lat, risk.lon], 'HIGH RISK', COLORS.highRisk, '<p>Predicted high-risk location</p>');
      }
    });

    routes.forEach((route, index) => {
      if (!route.polyline?.length) return;
      const color = route.selected ? COLORS.selected : COLORS.original;
      const polyline = new window.google.maps.Polyline({
        map,
        path: route.polyline.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: index === 0 && !route.selected ? COLORS.original : color,
        strokeOpacity: 0.95,
        strokeWeight: 7,
        geodesic: true
      });
      overlaysRef.current.push(polyline);
    });
  }, [layersHUD, floodZones, roadSegments, incidents, teams, shelters, depots, hospitals, accidents, riskLocations, routes, isPlanApproved, selectedEntity, onSelectEntity]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-red-400 font-mono text-sm px-6 text-center">
        Google Maps unavailable: {error}
      </div>
    );
  }

  return <div ref={elementRef} className="absolute inset-0 w-full h-full" />;
}
