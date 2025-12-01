'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface Station {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  freeway: number;
  direction: string;
  lanes: number;
  type: string;
  distance_km: number;
  traffic?: {
    spi: number;
    congestion_level: number;
    congestion_label: string;
    traffic_state: string;
    confidence_level: string;
  };
}

export interface RouteData {
  origin_marker?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  destination_marker?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  // Supports both tuple format (in-memory) and object format (from Firestore)
  // This is the actual Mapbox route geometry, not connections between stations
  route_polyline?: Array<[number, number]> | Array<{ lat: number; lng: number }>;
  // Traffic monitoring stations along the route (separate from route line)
  intermediate_stations?: Array<{
    id: number;
    latitude: number;
    longitude: number;
    spi?: number;
    congestion_level?: number;
    traffic_state?: string;
    name?: string;
    freeway?: number;
    direction?: string;
  }>;
}

export interface TrafficMapData {
  query_location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  stations?: Station[];
  map_center: {
    latitude: number;
    longitude: number;
  };
  map_zoom: number;
  route_data?: RouteData;
}

interface TrafficMapProps {
  data: TrafficMapData;
}

function getColorFromSPI(spi?: number): string {
  if (!spi) return '#6b7280'; // gray - no data
  if (spi >= 75) return '#388E3C'; // green - very smooth
  if (spi >= 50) return '#FBC02D'; // yellow - smooth
  if (spi >= 25) return '#F57C00'; // orange - mild congestion
  return '#D32F2F'; // red - heavy congestion
}

/**
 * Normalizes route polyline to tuple format for Leaflet
 * Handles both old format (tuples) and new Firestore format (objects)
 */
function normalizePolyline(
  polyline: Array<[number, number]> | Array<{ lat: number; lng: number }> | undefined
): Array<[number, number]> | undefined {
  if (!polyline || polyline.length === 0) return undefined;

  // Check if first element is an object (Firestore format)
  const firstPoint = polyline[0];
  if (firstPoint && typeof firstPoint === 'object' && 'lat' in firstPoint && 'lng' in firstPoint) {
    // Convert from {lat, lng} to [lat, lng]
    return (polyline as Array<{ lat: number; lng: number }>).map(point => [point.lat, point.lng]);
  }

  // Already in tuple format
  return polyline as Array<[number, number]>;
}

function getTrafficLabel(spi?: number): string {
  if (!spi) return 'Sin datos';
  if (spi >= 75) return 'Fluido';
  if (spi >= 50) return 'Moderado';
  if (spi >= 25) return 'Congestionado';
  return 'Muy congestionado';
}

// Create custom icons for origin and destination markers
function createCustomIcon(color: string, label: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <span style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 12px;">${label}</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
}

