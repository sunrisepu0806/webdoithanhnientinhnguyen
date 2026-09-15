'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import 'leaflet/dist/leaflet.css';

// Dynamic import các component Leaflet (bắt buộc tắt SSR)
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

export interface LocationItem {
  id: number | string;
  ten: string;
  toaDo: [number, number];
  moTa: string;
  thoiGian?: string;
  hinhAnh: string;
  linkUrl?: string;
  slug?: string;
}

const GroupedPopupContent = ({ items }: { items: LocationItem[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const safeIndex = currentIndex % Math.max(items.length, 1);
  const currentItem = items[safeIndex];

  if (!currentItem) return null;

  const targetUrl = currentItem.linkUrl || `/nhat-ky/${currentItem.slug || currentItem.id}`;
  const isExternal = targetUrl.startsWith('http');

  return (
    <div className="w-[270px] overflow-hidden rounded-2xl bg-white font-sans text-slate-800 shadow-xl">
      {items.length > 1 && (
        <div className="flex items-center justify-between bg-slate-900 px-3.5 py-2 text-xs font-bold text-white select-none">
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            {items.length} hoạt động tại đây
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
              }}
              className="rounded p-1 transition hover:bg-slate-700 active:scale-95 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-mono text-[11px] text-slate-300">
              {safeIndex + 1}/{items.length}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
              }}
              className="rounded p-1 transition hover:bg-slate-700 active:scale-95 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="relative h-36 w-full overflow-hidden bg-slate-100">
        <img
          src={currentItem.hinhAnh || '/anh1.jpg'}
          alt={currentItem.ten}
          loading="lazy"
          decoding="async"
          width={270}
          height={144}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
      </div>

      <div className="space-y-2 p-4">
        <h4 className="m-0 text-sm font-black leading-snug tracking-tight text-slate-900 line-clamp-2">
          {currentItem.ten}
        </h4>

        {currentItem.thoiGian && (
          <p className="m-0 flex items-center gap-1 text-[11px] font-bold text-[#0284c7]">
            <span>🗓️</span> {currentItem.thoiGian}
          </p>
        )}

        <p className="m-0 text-xs leading-relaxed text-slate-600 line-clamp-2">
          {currentItem.moTa}
        </p>

        <div className="pt-2">
          <a
            href={targetUrl}
            target={isExternal ? '_blank' : '_self'}
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0284c7] py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-600 hover:shadow-sky-500/30 active:scale-95 cursor-pointer"
            style={{ color: '#ffffff', textDecoration: 'none' }}
          >
            <span>Xem chi tiết {items.length > 1 ? `(${safeIndex + 1}/${items.length})` : ''}</span>
            <span className="text-sm font-bold">&rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default function NhatKyPage() {
  const [leafletLib, setLeafletLib] = useState<typeof import('leaflet') | null>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);

  const iconCache = useRef(new Map<number, import('leaflet').DivIcon>());

  useEffect(() => {
    let active = true;
    import('leaflet').then((L) => {
      if (active) setLeafletLib(L);
    }).catch((error) => console.error('Không thể tải bản đồ:', error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    // Nhận cập nhật khi dữ liệu thay đổi, không tải lại mỗi 10 giây.
    return onSnapshot(collection(db, 'locations'), (snapshot) => {
      const list: LocationItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!Array.isArray(data.toaDo) || data.toaDo.length < 2) return;
        const lat = Number(data.toaDo[0]);
        const lng = Number(data.toaDo[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
            Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
        list.push({
          id: docSnap.id,
          ten: data.ten || '',
          toaDo: [lat, lng],
          moTa: data.moTa || '',
          thoiGian: data.thoiGian || '',
          hinhAnh: data.hinhAnh || '/anh1.jpg',
          linkUrl: data.linkUrl || '',
          slug: data.slug || docSnap.id,
        });
      });
      setLocations((previous) => {
        // Giữ reference cho bản ghi không đổi và bỏ qua snapshot trùng.
        const byId = new Map(previous.map((item) => [item.id, item]));
        const next = list.map((item) => {
          const old = byId.get(item.id);
          return old && JSON.stringify(old) === JSON.stringify(item) ? old : item;
        });
        return previous.length === next.length &&
          previous.every((item, index) => item === next[index]) ? previous : next;
      });
    }, (error) => console.error('Lỗi khi tải locations từ Firebase:', error));
  }, []);

  const groupedLocations = useMemo(() => {
    const groups: { [key: string]: { toaDo: [number, number]; items: LocationItem[] } } = {};

    locations.forEach((loc) => {
      if (!loc.toaDo || loc.toaDo.length < 2) return;
      const key = `${loc.toaDo[0].toFixed(4)}_${loc.toaDo[1].toFixed(4)}`;
      if (!groups[key]) {
        groups[key] = {
          toaDo: loc.toaDo,
          items: [],
        };
      }
      groups[key].items.push(loc);
    });

    return Object.values(groups);
  }, [locations]);

  // Marker Icon tối ưu vị trí popupAnchor cách xa đỉnh logo
  const createMarkerIcon = (count: number = 1) => {
    if (!leafletLib) return undefined;

    const cached = iconCache.current.get(count);
    if (cached) return cached;
    const icon = leafletLib.divIcon({
      className: 'custom-logo-marker-clean',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: transparent; border: none;">
          <div style="width: 42px; height: 42px; border-radius: 50%; background: #ffffff; padding: 2px; box-shadow: 0 0 0 2px #0284c7; display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease;">
            <img src="/logo.png" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%; display: block;" />
          </div>
          ${
            count > 1
              ? `<span style="position: absolute; top: -3px; right: -3px; background: #e11d48; color: #ffffff; font-size: 11px; font-weight: 900; font-family: sans-serif; min-width: 20px; height: 20px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); padding: 0 4px; box-sizing: border-box; z-index: 5;">${count}</span>`
              : ''
          }
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -30], // Tách rời mũi nhọn popup lên phía trên logo
    });
    iconCache.current.set(count, icon);
    return icon;
  };

  return (
    <div className="flex flex-col select-none font-sans overflow-x-hidden min-h-screen" suppressHydrationWarning>
      <style jsx global>{`
        @keyframes auroraMove {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.45; }
          50% { transform: translate(30px, -20px) scale(1.15); opacity: 0.75; }
        }
        @keyframes waveMoveFront {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes waveMoveBack {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-aurora-glow { animation: auroraMove 12s ease-in-out infinite alternate; }
        .animate-wave-front { display: flex; width: 200%; animation: waveMoveFront 13s linear infinite; }
        .animate-wave-back { display: flex; width: 200%; animation: waveMoveBack 21s linear infinite; }

        @media (max-width: 640px), (prefers-reduced-motion: reduce) {
          .animate-wave-front, .animate-wave-back { animation: none; }
          .custom-volunteer-popup .animate-pulse { animation: none; }
        }

        /* POPUP STYLE */
        .custom-volunteer-popup .leaflet-popup-content-wrapper {
          padding: 0 !important;
          border-radius: 20px !important;
          overflow: hidden !important;
          box-shadow: 0 20px 30px -5px rgba(2, 132, 199, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.08) !important;
        }
        .custom-volunteer-popup .leaflet-popup-content { margin: 0 !important; line-height: inherit !important; }
        .custom-volunteer-popup .leaflet-popup-tip { background: white !important; }
        .custom-logo-marker-clean { background: transparent !important; border: none !important; }
      `}</style>

      <div
        className="relative min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#f3f7fd] via-[#f7fafd] to-white overflow-hidden cursor-default flex-1"
      >


        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(#0284c7 1.5px, transparent 1.5px)',
            backgroundSize: '30px 30px',
          }}
        />

        <div className="pointer-events-none absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 10% 10%, rgba(125,211,252,.22), transparent 50%), radial-gradient(ellipse at 90% 45%, rgba(165,180,252,.18), transparent 50%)',
        }} />

        <div className="relative z-20 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 pt-8 pb-12 flex-1 flex flex-col justify-center">
          {/* TIÊU ĐỀ SECTION */}
          <div className="mb-6 space-y-3 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0284c7]">
              DẤU ẤN THANH XUÂN TÌNH NGUYỆN
            </h1>
            <p className="mx-auto max-w-2xl text-xs sm:text-sm text-slate-600">
              Khám phá các điểm đến, chiến dịch tình nguyện và hành trình lan tỏa yêu thương của Đội TNTN QNU trên khắp mọi nẻo đường.
            </p>
          </div>

          <div className="relative h-[480px] sm:h-[540px] md:h-[620px] w-full overflow-hidden rounded-[28px] sm:rounded-[36px] border-4 border-white bg-slate-100 shadow-2xl shadow-sky-950/15">
            {leafletLib && (
              <MapContainer
                center={[13.7594, 109.12]}
                zoom={9}
                scrollWheelZoom={false}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  updateWhenIdle={true}
                  updateWhenZooming={false}
                  keepBuffer={2}
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {groupedLocations.map((group) => (
                  <Marker
                    key={`${group.toaDo[0].toFixed(4)}_${group.toaDo[1].toFixed(4)}`}
                    position={group.toaDo}
                    icon={createMarkerIcon(group.items.length)}
                  >
                    <Popup className="custom-volunteer-popup" minWidth={270} maxWidth={280}>
                      <GroupedPopupContent items={group.items} />
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {/* DẢI SÓNG BIỂN CHÂN TRANG */}
        <div className="pointer-events-none relative z-20 h-10 sm:h-14 md:h-20 w-full shrink-0 overflow-hidden leading-none">
          <div className="absolute inset-0 animate-wave-back opacity-60">
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2">
              <path d="M0,30 C320,65 420,10 720,25 C1020,40 1140,55 1440,30 L1440,90 L0,90 Z" fill="#dbeafe" />
            </svg>
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2">
              <path d="M0,30 C320,65 420,10 720,25 C1020,40 1140,55 1440,30 L1440,90 L0,90 Z" fill="#dbeafe" />
            </svg>
          </div>

          <div className="absolute inset-0 animate-wave-front opacity-85">
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2">
              <path d="M0,50 C360,75 500,35 800,45 C1100,55 1250,70 1440,50 L1440,90 L0,90 Z" fill="#bfdbfe" />
            </svg>
            <svg viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" className="block h-full w-1/2">
              <path d="M0,50 C360,75 500,35 800,45 C1100,55 1250,70 1440,50 L1440,90 L0,90 Z" fill="#bfdbfe" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}