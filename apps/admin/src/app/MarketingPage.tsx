'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  DollarSign, Heart, MapPin, Radio, Banknote, LifeBuoy,
  Wallet, BarChart3, Gift, ShieldCheck, Star, Clock,
  Zap, ClipboardList, Users, Car, User,
  Mail, Phone, MessageCircle,
  Menu, X, AtSign, Camera, BriefcaseBusiness,
  Apple, Play, Send, MapPinned, Handshake,
  Navigation, Crosshair, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import s from './marketing.module.css';

/* ── Types ── */
interface MarketingContent { [section: string]: any }
interface FareEstimate {
  type: string;
  base_fare: number;
  distance_fare: number;
  time_fare: number;
  surge_multiplier: number;
  subtotal: number;
  platform_fee: number;
  total: number;
}

/* ── Icon maps ── */
const RIDER_ICONS = [DollarSign, Heart, MapPinned, Radio, Banknote, LifeBuoy];
const RIDER_COLORS = ['#FF6B00', '#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#EC4899'];
const DRIVER_ICONS = [Wallet, BarChart3, Gift, ShieldCheck, Star, Clock];
const DRIVER_COLORS = ['#FF6B00', '#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#EC4899'];
const STEP_COLORS = ['#FF6B00', '#3B82F6', '#10B981'];

/* Card gradient tints — inline because CSS Modules + nth-child is unreliable */
const FEATURE_CARD_STYLES = [
  { background: 'linear-gradient(145deg, rgba(255,107,0,0.14) 0%, rgba(255,107,0,0.03) 70%)', borderColor: 'rgba(255,107,0,0.2)' },
  { background: 'linear-gradient(145deg, rgba(168,85,247,0.14) 0%, rgba(168,85,247,0.03) 70%)', borderColor: 'rgba(168,85,247,0.2)' },
  { background: 'linear-gradient(145deg, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0.03) 70%)', borderColor: 'rgba(59,130,246,0.2)' },
  { background: 'linear-gradient(145deg, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.03) 70%)', borderColor: 'rgba(16,185,129,0.2)' },
  { background: 'linear-gradient(145deg, rgba(245,158,11,0.14) 0%, rgba(245,158,11,0.03) 70%)', borderColor: 'rgba(245,158,11,0.2)' },
  { background: 'linear-gradient(145deg, rgba(236,72,153,0.14) 0%, rgba(236,72,153,0.03) 70%)', borderColor: 'rgba(236,72,153,0.2)' },
];
const STEP_CARD_STYLES = [
  { background: 'linear-gradient(145deg, rgba(255,107,0,0.14) 0%, rgba(255,107,0,0.03) 60%, transparent 100%)', borderColor: 'rgba(255,107,0,0.2)' },
  { background: 'linear-gradient(145deg, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0.03) 60%, transparent 100%)', borderColor: 'rgba(59,130,246,0.2)' },
  { background: 'linear-gradient(145deg, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.03) 60%, transparent 100%)', borderColor: 'rgba(16,185,129,0.2)' },
];
const ABOUT_ICONS = [Zap, ClipboardList, Users];
const SOCIAL_ICONS: Record<string, typeof AtSign> = { twitter: AtSign, instagram: Camera, linkedin: BriefcaseBusiness };

const RIDE_TYPE_META: Record<string, { label: string; icon: typeof Car; desc: string }> = {
  standard: { label: 'Standard', icon: Car, desc: 'Affordable everyday rides' },
  xl: { label: 'XL', icon: Users, desc: 'Extra space for groups' },
  luxury: { label: 'Luxury', icon: Star, desc: 'Premium vehicles' },
  electric: { label: 'Electric', icon: Zap, desc: 'Eco-friendly rides' },
};