export function TrafficMap({ data }: TrafficMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    console.log('🗺️ TrafficMap mounted with data:', {
      query: data.query_location?.name,
      stationsCount: data.stations?.length,
      stations: data.stations
    });
  }, [data]);

  // Don't render on server side (Leaflet requires window object)
  if (!isClient) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Cargando mapa...</p>
      </div>
    );
  }

  const center: [number, number] = [
    data.map_center.latitude,
    data.map_center.longitude
  ];

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-300 my-4">
      <MapContainer
        center={center}
        zoom={data.map_zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marker for queried location */}
        <CircleMarker
          center={[data.query_location.latitude, data.query_location.longitude]}
          radius={10}
          pathOptions={{
            color: '#3B82F6',
            fillColor: '#3B82F6',
            fillOpacity: 0.8
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-bold text-lg">{data.query_location.name}</h3>
              <p className="text-sm text-gray-600">Ubicación consultada</p>
              <p className="text-xs text-gray-500 mt-1">
                {data.query_location.latitude.toFixed(4)}, {data.query_location.longitude.toFixed(4)}
              </p>
            </div>
          </Popup>
        </CircleMarker>

        {/* Markers for traffic stations */}
        {data.stations?.map((station) => (
          <CircleMarker
            key={station.id}
            center={[station.latitude, station.longitude]}
            radius={8}
            pathOptions={{
              color: getColorFromSPI(station.traffic?.spi),
              fillColor: getColorFromSPI(station.traffic?.spi),
              fillOpacity: 0.8
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-base">{station.name}</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    <span className="font-semibold">Autopista:</span> {station.freeway} {station.direction}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Distancia:</span> {station.distance_km} km
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Carriles:</span> {station.lanes}
                  </p>
                  {station.traffic && (
                    <>
                      <hr className="my-2" />
                      <p className="text-sm">
                        <span className="font-semibold">SPI:</span> {station.traffic.spi.toFixed(1)}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Estado:</span>{' '}
                        <span
                          className="px-2 py-1 rounded text-white text-xs"
                          style={{ backgroundColor: getColorFromSPI(station.traffic.spi) }}
                        >
                          {getTrafficLabel(station.traffic.spi)}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Descripción:</span> {station.traffic.traffic_state}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Confianza: {station.traffic.confidence_level}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Route visualization */}
        {data.route_data && (
          <>
            {/* Origin marker */}
            {data.route_data.origin_marker && (
              <Marker
                position={[
                  data.route_data.origin_marker.latitude,
                  data.route_data.origin_marker.longitude
                ]}
                icon={createCustomIcon('#4CAF50', 'O')}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-lg text-green-700">🚗 Origen</h3>
                    <p className="text-sm mt-1">{data.route_data.origin_marker.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.route_data.origin_marker.latitude.toFixed(4)}, {data.route_data.origin_marker.longitude.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Destination marker */}
            {data.route_data.destination_marker && (
              <Marker
                position={[
                  data.route_data.destination_marker.latitude,
                  data.route_data.destination_marker.longitude
                ]}
                icon={createCustomIcon('#F44336', 'D')}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-lg text-red-700">🏁 Destino</h3>
                    <p className="text-sm mt-1">{data.route_data.destination_marker.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.route_data.destination_marker.latitude.toFixed(4)}, {data.route_data.destination_marker.longitude.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Route polyline - Mapbox actual route geometry */}
            {(() => {
              const normalizedPolyline = normalizePolyline(data.route_data.route_polyline);
              return normalizedPolyline && normalizedPolyline.length > 0 && (
                <>
                  {/* Route outline for better visibility */}
                  <Polyline
                    positions={normalizedPolyline}
                    pathOptions={{
                      color: '#1565C0',
                      weight: 7,
                      opacity: 0.3
                    }}
                  />
                  {/* Main route line */}
                  <Polyline
                    positions={normalizedPolyline}
                    pathOptions={{
                      color: '#2196F3',
                      weight: 5,
                      opacity: 0.8,
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                  />
                </>
              );
            })()}

            {/* Traffic monitoring stations along route */}
            {data.route_data.intermediate_stations?.map((station, index) => (
              <CircleMarker
                key={`route-station-${station.id || index}`}
                center={[station.latitude, station.longitude]}
                radius={7}
                pathOptions={{
                  color: getColorFromSPI(station.spi),
                  fillColor: getColorFromSPI(station.spi),
                  fillOpacity: 0.9,
                  weight: 3,
                  stroke: true
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[220px]">
                    <h3 className="font-bold text-base">
                      📊 {station.name || `Estación ${station.id}`}
                    </h3>
                    <div className="mt-2 space-y-1">
                      {station.freeway && (
                        <p className="text-sm">
                          <span className="font-semibold">Autopista:</span> {station.freeway} {station.direction || ''}
                        </p>
                      )}
                      {station.spi !== undefined && (
                        <>
                          <p className="text-sm">
                            <span className="font-semibold">SPI:</span> {station.spi.toFixed(1)}
                          </p>
                          <p className="text-sm">
                            <span className="font-semibold">Estado:</span>{' '}
                            <span
                              className="px-2 py-1 rounded text-white text-xs"
                              style={{ backgroundColor: getColorFromSPI(station.spi) }}
                            >
                              {getTrafficLabel(station.spi)}
                            </span>
                          </p>
                        </>
                      )}
                      {station.traffic_state && (
                        <p className="text-sm">
                          <span className="font-semibold">Descripción:</span> {station.traffic_state}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Estación de monitoreo de tráfico
                      </p>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </>
        )}
      </MapContainer>

      {/* Legend */}
      <div className="bg-white px-3 py-2 border-t border-gray-300">
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <span className="font-semibold">Leyenda:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
            <span>Ubicación consultada</span>
          </div>
          {data.route_data && (
            <>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#4CAF50]"></div>
                <span>Origen</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#F44336]"></div>
                <span>Destino</span>
              </div>
              <div className="flex items-center gap-1">
                <div style={{width: '20px', height: '2px', backgroundColor: '#2196F3'}}></div>
                <span>Ruta</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#388E3C]"></div>
            <span>Fluido</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#FBC02D]"></div>
            <span>Moderado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#F57C00]"></div>
            <span>Congestionado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#D32F2F]"></div>
            <span>Muy congestionado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
