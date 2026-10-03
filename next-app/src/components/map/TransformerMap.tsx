'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { TransformerWithStatus } from '@/lib/domain/types';
import L from 'leaflet';
import { Navigation } from 'lucide-react';

interface MapProps {
  transformers: TransformerWithStatus[];
  onSelectTransformer: (t: TransformerWithStatus) => void;
  selectedPea?: string;
  filterMode: 'ALL' | 'RED' | 'ORANGE';
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function TransformerMap({
  transformers,
  onSelectTransformer,
  selectedPea,
  filterMode,
  isFullscreen = false,
  onToggleFullscreen,
}: MapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [locating, setLocating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);

  // References to keep Leaflet layers & GPS tracking state stable
  const mapRef = useRef<L.Map | null>(null);
  const transformersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const isFollowingRef = useRef<boolean>(true);
  const userCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const hasCenteredRef = useRef<boolean>(false);

  // Filter markers based on selection
  const filtered = transformers.filter(t => {
    if (!t.lat || !t.lng) return false;
    if (filterMode === 'RED') return t.statusColor === 'red';
    if (filterMode === 'ORANGE') return t.statusColor === 'orange';
    return true; // ALL
  });

  // Function to smoothly update user marker position (Google Maps blue dot + radar)
  const updateUserPosition = useCallback((pos: GeolocationPosition, forceFollow: boolean = false) => {
    const currentMap = mapRef.current;
    const userLayer = userLayerRef.current;
    if (!currentMap || !userLayer) return;

    const { latitude, longitude, accuracy, heading, speed } = pos.coords;
    userCoordsRef.current = { lat: latitude, lng: longitude };
    setLocating(false);
    setIsTracking(true);

    const speedKmH = speed !== null && speed > 0.5 ? Math.round(speed * 3.6) : null;
    const speedText = speedKmH ? ` • 🚗 ${speedKmH} กม./ชม.` : '';
    const tooltipText = `
      <div style="font-family: 'Prompt', sans-serif; font-size: 11px; font-weight: 700; color: #1e40af; text-align: center; padding: 2px;">
        📍 พิกัดของฉัน (±${Math.round(accuracy)} ม.)${speedText}
      </div>
    `;

    const hasHeading = typeof heading === 'number' && !isNaN(heading);
    const arrowStyle = hasHeading ? `transform: rotate(${heading}deg);` : '';

    const markerHtml = `
      <div class="pea-gps-marker">
        <div class="pea-gps-radar"></div>
        <div class="pea-gps-core"></div>
        ${hasHeading ? `<div class="pea-gps-arrow" style="${arrowStyle}"></div>` : ''}
      </div>
    `;

    const userIcon = L.divIcon({
      className: 'pea-user-gps-container',
      html: markerHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (!userMarkerRef.current) {
      // 1. Create moving user marker
      const marker = L.marker([latitude, longitude], {
        icon: userIcon,
        zIndexOffset: 2000, // Always above transformer pins
      });
      marker.bindTooltip(tooltipText, {
        permanent: false,
        direction: 'top',
        offset: [0, -14],
      });
      marker.addTo(userLayer);
      userMarkerRef.current = marker;

      // 2. Create accuracy circle
      const circle = L.circle([latitude, longitude], {
        radius: Math.max(accuracy, 5),
        color: '#3b82f6',
        weight: 1,
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
      }).addTo(userLayer);
      accuracyCircleRef.current = circle;
    } else {
      // Smooth update of existing marker
      userMarkerRef.current.setLatLng([latitude, longitude]);
      userMarkerRef.current.setIcon(userIcon);
      userMarkerRef.current.setTooltipContent(tooltipText);

      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([latitude, longitude]);
        accuracyCircleRef.current.setRadius(Math.max(accuracy, 5));
      }
    }

    // Auto-pan / follow if active
    if (forceFollow || isFollowingRef.current) {
      currentMap.panTo([latitude, longitude], { animate: true, duration: 0.8 });
    }
  }, []);

  // Start continuous watch tracking
  const startWatchingGps = useCallback((forceFollow: boolean = false) => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    if (watchIdRef.current !== null) return; // Already watching

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        updateUserPosition(pos, forceFollow);
      },
      err => {
        setLocating(false);
        console.warn('GPS watch error:', err.message);
        if (err.code === 1) {
          alert('กรุณาอนุญาตการเข้าถึงตำแหน่ง GPS เพื่อแสดงและติดตามพิกัดของคุณขณะขับรถ');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 12000,
      }
    );
    watchIdRef.current = watchId;
  }, [updateUserPosition]);

  // Initial Map Mount (Runs ONCE on component mount to prevent tile layer destruction)
  useEffect(() => {
    if (mapRef.current) return;

    const leafletMap = L.map('leaflet-map-container', {
      center: [19.1667, 99.9000],
      zoom: 12,
      zoomControl: false,
    });

    mapRef.current = leafletMap;

    // 1. Google Hybrid: Satellite imagery + road names & labels (High availability via multi-subdomain)
    const hybridLayer = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Google Hybrid',
      }
    );