/* ── Defaults ── */
const DEFAULTS: MarketingContent = {
  header: { logo_text: 'Styl', nav_links: [{ label: 'About', anchor: 'about' }, { label: 'Riders', anchor: 'riders' }, { label: 'Drivers', anchor: 'drivers' }, { label: 'Contact', anchor: 'contact' }], cta_text: 'Get the App', cta_url: '#download' },
  hero: { title: 'Rides that actually make sense', subtitle: 'The rideshare platform where drivers keep every dollar they earn. No commission cuts, no surprises. Just fair rides and honest pay. Built for people who believe transparency and respect should be the standard — not the exception. Whether you ride or drive, Styl puts you first.', cta_primary: 'Ride with Styl', cta_secondary: 'Drive with Styl', image_url: '' },
  about: { heading: 'Built different, on purpose', text: 'Most rideshare platforms take 25 to 40 percent of every fare. We thought that was broken. Styl runs on a simple driver subscription model, which means the person behind the wheel actually gets paid what they deserve. Riders get better service because drivers are happier. Everyone wins.', features: [{ title: 'Zero commission', desc: 'Drivers keep 100% of every fare they earn' }, { title: 'Flat subscription', desc: 'Drivers pay a predictable weekly fee instead of per-ride cuts' }, { title: 'Better for everyone', desc: 'Happy drivers means better rides for passengers' }], image_url: '' },
  how_it_works: { heading: 'Getting around has never been simpler', steps: [{ number: '01', title: 'Book your ride', desc: 'Enter your destination, add stops if you need them, and see your fare upfront. No hidden fees.' }, { number: '02', title: 'Get matched instantly', desc: 'Our matching engine finds the best driver near you. Got a favorite? They get priority.' }, { number: '03', title: 'Ride and go', desc: 'Track your driver in real time, ride safely with GPS verification, and pay seamlessly through the app.' }] },
  riders: { heading: 'Why riders choose Styl', subtitle: 'Built around what actually matters to you', features: [{ title: 'Transparent pricing', desc: 'See your exact fare before you book. What you see is what you pay.' }, { title: 'Favorite drivers', desc: 'Save drivers you love and get matched with them first on future rides.' }, { title: 'Multi-stop rides', desc: 'Need to grab coffee, drop a friend off, then head home? One ride, multiple stops.' }, { title: 'Real-time tracking', desc: 'Watch your driver approach and share your trip with anyone for peace of mind.' }, { title: 'Tip directly', desc: '100% of your tip goes straight to the driver. Every single cent.' }, { title: '24/7 support', desc: 'Something off? Our support team responds fast, not with bots.' }], image_url: '' },
  drivers: { heading: 'Why drivers switch to Styl', subtitle: 'Your time. Your car. Your money.', features: [{ title: 'Keep 100% of fares', desc: 'No commission. No per-ride fees. Every dollar your rider pays goes to you.' }, { title: 'Predictable costs', desc: 'One flat weekly subscription. Know your costs before you start driving.' }, { title: 'Tips are yours', desc: 'Riders tip often because they know you are not getting squeezed. And you keep all of it.' }, { title: 'Fair matching', desc: 'GPS-verified pickups and dropoffs. No fake rides, no abuse.' }, { title: 'Build your regulars', desc: 'The favorites system means loyal riders find you again and again.' }, { title: 'Drive on your terms', desc: 'Go online when you want, offline when you do not. No minimum hours.' }], image_url: '' },
  cta: { heading: 'Ready to ride different?', subtitle: 'Download Styl and join the rideshare platform that puts people first.', app_store_url: '#', play_store_url: '#' },
  contact: { heading: 'Get in touch', subtitle: 'Questions, partnerships, or just want to say hey. We are real people and we respond.', email: 'hello@ridestyl.com', phone: '', address: '' },
  footer: { tagline: 'The rideshare platform where everyone wins.', copyright: '2026 Styl. All rights reserved.', social: [{ platform: 'twitter', url: '#' }, { platform: 'instagram', url: '#' }, { platform: 'linkedin', url: '#' }] },
};

/* ══════════════════════════════════════════════
   Google Maps dark style
   ══════════════════════════════════════════════ */
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#555555' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#333333' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e0e' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

/* ══════════════════════════════════════════════
   Fare Estimator — Hero version with Map
   ══════════════════════════════════════════════ */
