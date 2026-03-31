import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Edit2, Download, Check, X, Clock, AlertCircle, Thermometer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';


interface HistoryItem {
  id: string;
  location: string;
  alias?: string;
  notes?: string;
  createdAt: string;
  temperatureData: string;
}

const ALIAS_LIMIT = 50;
const NOTES_LIMIT = 500;

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

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/weather/history');
      setHistory(res.data);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleDeleteClick = (id: string) => {
    setIdToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;
    try {
      await axios.delete(`/api/weather/history/${idToDelete}`);
      setHistory(prev => prev.filter(item => item.id !== idToDelete));
      setShowDeleteModal(false);
      setIdToDelete(null);
    } catch { /* silent */ }
  };

  const startEdit = (item: HistoryItem) => { 
    setEditingId(item.id); 
    setEditValue(item.alias || ''); 
    setEditNotes(item.notes || '');
  };

  const saveEdit = async (id: string) => {
    if (editValue.length > ALIAS_LIMIT || editNotes.length > NOTES_LIMIT) return;

    try {
      const payload = { 
        alias: editValue.trim() || "", 
        notes: editNotes.trim() || "" 
      };
      await axios.put(`/api/weather/history/${id}`, payload);
      setHistory(prev => prev.map(item => 
        item.id === id 
          ? { ...item, ...payload } 
          : item
      ));
      setEditingId(null);
    } catch { /* silent */ }
  };

  const handleExport = (format: 'json' | 'csv') => window.open(`/api/weather/export?format=${format}`, '_blank');

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-12 text-center">
        <div className="w-8 h-8 border-3 border-primary-container border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-on-surface-variant font-medium">Loading history…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="font-headline font-black text-2xl text-on-surface tracking-tight">
          Search History
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('json')}
            className="glass-card rounded-full px-4 py-2 flex items-center gap-2 text-xs font-bold text-primary hover:bg-primary/10 transition-colors active:scale-90"
          >
            <Download className="w-4 h-4" /> JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="glass-card rounded-full px-4 py-2 flex items-center gap-2 text-xs font-bold text-primary hover:bg-primary/10 transition-colors active:scale-90"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-3xl p-12 text-center"
        >
          <span className="text-5xl block mb-3">🔍</span>
          <p className="text-on-surface-variant font-medium">No searches yet. Try searching for a city!</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {history.map((item, i) => {
              const parsed = item.temperatureData ? JSON.parse(item.temperatureData) : null;
              // Fallback to first day temperature if current is missing (for historical/range searches)
              const temp = parsed?.current?.temperature_2m ?? parsed?.daily?.temperature_2m_max[0];
              const maxTemp = parsed?.daily?.temperature_2m_max?.[0];
              const minTemp = parsed?.daily?.temperature_2m_min?.[0];
              const code = parsed?.current?.weather_code ?? parsed?.daily?.weather_code?.[0];

              return (
                <motion.div
                  key={item.id}
                  layout="position"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: 0.04 * i }}
                  className="glass-card rounded-2xl flex items-center gap-4 p-4 sm:p-5"
                >
                  {/* Temperature badge */}
                  <div className="editorial-gradient w-13 h-13 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
                    {temp != null ? `${Math.round(temp)}°` : '—'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {editingId === item.id ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            placeholder="Custom Alias (e.g. My Home)"
                            className={cn(
                              "w-full bg-surface-container-low border rounded-xl px-3 py-2 text-sm font-medium text-on-surface focus:outline-none transition-colors",
                              editValue.length > ALIAS_LIMIT 
                                ? "border-danger focus:border-danger text-danger" 
                                : "border-primary-container/30 focus:border-primary-container"
                            )}
                          />
                          <div className="flex justify-between items-center px-1">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              editValue.length > ALIAS_LIMIT ? "text-danger" : "text-on-surface-variant opacity-40"
                            )}>
                              {editValue.length > ALIAS_LIMIT && <AlertCircle className="w-2.5 h-2.5 inline mr-1" />}
                              {editValue.length > ALIAS_LIMIT ? "Limit exceeded" : "Alias"}
                            </span>
                            <span className={cn(
                              "text-[10px] font-mono font-medium",
                              editValue.length > ALIAS_LIMIT ? "text-danger" : "text-on-surface-variant opacity-40"
                            )}>
                              {editValue.length}/{ALIAS_LIMIT}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <textarea
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            placeholder="Add personal notes here..."
                            className={cn(
                              "w-full bg-surface-container-low border rounded-xl px-3 py-2 text-sm font-medium text-on-surface focus:outline-none transition-colors resize-none",
                              editNotes.length > NOTES_LIMIT 
                                ? "border-danger focus:border-danger text-danger" 
                                : "border-primary-container/30 focus:border-primary-container"
                            )}
                            rows={3}
                          />
                          <div className="flex justify-between items-center px-1">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              editNotes.length > NOTES_LIMIT ? "text-danger" : "text-on-surface-variant opacity-40"
                            )}>
                              {editNotes.length > NOTES_LIMIT && <AlertCircle className="w-2.5 h-2.5 inline mr-1" />}
                              {editNotes.length > NOTES_LIMIT ? "Limit exceeded" : "Description / Notes"}
                            </span>
                            <span className={cn(
                              "text-[10px] font-mono font-medium",
                              editNotes.length > NOTES_LIMIT ? "text-danger" : "text-on-surface-variant opacity-40"
                            )}>
                              {editNotes.length}/{NOTES_LIMIT}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="font-semibold text-on-surface truncate text-lg">
                          {item.alias || item.location}
                        </div>
                        {item.alias && (
                          <div className="text-xs text-on-surface-variant truncate">
                            {item.location}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {code != null && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-on-surface bg-white/50 px-2 py-1 rounded-md border border-white/40 shadow-sm">
                              <span className="text-sm">{weatherEmoji(code)}</span> {weatherDesc(code)}
                            </span>
                          )}
                          {maxTemp != null && minTemp != null && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md border border-primary/10 shadow-sm">
                              <Thermometer className="w-3 h-3" />
                              H:{Math.round(maxTemp)}° L:{Math.round(minTemp)}°
                            </span>
                          )}
                        </div>

                        {item.notes && (
                          <div className="text-sm text-on-surface-variant mt-2 bg-white/40 p-2.5 rounded-xl italic break-words border border-white/20">
                            {item.notes}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mt-2 opacity-60">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0 self-start mt-1">
                    {editingId === item.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(item.id)}
                          disabled={editValue.length > ALIAS_LIMIT || editNotes.length > NOTES_LIMIT}
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90",
                            (editValue.length > ALIAS_LIMIT || editNotes.length > NOTES_LIMIT)
                              ? "bg-surface-container-low text-on-surface-variant opacity-50 cursor-not-allowed"
                              : "bg-primary-container text-white hover:opacity-90"
                          )}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="w-9 h-9 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center hover:bg-surface transition-colors shadow-sm active:scale-90"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(item)}
                          className="w-9 h-9 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center hover:text-primary hover:bg-primary/10 transition-colors shadow-sm active:scale-90"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="w-9 h-9 rounded-full bg-surface-container-low text-danger flex items-center justify-center hover:bg-danger-light transition-colors shadow-sm active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Deletion Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Record"
        message="Are you sure you want to permanently delete this search record? This action cannot be undone."
        confirmLabel="Delete"
        isDanger={true}
      />
    </div>
  );
}