    // 2. Google Maps: Clean road vector map
    const roadLayer = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Google Maps',
      }
    );

    // 3. Esri World Imagery (High-res Satellite Backup)
    const esriLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Esri Satellite',
      }
    );

    // 4. OpenStreetMap
    const osmLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: 'OpenStreetMap',
      }
    );

    // Default primary layer
    hybridLayer.addTo(leafletMap);

    // Tile switcher control at bottom right
    L.control.layers(
      {
        'ดาวเทียม (Google Hybrid)': hybridLayer,
        'แผนที่ถนน (Google Maps)': roadLayer,
        'ดาวเทียมสำรอง (Esri)': esriLayer,
        'แผนที่ถนน (OpenStreetMap)': osmLayer,
      },
      undefined,
      { position: 'bottomright' }
    ).addTo(leafletMap);

    // Dedicated Layers: Transformers & User GPS
    const transLayer = L.layerGroup().addTo(leafletMap);
    transformersLayerRef.current = transLayer;

    const userLayer = L.layerGroup().addTo(leafletMap);
    userLayerRef.current = userLayer;

    // Disengage camera follow on manual drag
    leafletMap.on('dragstart', () => {
      isFollowingRef.current = false;
      setIsFollowing(false);
    });

    setMap(leafletMap);

    // Background pre-check for GPS permission if already granted
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(res => {
        if (res.state === 'granted') {
          startWatchingGps(false);
        }
      }).catch(() => {});
    }

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      leafletMap.remove();
      mapRef.current = null;
    };
  }, [startWatchingGps]);

  // Update Transformer Markers on map (Isolated in transformersLayerRef so GPS pin stays intact)
  useEffect(() => {
    const transLayer = transformersLayerRef.current;
    if (!map || !transLayer) return;

    transLayer.clearLayers();

    // Smoothly center onto transformers on first data load
    if (!hasCenteredRef.current && filtered.length > 0) {
      const valid = filtered.filter(t => t.lat && t.lng);
      if (valid.length > 0) {
        const centerLat = valid.reduce((s, t) => s + t.lat!, 0) / valid.length;
        const centerLng = valid.reduce((s, t) => s + t.lng!, 0) / valid.length;
        map.setView([centerLat, centerLng], 12);
        hasCenteredRef.current = true;
      }
    }

    filtered.forEach(t => {
      if (!t.lat || !t.lng) return;

      const color =
        t.statusColor === 'red'
          ? '#e11d48' // Rose (uninspected)
          : t.statusColor === 'orange'
          ? '#f59e0b' // Amber (pending task)
          : '#059669'; // Emerald (done)

      const isSelected = t.peaNo === selectedPea;

      const marker = L.circleMarker([t.lat, t.lng], {
        radius: isSelected ? 11 : 6.5,
        fillColor: color,
        color: '#ffffff',
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
        fillOpacity: 0.92,
      });

      marker.on('click', () => {
        onSelectTransformer(t);
        map.flyTo([t.lat!, t.lng!], 15, { duration: 0.8 });
      });

      marker.addTo(transLayer);
    });
  }, [map, filtered, selectedPea, onSelectTransformer]);

  // GPS Locate Button Handler
  const handleLocateMe = () => {
    if (!map) return;
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('อุปกรณ์ของคุณไม่รองรับการระบุพิกัด GPS');
      return;
    }

    isFollowingRef.current = true;
    setIsFollowing(true);

    if (userCoordsRef.current) {
      // Already tracked -> smoothly center camera
      map.flyTo([userCoordsRef.current.lat, userCoordsRef.current.lng], 16, { duration: 0.8 });
    } else {
      setLocating(true);
      // Try one-shot quick fix immediately while watchPosition establishes
      navigator.geolocation.getCurrentPosition(
        pos => {
          updateUserPosition(pos, true);
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { duration: 1 });
        },
        err => {
          setLocating(false);
          alert('ไม่สามารถระบุพิกัด GPS ได้: ' + err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    // Ensure continuous watch is active
    if (watchIdRef.current === null) {
      startWatchingGps(true);
    }
  };

  // Invalidate map size on fullscreen change and window resize
  useEffect(() => {
    if (!map) return;
    const invalidate = () => {
      map.invalidateSize({ animate: false, pan: false });
    };
    invalidate();
    const t1 = setTimeout(invalidate, 60);
    const t2 = setTimeout(invalidate, 250);
    const t3 = setTimeout(invalidate, 600);
    window.addEventListener('resize', invalidate);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', invalidate);
    };
  }, [map, isFullscreen]);

  return (
    <div className="relative w-full h-full min-h-[460px]">
      <div
        id="leaflet-map-container"
        className={`w-full h-full min-h-[460px] ${isFullscreen ? 'rounded-none' : 'rounded-2xl'}`}
      />
      
      {/* Real-time GPS Location & Tracking Button */}
      <button
        type="button"
        onClick={handleLocateMe}
        disabled={locating}
        className={`absolute top-3 left-3 z-[400] backdrop-blur-md py-1.5 px-2.5 rounded-xl border shadow-md flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
          isTracking && isFollowing
            ? 'bg-sky-50/95 border-sky-300 text-sky-800 shadow-sky-100'
            : isTracking
            ? 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-50'
            : 'bg-white/95 border-slate-200/90 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50'
        }`}
        title="ระบุตำแหน่งและติดตามพิกัด GPS สดของฉัน"
      >
        <Navigation
          className={`w-3.5 h-3.5 ${
            locating
              ? 'text-sky-600 animate-spin'
              : isTracking && isFollowing
              ? 'text-sky-600 fill-sky-600 animate-pulse'
              : isTracking
              ? 'text-sky-600 fill-sky-600'
              : 'text-emerald-600 fill-emerald-600'
          }`}
        />
        <span className="text-[11px] font-semibold text-slate-800">
          {locating
            ? 'กำลังค้นหา GPS...'
            : isTracking && isFollowing
            ? 'ติดตาม GPS สด'
            : isTracking
            ? 'กลับสู่พิกัดฉัน'
            : 'พิกัดของฉัน'}
        </span>
        {isTracking && (
          <span className="flex h-2 w-2 relative ml-0.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isFollowing ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isFollowing ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
        )}
      </button>
    </div>
  );
}