function HeroFareEstimator({ heading }: { heading?: string }) {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedType, setSelectedType] = useState('standard');
  const [error, setError] = useState('');
  const [cityName, setCityName] = useState('');
  const pickupRef = useRef<HTMLInputElement>(null);
  const dropoffRef = useRef<HTMLInputElement>(null);
  const pickupAcRef = useRef<google.maps.places.Autocomplete | null>(null);
  const dropoffAcRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      setMapsLoaded(true);
      return;
    }
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry`;
    script.async = true;
    script.onload = () => setMapsLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Auto-detect city on load
  useEffect(() => {
    if (!mapsLoaded) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const geocoder = new google.maps.Geocoder();
            const res = await geocoder.geocode({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
            if (res.results) {
              const cityResult = res.results.find(r =>
                r.types.includes('locality') || r.types.includes('administrative_area_level_1')
              );
              if (cityResult) {
                const city = cityResult.address_components.find(c => c.types.includes('locality'))?.long_name || '';
                const country = cityResult.address_components.find(c => c.types.includes('country'))?.short_name || '';
                if (city && country) setCityName(`${city}, ${country}`);
              }
            }
          } catch { /* silent */ }
        },
        () => { /* silent - no permission */ },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, [mapsLoaded]);

  // Init autocomplete
  useEffect(() => {
    if (!mapsLoaded) return;
    if (pickupRef.current && !pickupAcRef.current) {
      pickupAcRef.current = new google.maps.places.Autocomplete(pickupRef.current, {
        types: ['geocode', 'establishment'],
        fields: ['formatted_address', 'geometry'],
      });
      pickupAcRef.current.addListener('place_changed', () => {
        const place = pickupAcRef.current?.getPlace();
        if (place?.formatted_address) setPickup(place.formatted_address);
      });
    }
    if (dropoffRef.current && !dropoffAcRef.current) {
      dropoffAcRef.current = new google.maps.places.Autocomplete(dropoffRef.current, {
        types: ['geocode', 'establishment'],
        fields: ['formatted_address', 'geometry'],
      });
      dropoffAcRef.current.addListener('place_changed', () => {
        const place = dropoffAcRef.current?.getPlace();
        if (place?.formatted_address) setDropoff(place.formatted_address);
      });
    }
  }, [mapsLoaded]);

  // Init map
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: 38.9072, lng: -77.0369 },
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: false,
      styles: DARK_MAP_STYLE,
      backgroundColor: '#111',
    });
  }, [mapsLoaded]);

  // Draw polyline + markers when result comes in
  useEffect(() => {
    if (!result || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear old
    if (polylineRef.current) polylineRef.current.setMap(null);
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Decode polyline
    if (result.polyline && google.maps.geometry) {
      const path = google.maps.geometry.encoding.decodePath(result.polyline);
      polylineRef.current = new google.maps.Polyline({
        path,
        strokeColor: '#FF6B00',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      });

      // Fit bounds
      const bounds = new google.maps.LatLngBounds();
      path.forEach(p => bounds.extend(p));
      map.fitBounds(bounds, 40);
    }

    // Pickup marker (white circle)
    if (result.pickup_location) {
      const pickupMarker = new google.maps.Marker({
        position: result.pickup_location,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#FFFFFF',
          fillOpacity: 1,
          strokeColor: '#0A0A0A',
          strokeWeight: 2,
        },
      });
      markersRef.current.push(pickupMarker);
    }

    // Dropoff marker (orange square)
    if (result.dropoff_location) {
      const dropoffMarker = new google.maps.Marker({
        position: result.dropoff_location,
        map,
        icon: {
          path: 'M -5 -5 L 5 -5 L 5 5 L -5 5 Z',
          fillColor: '#FF6B00',
          fillOpacity: 1,
          strokeColor: '#0A0A0A',
          strokeWeight: 2,
          scale: 1.2,
        },
      });
      markersRef.current.push(dropoffMarker);
    }
  }, [result]);

  // Use current location
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          if ((window as any).google?.maps) {
            const geocoder = new google.maps.Geocoder();
            const res = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
            if (res.results?.[0]) {
              setPickup(res.results[0].formatted_address);
              if (pickupRef.current) pickupRef.current.value = res.results[0].formatted_address;
            } else {
              setPickup(`${latitude.toFixed(6)},${longitude.toFixed(6)}`);
            }
          } else {
            setPickup(`${latitude.toFixed(6)},${longitude.toFixed(6)}`);
          }
        } catch {
          setError('Could not determine your address.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setError('Location access denied. Please allow location or type an address.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const estimateFare = async () => {
    if (!pickup || !dropoff) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/estimate-fare?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to estimate');
      setResult(data);
      setSelectedType('standard');
    } catch (err: any) {
      setError(err.message || 'Could not estimate fare');
    } finally {
      setLoading(false);
    }
  };

  const selected = result?.estimates?.find((e: FareEstimate) => e.type === selectedType);
  const hasSurge = selected && selected.surge_multiplier > 1;

  return (
    <div className={s.heroFareEstimator}>
      <div className={s.heroFareCard}>
        <div className={s.heroFareHeader}>
          <div className={s.heroFareTitle}>{heading || 'Go anywhere with STYL'}</div>
          {cityName && (
            <div className={s.heroFareCity}>
              <MapPin size={12} />
              {cityName}
            </div>
          )}
        </div>

        <div className={s.fareInputGroup}>
          <div className={s.fareInputRow}>
            <div className={`${s.fareInputDot} ${s.fareInputDotPickup}`} />
            <div className={s.fareInputLine} />
            <input
              ref={pickupRef}
              className={s.fareInput}
              placeholder="Pickup location"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
            />
            <button
              type="button"
              className={s.fareLocateBtn}
              onClick={useCurrentLocation}
              disabled={locating}
              title="Use current location"
            >
              <Crosshair size={16} className={locating ? s.fareLocateSpin : ''} />
            </button>
          </div>
          <div className={s.fareInputRow}>
            <div className={`${s.fareInputDot} ${s.fareInputDotDrop}`} />
            <input
              ref={dropoffRef}
              className={s.fareInput}
              placeholder="Where to?"
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
            />
          </div>
        </div>
        <button type="button" className={s.fareBtn} onClick={estimateFare} disabled={loading || !pickup || !dropoff}>
          {loading ? 'Estimating...' : 'See prices'}
        </button>

        {error && <p className={s.fareError}>{error}</p>}

        {/* Map */}
        <div className={s.heroMapWrap}>
          {mapsLoaded ? (
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          ) : (
            <div className={s.heroMapPlaceholder}>
              <MapPin size={24} />
              <span>Map loading...</span>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className={s.fareResult}>
            <button
              type="button"
              className={s.fareCloseBtn}
              onClick={() => {
                setResult(null);
                setPickup('');
                setDropoff('');
                setError('');
                // Clear map markers & polyline
                markersRef.current.forEach(m => m.setMap(null));
                markersRef.current = [];
                if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
              }}
              title="Close estimate"
            >
              <X size={16} />
              <span>New estimate</span>
            </button>

            <div className={s.fareRouteInfo}>
              <div className={s.fareRouteItem}>
                <Navigation size={14} />
                <span>{result.distance}</span>
              </div>
              <div className={s.fareRouteItem}>
                <Clock size={14} />
                <span>{result.duration}</span>
              </div>
            </div>

            <div className={s.fareTypes}>
              {result.estimates.map((est: FareEstimate) => {
                const meta = RIDE_TYPE_META[est.type] || { label: est.type, icon: Car, desc: '' };
                const Icon = meta.icon;
                const isActive = selectedType === est.type;
                const isSurge = est.surge_multiplier > 1;
                return (
                  <button
                    type="button"
                    key={est.type}
                    className={`${s.fareTypeCard} ${isActive ? s.fareTypeCardActive : ''}`}
                    onClick={() => setSelectedType(est.type)}
                  >
                    <div className={s.fareTypeIcon}><Icon size={20} /></div>
                    <div className={s.fareTypeName}>{meta.label}</div>
                    <div className={s.fareTypePrice}>
                      ${est.total.toFixed(2)}
                      {isSurge && <span className={s.fareSurgeBadge}>{est.surge_multiplier}x</span>}
                    </div>
                    <div className={s.fareTypeDesc}>{meta.desc}</div>
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className={s.fareBreakdown}>
                {hasSurge && (
                  <div className={s.fareSurgeNotice}>
                    <AlertTriangle size={14} />
                    <span>Surge pricing active ({selected.surge_multiplier}x) due to high demand</span>
                  </div>
                )}
                <div className={s.fareBreakdownRow}>
                  <span>Base fare</span>
                  <span>${selected.base_fare.toFixed(2)}</span>
                </div>
                <div className={s.fareBreakdownRow}>
                  <span>Distance</span>
                  <span>${selected.distance_fare.toFixed(2)}</span>
                </div>
                <div className={s.fareBreakdownRow}>
                  <span>Time</span>
                  <span>${selected.time_fare.toFixed(2)}</span>
                </div>
                {hasSurge && (
                  <div className={`${s.fareBreakdownRow} ${s.fareBreakdownSurge}`}>
                    <span>Surge ({selected.surge_multiplier}x)</span>
                    <span>applied</span>
                  </div>
                )}
                <div className={s.fareBreakdownTotal}>
                  <span>Estimated total</span>
                  <span>${selected.total.toFixed(2)}</span>
                </div>
              </div>
            )}

            <p className={s.fareResultNote}>Estimates based on current rates. Actual fare may vary with traffic, route, and demand.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Waitlist Modal
   ══════════════════════════════════════════════ */
function WaitlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', type: 'rider' as 'rider' | 'driver' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error' | 'duplicate'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setStatus('idle');
      setErrorMsg('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 409) { setStatus('duplicate'); return; }
      if (!res.ok) throw new Error(data.error || 'Failed');
      setStatus('done');
      setForm({ name: '', email: '', type: 'rider' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong.');
      setStatus('error');
    }
  };

  if (!open) return null;

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={s.modalClose} onClick={onClose}><X size={20} /></button>

        {status === 'done' ? (
          <div className={s.modalSuccess}>
            <CheckCircle2 size={48} className={s.modalSuccessIcon} />
            <h3 className={s.modalSuccessTitle}>You&apos;re on the list</h3>
            <p className={s.modalSuccessText}>
              We&apos;ll notify you as soon as STYL launches. Check your inbox for a confirmation.
            </p>
            <button className={s.modalDoneBtn} onClick={onClose}>Got it</button>
          </div>
        ) : (
          <>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Coming Soon</h2>
              <p className={s.modalSubtitle}>
                STYL is currently in development and will be available on the App Store and Google Play soon.
                Join the waitlist for early access.
              </p>
            </div>

            <form className={s.modalForm} onSubmit={handleSubmit}>
              <div className={s.modalField}>
                <label className={s.modalLabel}>Name</label>
                <input
                  className={s.modalInput}
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className={s.modalField}>
                <label className={s.modalLabel}>Email</label>
                <input
                  className={s.modalInput}
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className={s.modalField}>
                <label className={s.modalLabel}>I want to</label>
                <div className={s.modalTypeToggle}>
                  <button
                    type="button"
                    className={`${s.modalTypeBtn} ${form.type === 'rider' ? s.modalTypeBtnActive : ''}`}
                    onClick={() => setForm({ ...form, type: 'rider' })}
                  >
                    <User size={16} />
                    Ride with STYL
                  </button>
                  <button
                    type="button"
                    className={`${s.modalTypeBtn} ${form.type === 'driver' ? s.modalTypeBtnActive : ''}`}
                    onClick={() => setForm({ ...form, type: 'driver' })}
                  >
                    <Car size={16} />
                    Drive with STYL
                  </button>
                </div>
              </div>

              {status === 'duplicate' && (
                <p className={s.modalInfo}>You&apos;re already on the waitlist! We&apos;ll be in touch.</p>
              )}
              {status === 'error' && (
                <p className={s.modalError}>{errorMsg}</p>
              )}

              <button
                className={s.modalSubmitBtn}
                type="submit"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Joining...' : 'Join the Waitlist'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════
   Main Component
   ══════════════════════════ */
export default function MarketingPage() {
  const [content, setContent] = useState<MarketingContent>(DEFAULTS);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/marketing-content');
        const sections = await res.json();
        if (Array.isArray(sections) && sections.length > 0) {
          const map: MarketingContent = { ...DEFAULTS };
          for (const row of sections) {
            if (row.section === 'stats') continue;
            const merged = { ...DEFAULTS[row.section], ...row.content };
            if (row.section === 'header') merged.nav_links = DEFAULTS.header.nav_links;
            if (row.section === 'footer') delete merged.links;
            map[row.section] = merged;
          }
          setContent(map);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add(s.visible); }); },
      { threshold: 0.05, rootMargin: '0px 0px -60px 0px' }
    );
    document.querySelectorAll(`.${s.fadeIn}`).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [content]);

  const scrollTo = useCallback((anchor: string) => {
    setMobileOpen(false);
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setContactStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      if (!res.ok) throw new Error();
      setContactStatus('sent');
      setContactForm({ name: '', email: '', phone: '', message: '' });
    } catch {
      setContactStatus('error');
    }
  };

  const { hero, header, about, how_it_works: howItWorks, riders, drivers, cta, contact, footer, fare_estimator: fareConfig } = content;

  return (
    <div className={s.page}>
      {/* ── HEADER ── */}
      <header className={`${s.header} ${scrolled ? s.headerScrolled : ''}`}>
        <div className={s.headerInner}>
          <button className={s.logo} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo.svg" alt="STYL" className={s.logoIcon} />
          </button>
          <nav className={s.nav}>
            {(header.nav_links || []).map((link: any) => (
              <button key={link.anchor} className={s.navLink} onClick={() => scrollTo(link.anchor)}>{link.label}</button>
            ))}
            <button className={s.navCta} onClick={() => setWaitlistOpen(true)}>{header.cta_text}</button>
          </nav>
          <button className={s.mobileMenuBtn} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <div className={`${s.mobileMenu} ${mobileOpen ? s.mobileMenuOpen : ''}`}>
        {(header.nav_links || []).map((link: any, i: number) => (
          <button key={link.anchor} className={s.mobileNavLink} onClick={() => scrollTo(link.anchor)} style={{ transitionDelay: `${i * 50}ms` }}>
            {link.label}
          </button>
        ))}
        <button className={s.mobileCta} onClick={() => { setMobileOpen(false); setWaitlistOpen(true); }}>{header.cta_text}</button>
      </div>

      {/* ── HERO with Fare Estimator ── */}
      <section className={s.hero}>
        <div className={s.heroGlow} />
        <div className={s.heroGlow2} />
        <div className={s.heroInner}>
          <div className={s.heroContent}>
            <h1 className={s.heroTitle}>
              {hero.title.split('.')[0]}.
              {hero.title.split('.').length > 1 && (
                <> <span className={s.heroTitleAccent}>{hero.title.split('.').slice(1).join('.').trim()}</span></>
              )}
            </h1>
            <p className={s.heroSubtitle}>{hero.subtitle}</p>
            <div className={s.heroCtas}>
              <button className={s.heroCtaPrimary} onClick={() => setWaitlistOpen(true)}>{hero.cta_primary}</button>
              <button className={s.heroCtaSecondary} onClick={() => setWaitlistOpen(true)}>{hero.cta_secondary}</button>
            </div>
          </div>

          <HeroFareEstimator heading={fareConfig?.heading} />
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className={`${s.section} ${s.fadeIn}`}>
        <div className={s.sectionInner}>
          <div className={s.sectionTag}>About Styl</div>
          <h2 className={s.sectionHeading}>{about.heading}</h2>
          <div className={s.aboutGrid}>
            <div className={s.aboutImageWrap}>
              {about.image_url ? (
                <img src={about.image_url} alt="About Styl" className={s.aboutImage} />
              ) : (
                <div className={s.aboutImagePlaceholder}>
                  <Car size={40} strokeWidth={1.5} />
                  <span>Upload from Admin &rarr; Marketing</span>
                </div>
              )}
            </div>
            <div>
              <p className={s.aboutText}>{about.text}</p>
              <div className={s.aboutFeatures}>
                {(about.features || []).map((feat: any, i: number) => {
                  const Icon = ABOUT_ICONS[i] || Zap;
                  return (
                    <div key={i} className={s.aboutFeature}>
                      <div className={s.aboutFeatureIcon}><Icon size={18} /></div>
                      <div>
                        <div className={s.aboutFeatureTitle}>{feat.title}</div>
                        <div className={s.aboutFeatureDesc}>{feat.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={`${s.section} ${s.fadeIn}`}>
        <div className={s.sectionInner}>
          <div className={s.sectionTag}>Ride the Styl Way</div>
          <h2 className={s.sectionHeading}>{howItWorks.heading}</h2>
          <div className={s.stepsGrid}>
            {(howItWorks.steps || []).map((step: any, i: number) => (
              <div key={i} className={s.stepCard} style={STEP_CARD_STYLES[i] || {}}>
                <div className={s.stepNumber} style={{ color: (STEP_COLORS[i] || '#FF6B00') + '33' }}>{step.number}</div>
                <div className={s.stepTitle}>{step.title}</div>
                <div className={s.stepDesc}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR RIDERS ── */}
      <section id="riders" className={`${s.section} ${s.featureSection} ${s.fadeIn}`}>
        <div className={s.sectionInner}>
          <div className={s.sectionTag}>For Riders</div>
          <h2 className={s.sectionHeading}>{riders.heading}</h2>
          <p className={s.sectionSubtitle}>{riders.subtitle}</p>
          <div className={s.featureGrid}>
            <div className={s.featureCards}>
              {(riders.features || []).map((feat: any, i: number) => {
                const Icon = RIDER_ICONS[i] || DollarSign;
                const iconColor = RIDER_COLORS[i] || '#FF6B00';
                return (
                  <div key={i} className={s.featureCard} style={FEATURE_CARD_STYLES[i] || {}}>
                    <div className={s.featureCardIcon} style={{ color: iconColor }}><Icon size={20} /></div>
                    <div className={s.featureCardTitle}>{feat.title}</div>
                    <div className={s.featureCardDesc}>{feat.desc}</div>
                  </div>
                );
              })}
            </div>
            <div className={s.featureImageWrap}>
              {riders.image_url ? (
                <img src={riders.image_url} alt="Rider experience" className={s.featureImage} />
              ) : (
                <div className={s.featureImagePlaceholder}>
                  <User size={44} strokeWidth={1.5} />
                  <span>Upload from Admin &rarr; Marketing</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOR DRIVERS ── */}
      <section id="drivers" className={`${s.section} ${s.fadeIn}`}>
        <div className={s.sectionInner}>
          <div className={s.sectionTag}>For Drivers</div>
          <h2 className={s.sectionHeading}>{drivers.heading}</h2>
          <p className={s.sectionSubtitle}>{drivers.subtitle}</p>
          <div className={s.featureGridReverse}>
            <div className={s.featureCards}>
              {(drivers.features || []).map((feat: any, i: number) => {
                const Icon = DRIVER_ICONS[i] || Wallet;
                const iconColor = DRIVER_COLORS[i] || '#FF6B00';
                return (
                  <div key={i} className={s.featureCard} style={FEATURE_CARD_STYLES[i] || {}}>
                    <div className={s.featureCardIcon} style={{ color: iconColor }}><Icon size={20} /></div>
                    <div className={s.featureCardTitle}>{feat.title}</div>
                    <div className={s.featureCardDesc}>{feat.desc}</div>
                  </div>
                );
              })}
            </div>
            <div className={s.featureImageWrap}>
              {drivers.image_url ? (
                <img src={drivers.image_url} alt="Driver experience" className={s.featureImage} />
              ) : (
                <div className={s.featureImagePlaceholder}>
                  <Car size={44} strokeWidth={1.5} />
                  <span>Upload from Admin &rarr; Marketing</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── DOWNLOAD CTA ── */}
      <section id="download" className={`${s.download} ${s.fadeIn}`}>
        <div className={s.downloadBg} />
        <div className={s.downloadInner}>
          <h2 className={s.downloadTitle}>{cta.heading}</h2>
          <p className={s.downloadSubtitle}>{cta.subtitle}</p>
          <div className={s.downloadButtons}>
            <button className={s.downloadBtn} onClick={() => setWaitlistOpen(true)}>
              <Apple size={28} className={s.downloadBtnIcon} />
              <div className={s.downloadBtnText}>
                <span className={s.downloadBtnSmall}>Coming soon on</span>
                <span className={s.downloadBtnBig}>App Store</span>
              </div>
            </button>
            <button className={s.downloadBtn} onClick={() => setWaitlistOpen(true)}>
              <Play size={28} fill="currentColor" className={s.downloadBtnIcon} />
              <div className={s.downloadBtnText}>
                <span className={s.downloadBtnSmall}>Coming soon on</span>
                <span className={s.downloadBtnBig}>Google Play</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className={`${s.section} ${s.fadeIn}`}>
        <div className={s.sectionInner}>
          <div className={s.sectionTag}>Contact</div>
          <h2 className={s.sectionHeading}>{contact.heading}</h2>
          <p className={s.sectionSubtitle}>{contact.subtitle}</p>
          <div className={s.contactGrid}>
            <form className={s.contactForm} onSubmit={handleContact}>
              <div className={s.contactRow}>
                <div className={s.contactField}>
                  <label className={s.contactLabel}>Name</label>
                  <input className={s.contactInput} placeholder="Your name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} required />
                </div>
                <div className={s.contactField}>
                  <label className={s.contactLabel}>Email</label>
                  <input className={s.contactInput} type="email" placeholder="you@example.com" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} required />
                </div>
              </div>
              <div className={s.contactField}>
                <label className={s.contactLabel}>Phone (optional)</label>
                <input className={s.contactInput} placeholder="(555) 000-0000" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
              </div>
              <div className={s.contactField}>
                <label className={s.contactLabel}>Message</label>
                <textarea className={s.contactTextarea} placeholder="Tell us what you need..." value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} required />
              </div>
              {contactStatus === 'sent' ? (
                <p className={s.contactSuccess}>Message sent! We will get back to you soon.</p>
              ) : (
                <button className={s.contactSubmit} type="submit" disabled={contactStatus === 'sending'}>
                  <Send size={16} />
                  {contactStatus === 'sending' ? 'Sending...' : 'Send Message'}
                </button>
              )}
              {contactStatus === 'error' && (
                <p className={s.fareError}>Something went wrong. Please try again.</p>
              )}
            </form>
            <div className={s.contactInfo}>
              {contact.email && (
                <div className={s.contactInfoItem}>
                  <div className={s.contactInfoIcon}><Mail size={20} /></div>
                  <div>
                    <div className={s.contactInfoLabel}>Email</div>
                    <div className={s.contactInfoValue}>{contact.email}</div>
                    <div className={s.contactInfoDesc}>We typically respond within 24 hours</div>
                  </div>
                </div>
              )}
              {contact.phone && (
                <div className={s.contactInfoItem}>
                  <div className={s.contactInfoIcon}><Phone size={20} /></div>
                  <div>
                    <div className={s.contactInfoLabel}>Phone</div>
                    <div className={s.contactInfoValue}>{contact.phone}</div>
                    <div className={s.contactInfoDesc}>Mon-Fri, 9am-6pm EST</div>
                  </div>
                </div>
              )}
              {contact.address && (
                <div className={s.contactInfoItem}>
                  <div className={s.contactInfoIcon}><MapPin size={20} /></div>
                  <div>
                    <div className={s.contactInfoLabel}>Address</div>
                    <div className={s.contactInfoValue}>{contact.address}</div>
                  </div>
                </div>
              )}
              <div className={s.contactInfoItem}>
                <div className={s.contactInfoIcon}><Handshake size={20} /></div>
                <div>
                  <div className={s.contactInfoLabel}>Partnerships</div>
                  <div className={s.contactInfoValue}>Let&apos;s build together</div>
                  <div className={s.contactInfoDesc}>Interested in partnering with Styl? We are always open to conversations with businesses, cities, and organizations.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerTop}>
            <div className={s.footerBrand}>
              <div className={s.footerLogo}>
                <img src="/logo.svg" alt="STYL" className={s.footerLogoImg} />
              </div>
              <div className={s.footerTagline}>{footer.tagline}</div>
            </div>
            <div className={s.footerLinks}>
              <Link href="/privacy" className={s.footerLink}>Privacy Policy</Link>
              <Link href="/terms" className={s.footerLink}>Terms of Service</Link>
              <Link href="/driver-agreement" className={s.footerLink}>Driver Agreement</Link>
            </div>
            <div className={s.footerSocial}>
              {(footer.social || []).map((item: any, i: number) => {
                const SocialIcon = SOCIAL_ICONS[item.platform] || MessageCircle;
                return (
                  <a key={i} href={item.url} className={s.footerSocialIcon} aria-label={item.platform}>
                    <SocialIcon size={16} />
                  </a>
                );
              })}
            </div>
          </div>
          <div className={s.footerBottom}>
            <div className={s.footerCopyright}>{footer.copyright}</div>
          </div>
        </div>
      </footer>

      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
    </div>
  );
}
