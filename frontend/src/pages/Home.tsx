import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Search, MapPin, Loader2, Wind, Droplets, Thermometer,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Suggestion {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const weatherEmoji = (code: number) => {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '🌨️';
  return '⛈️';
};

const weatherDesc = (code: number) => {
  if (code === 0) return 'Clear Sky';
  if (code <= 3) return 'Mostly Clear';
  if (code <= 48) return 'Foggy';
  if (code <= 55) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow Showers';
  return 'Thunderstorm';
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */



/* ------------------------------------------------------------------ */
/* Home Page                                                           */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Advanced search states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // City assets (Unsplash/YouTube)
  const [cityImage, setCityImage] = useState<string | null>(null);
  const [videos, setVideos] = useState<any[]>([]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* ---- Autocomplete ---- */

  const fetchSuggestions = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=5`
        );
        setSuggestions(data.results || []);
      } catch { setSuggestions([]); }
    }, 80);
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    setShowDropdown(true);
    fetchSuggestions(val);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ---- Weather Search ---- */

  const doSearch = async (loc: string) => {
    if (!loc.trim()) return;
    setLoading(true);
    setError('');
    setData(null); // Clear old data to prevent "frozen" UI
    setCityImage(null); // Clear old background
    setVideos([]);      // Clear old videos
    setShowDropdown(false);
    if (endDate && !startDate) {
      setError('A Start Date is required to use a date range.');
      setLoading(false);
      return;
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError('Check your dates: the end date must be after the start date.');
      setLoading(false);
      return;
    }

    try {
      const weatherReq = axios.post('/api/weather/search', {
        location: loc,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const assetsReq = fetchCityAssets(loc);
      
      const [res] = await Promise.all([weatherReq, assetsReq]);
      setData({ ...res.data, weather: JSON.parse(res.data.temperatureData) });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Could not reach the weather service.';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCityAssets = async (loc: string) => {
    try {
      const { data: assets } = await axios.get(`/api/weather/city-assets?location=${encodeURIComponent(loc)}`);
      
      // Fallback to beautiful default if image not found or no keys
      setCityImage(assets.image || `https://images.unsplash.com/photo-1449156001437-3a1195c71af1?q=80&w=1200&auto=format&fit=crop`);

      if (assets.videos && assets.videos.length > 0) {
        setVideos(assets.videos);
      } else {
        // Fallback to search links if no videos returned
        const cityName = loc.split(',')[0].trim();
        setVideos([
          { id: '1', title: `Explore ${cityName} - Top Attractions`, thumbnail: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=400', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cityName)}+travel+guide` },
          { id: '2', title: `Day in the life in ${cityName}`, thumbnail: 'https://images.unsplash.com/photo-1493246507139-91e8bef99c02?q=80&w=400', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cityName)}+vlog` },
          { id: '3', title: `Best restaurants in ${cityName}`, thumbnail: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=400', url: `https://www.youtube.com/results?search_query=best+food+in+${encodeURIComponent(cityName)}` },
        ]);
      }
    } catch (err) {
      console.error('Error fetching assets:', err);
    }
  };

  const pickSuggestion = (s: Suggestion) => {
    const full = `${s.name}${s.admin1 ? ', ' + s.admin1 : ''}${s.country ? ', ' + s.country : ''}`;
    setQuery(full);
    setShowDropdown(false);
  };

    const w = data?.weather;
    // Use the actual range from the server if available
    const hasRange = (!!data?.startDate && !!data?.endDate) || (!!startDate && !!endDate);

    // Derived values for the Hero card
    // Use average of first day for historical or custom ranges
    const heroTemp = (hasRange || !w?.current)
      ? (w?.daily?.temperature_2m_max?.[0] + w?.daily?.temperature_2m_min?.[0]) / 2 
      : w?.current?.temperature_2m;
    const heroCode = (hasRange || !w?.current)
      ? w?.daily?.weather_code?.[0] 
      : w?.current?.weather_code;
    const heroHumidity = hasRange 
      ? '--' 
      : w?.current?.relative_humidity_2m ?? '--';
    const heroWind = hasRange 
      ? '--' 
      : w?.current?.wind_speed_10m ?? '--';
    const heroApparent = (hasRange || !w?.current)
      ? w?.daily?.temperature_2m_max?.[0] 
      : w?.current?.apparent_temperature ?? w?.current?.temperature_2m;

    const formatDate = (dateStr: string, isFirstDay: boolean) => {
      // Append T12:00:00 to avoid timezone shift into previous day
      const d = new Date(dateStr + 'T12:00:00');
      if (isFirstDay && !hasRange) return 'Today';
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    };

    return (
      <div className="flex flex-col gap-6">

      {/* ============ Search Bar ============ */}
      <div ref={wrapperRef} className="relative w-full">
        <form
          onSubmit={e => { e.preventDefault(); doSearch(query); }}
          className="glass-card rounded-full px-5 py-3 flex items-center shadow-lg shadow-primary/5 gap-3"
        >
          <MapPin className="w-5 h-5 text-primary shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Search any city…"
            className="bg-transparent border-none focus:outline-none w-full font-medium text-on-surface placeholder:text-on-surface-variant/40"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 bg-primary-container text-white rounded-full p-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Search className="w-5 h-5" />
            }
          </button>
        </form>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showDropdown && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl overflow-hidden z-50 shadow-lg border border-white/40"
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => pickSuggestion(s)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-secondary-container/30 transition-colors text-left border-b border-surface-container-low last:border-b-0"
                >
                  <MapPin className="w-4 h-4 text-primary-container shrink-0" />
                  <div>
                    <div className="font-semibold text-on-surface text-sm">{s.name}</div>
                    <div className="text-xs text-on-surface-variant">
                      {[s.admin1, s.country].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-end px-4 mt-[-1rem]">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-bold text-primary hover:underline transition-all py-1"
        >
          {showAdvanced ? 'Hide Date Range' : 'Specific Date Range?'}
        </button>
      </div>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10, overflow: 'hidden' }}
            className="flex gap-4 items-center bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/40 shadow-sm mt-[-1rem]"
          >
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Start Date</label>
              <input 
                type="date"
                lang="en-US"
                translate="no"
                autoComplete="off"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent border-b border-on-surface/20 focus:border-primary focus:outline-none text-sm font-medium py-1 text-on-surface"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">End Date</label>
              <input 
                type="date"
                lang="en-US"
                translate="no"
                autoComplete="off"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent border-b border-on-surface/20 focus:border-primary focus:outline-none text-sm font-medium py-1 text-on-surface"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ Error ============ */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-danger-light border border-danger-border text-danger rounded-2xl px-5 py-3 text-sm text-center font-medium"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ Weather Results ============ */}
      {w && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left Column: Hero & 5-Day Forecast */}
          <div className="flex flex-col gap-6">
            {/* Main Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-container-low border border-white/40 rounded-3xl p-6 relative overflow-hidden flex flex-col gap-6 shadow-sm min-h-[180px]"
            >
              {/* City Background Layer */}
              {cityImage && (
                <div className="absolute inset-0 z-0">
                   <img src={cityImage} alt="" className="w-full h-full object-cover opacity-25 brightness-75 contrast-110" />
                   <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/20 to-transparent" />
                </div>
              )}

              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col">
                  <p className="text-xs font-bold text-on-surface-variant mb-1">
                    {data.location}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-6xl font-headline font-black tracking-tighter text-on-surface">
                      {Math.round(heroTemp)}°
                    </span>
                    <span className="text-6xl drop-shadow-sm">{weatherEmoji(heroCode)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-lg font-bold text-on-surface">
                    {weatherDesc(heroCode)}
                  </span>
                  <span className="text-sm font-medium text-on-surface-variant">
                    {hasRange ? 'Daily Avg / Max: ' : 'Feels like: '} {Math.round(heroApparent)}°
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm font-semibold text-on-surface bg-white/50 px-4 py-3 border border-white/40 rounded-2xl">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md">
                     <Thermometer className="w-4 h-4 text-primary" />
                     <span>{w.daily.temperature_2m_max[0]}° / {w.daily.temperature_2m_min[0]}°</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md" title="Humidity (Current only)">
                     <Droplets className="w-4 h-4 text-primary" />
                     <span>{heroHumidity}{heroHumidity !== '--' ? '%' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md" title="Wind (Current only)">
                     <Wind className="w-4 h-4 text-primary" />
                     <span>{heroWind}{heroWind !== '--' ? ' km/h' : ''}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Forecast Output */}
            <section className="mt-4 w-full">
              {hasRange && w.daily?.time?.length > 5 ? (
                // Vertical List for ranges > 5 days (Supports ~15 days)
                <div className="flex flex-col gap-3">
                   <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40">Extended Range Support</span>
                   </div>
                   <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                    {w.daily.time.map((d: string, i: number) => (
                      <motion.div
                        key={d}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className="bg-surface-container-low border border-white/40 rounded-2xl p-4 flex items-center justify-between hover:bg-white/80 transition-colors shrink-0"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-on-surface leading-tight">
                            {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                          </span>
                          <span className="text-[10px] font-medium text-on-surface-variant tracking-wider">
                            {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-6">
                           <span className="text-2xl drop-shadow-sm">{weatherEmoji(w.daily.weather_code[i])}</span>
                           <div className="flex items-center gap-3 border-l border-on-surface/5 pl-6 min-w-[70px] justify-end">
                              <span className="text-lg font-headline font-black text-primary leading-none">{Math.round(w.daily.temperature_2m_max[i])}°</span>
                              <span className="text-xs font-bold text-on-surface-variant opacity-50 leading-none">{Math.round(w.daily.temperature_2m_min[i])}°</span>
                           </div>
                        </div>
                      </motion.div>
                    ))}
                   </div>
                </div>
              ) : (
                // Horizontal Chips for default view or ranges <= 5 days (Fills width)
                <div className="w-full flex gap-1.5 sm:gap-2">
                  {w.daily?.time?.slice(0, hasRange ? undefined : 5).map((d: string, i: number) => (
                    <motion.div
                      key={d}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className={cn(
                        'flex-1 flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl min-w-0 transition-colors',
                        i === 0 && !hasRange
                          ? 'bg-primary-container text-white shadow-md'
                          : 'bg-surface-container-low border border-white/40 hover:bg-white/80'
                      )}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 truncate w-full text-center">
                        {formatDate(d, i === 0)}
                      </span>
                      <span className="text-lg leading-none py-0.5">{weatherEmoji(w.daily.weather_code[i])}</span>
                      <div className="flex flex-col items-center leading-none mt-0.5">
                        <span className="text-sm font-bold tracking-tighter">{Math.round(w.daily.temperature_2m_max[i])}°</span>
                        <span className={cn(
                          'text-[9px] font-bold opacity-50 mt-0.5',
                          i === 0 && !hasRange ? 'text-white/80' : 'text-on-surface-variant'
                        )}>
                          {Math.round(w.daily.temperature_2m_min[i])}°
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Location Map */}
          <section className="h-full">
            <div className="glass-card rounded-3xl p-2 overflow-hidden h-full min-h-[300px] md:min-h-[100%]">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: 16, display: 'block', minHeight: '300px' }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(data.location)}&z=12&output=embed`}
                title="Location Map"
              />
            </div>
          </section>
        </div>
      )}

      {/* ============ YouTube / City Pulse ============ */}
      {data && videos.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline font-black italic tracking-tighter text-xl text-primary">
              Local Pulse: {data.location.split(',')[0]}
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40">YouTube Discoveries</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {videos.map((vid) => (
              <a
                key={vid.id}
                href={vid.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-surface-container-low rounded-2xl overflow-hidden border border-white/40 shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div className="aspect-video relative overflow-hidden">
                   <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                   <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                   <div className="absolute bottom-2 right-2 bg-red-600 text-[8px] font-bold text-white px-1.5 py-0.5 rounded">YouTube</div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                    {vid.title}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
