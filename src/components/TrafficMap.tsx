'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

function getTrafficLabel(spi?: number): string {
  if (!spi) return 'Sin datos';
  if (spi >= 75) return 'Fluido';
  if (spi >= 50) return 'Moderado';
  if (spi >= 25) return 'Congestionado';
  return 'Muy congestionado';
}

export function TrafficMap({ data }: TrafficMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
      </MapContainer>

      {/* Legend */}
      <div className="bg-white px-3 py-2 border-t border-gray-300">
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <span className="font-semibold">Leyenda:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
            <span>Ubicación consultada</span>
          </div>
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
