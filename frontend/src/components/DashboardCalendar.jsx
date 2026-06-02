import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { datetimeLocalValueToIsoString } from '../utils/format';
import {
  formatDateKey,
  getCalendarMonthCells,
  monthLabel,
  eventsOnDay,
  kindsByDateKey,
  eventTimeLabel,
  eventKindMeta,
  activeLegendKinds,
  EVENT_KIND_ORDER,
} from '../utils/calendar';

function resourceEventLink(event, libraryResourceLinks) {
  if (!event.resourceId) return null;
  if (libraryResourceLinks) return '/resources';
  if (event.subjectId) return `/content/subject/${event.subjectId}/resource/${event.resourceId}`;
  return `/content/${event.resourceId}`;
}

function DayMarkers({ kinds, isSelected }) {
  const ordered = EVENT_KIND_ORDER.filter((k) => kinds.has(k));
  if (!ordered.length) return null;
  return (
    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center justify-center gap-0.5">
      {ordered.map((kind) => {
        const meta = eventKindMeta(kind);
        return (
          <span
            key={kind}
            className={`block w-1.5 h-1.5 rounded-full shadow-sm ${isSelected ? meta.dotSelected : meta.dot}`}
            title={meta.label}
          />
        );
      })}
    </span>
  );
}

function CalendarLegend({ events }) {
  const kinds = activeLegendKinds(events);
  if (!kinds.length) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 pt-2 border-t border-examia-soft/25">
      {kinds.map((kind) => {
        const meta = eventKindMeta(kind);
        return (
          <span key={kind} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-examia-mid">
            <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function EventCard({ ev, canManageEvents, libraryResourceLinks, onDelete }) {
  const meta = eventKindMeta(ev.kind);
  const link = resourceEventLink(ev, libraryResourceLinks);
  const inner = (
    <div
      className={`rounded-xl border border-l-4 shadow-sm px-3 py-2.5 transition-shadow hover:shadow-md ${meta.accent} ${meta.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md mb-1.5 ${meta.badge}`}>
            {meta.label}
          </span>
          <p className="font-medium text-sm leading-snug">{ev.title}</p>
          <p className="text-xs opacity-75 mt-1">{eventTimeLabel(ev)}</p>
          {ev.subjectName && <p className="text-xs opacity-75 mt-0.5">{ev.subjectName}</p>}
          {ev.className && <p className="text-xs opacity-75 mt-0.5">Class: {ev.className}</p>}
          {ev.description && <p className="text-xs mt-2 opacity-85 line-clamp-2">{ev.description}</p>}
        </div>
        {canManageEvents && ev.schoolEventId && (
          <button
            type="button"
            onClick={() => onDelete(ev.schoolEventId)}
            className="text-xs text-rose-700 hover:text-rose-900 font-medium shrink-0 px-1"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
  if (link) {
    return (
      <Link to={link} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-examia-dark/30 rounded-xl">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function DashboardCalendar({ canManageEvents = false, libraryResourceLinks = false }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(formatDateKey(today));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: formatDateKey(today),
    time: '09:00',
    allDay: true,
    classId: '',
  });

  const range = useMemo(() => {
    const from = formatDateKey(new Date(viewYear, viewMonth, 1));
    const to = formatDateKey(new Date(viewYear, viewMonth + 1, 0));
    return { from, to };
  }, [viewYear, viewMonth]);

  const loadEvents = () => {
    setLoading(true);
    setError(null);
    api
      .get('/calendar', { params: range })
      .then((r) => setEvents(r.data.events || []))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, [range.from, range.to]);

  useEffect(() => {
    if (!canManageEvents) return;
    api
      .get('/classes')
      .then((r) => setClasses(r.data.classes || []))
      .catch(() => setClasses([]));
  }, [canManageEvents]);

  const kindsMap = useMemo(() => kindsByDateKey(events), [events]);
  const cells = useMemo(() => getCalendarMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedDay.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDay]);
  const dayEvents = useMemo(() => eventsOnDay(events, selectedDate), [events, selectedDate]);

  const goMonth = (delta) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      let startAt;
      if (form.allDay) {
        const [y, m, d] = form.date.split('-').map(Number);
        startAt = new Date(y, m - 1, d, 9, 0, 0, 0).toISOString();
      } else {
        startAt = datetimeLocalValueToIsoString(`${form.date}T${form.time}`);
      }
      await api.post('/calendar/events', {
        title: form.title.trim(),
        description: form.description.trim(),
        startAt,
        allDay: form.allDay,
        classId: form.classId || null,
      });
      setForm((f) => ({ ...f, title: '', description: '' }));
      setShowForm(false);
      loadEvents();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (schoolEventId) => {
    if (!schoolEventId || !window.confirm('Delete this event?')) return;
    try {
      await api.delete(`/calendar/events/${schoolEventId}`);
      loadEvents();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-examia-soft/30 bg-gradient-to-br from-white via-white to-examia-soft/15 shadow-md mb-6"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-examia-soft/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-examia-dark tracking-tight">Calendar</h2>
            <p className="text-examia-mid text-xs mt-0.5 hidden sm:block">
              Colored dots show what is scheduled each day.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-white/80 border border-examia-soft/40 p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className="p-1.5 rounded-md hover:bg-examia-soft/25 text-examia-dark transition"
              aria-label="Previous month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xs font-bold text-examia-dark min-w-[7.5rem] text-center px-1">
              {monthLabel(viewYear, viewMonth)}
            </span>
            <button
              type="button"
              onClick={() => goMonth(1)}
              className="p-1.5 rounded-md hover:bg-examia-soft/25 text-examia-dark transition"
              aria-label="Next month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="md:grid md:grid-cols-[minmax(0,17rem)_1fr] md:gap-6 md:items-start">
          <div className="max-w-[17rem] mx-auto md:mx-0 w-full">
            <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-examia-soft/30 p-2 shadow-inner">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-examia-mid uppercase tracking-wider mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                  <div key={`${d}-${idx}`} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (!day) return <div key={`pad-${i}`} className="h-10" />;
                  const key = formatDateKey(day);
                  const isSelected = key === selectedDay;
                  const isToday = key === formatDateKey(today);
                  const dayKinds = kindsMap.get(key) || new Set();
                  const hasEvents = dayKinds.size > 0;
                  const kindList = [...dayKinds];
                  const tint =
                    !isSelected && hasEvents
                      ? kindList.length === 1
                        ? eventKindMeta(kindList[0]).dayTint
                        : 'bg-examia-soft/20'
                      : '';

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDay(key)}
                      className={`h-10 rounded-lg text-xs font-semibold transition-all relative flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-examia-dark text-white shadow-md scale-[1.02] z-[1]'
                          : isToday
                            ? `ring-2 ring-examia-dark/40 ${tint || 'bg-examia-soft/30'} text-examia-dark hover:brightness-95`
                            : hasEvents
                              ? `${tint} text-examia-dark hover:brightness-95 border border-transparent hover:border-examia-soft/50`
                              : 'text-examia-dark hover:bg-examia-soft/25'
                      }`}
                    >
                      <span className={hasEvents ? 'mt-0.5' : ''}>{day.getDate()}</span>
                      <DayMarkers kinds={dayKinds} isSelected={isSelected} />
                    </button>
                  );
                })}
              </div>
              <CalendarLegend events={events} />
            </div>
          </div>

          <div className="mt-4 md:mt-0 min-w-0 rounded-xl bg-white/60 border border-examia-soft/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-examia-dark">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              {canManageEvents && (
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, date: selectedDay }));
                    setShowForm((v) => !v);
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-examia-dark text-white hover:bg-examia-mid transition shadow-sm"
                >
                  {showForm ? 'Cancel' : '+ Add event'}
                </button>
              )}
            </div>

            {canManageEvents && showForm && (
              <form
                onSubmit={handleCreateEvent}
                className="mb-4 p-3 rounded-xl border border-violet-200/60 bg-violet-50/40 space-y-3"
              >
                <input
                  type="text"
                  required
                  placeholder="Event title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-examia-soft/50 bg-white px-3 py-2 text-sm"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-examia-soft/50 bg-white px-3 py-2 text-sm resize-y"
                />
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm text-examia-dark">
                    <input
                      type="checkbox"
                      checked={form.allDay}
                      onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))}
                    />
                    All day
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="rounded-lg border border-examia-soft/50 bg-white px-3 py-2 text-sm"
                  />
                  {!form.allDay && (
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                      className="rounded-lg border border-examia-soft/50 bg-white px-3 py-2 text-sm"
                    />
                  )}
                  <select
                    value={form.classId}
                    onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                    className="rounded-lg border border-examia-soft/50 bg-white px-3 py-2 text-sm min-w-[10rem]"
                  >
                    <option value="">Whole school</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save event'}
                </button>
              </form>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-examia-mid text-xs">
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-examia-mid border-t-transparent" />
                Loading schedule…
              </div>
            ) : dayEvents.length === 0 ? (
              <div className="py-10 text-center rounded-xl border border-dashed border-examia-soft/40 bg-examia-soft/5">
                <p className="text-sm font-medium text-examia-dark">Clear day</p>
                <p className="text-xs text-examia-mid mt-1">Nothing scheduled for this date.</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto pr-0.5 scrollbar-thin">
                {dayEvents.map((ev) => (
                  <li key={ev.id}>
                    <EventCard
                      ev={ev}
                      canManageEvents={canManageEvents}
                      libraryResourceLinks={libraryResourceLinks}
                      onDelete={handleDeleteEvent}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <p className="text-[10px] text-examia-mid mt-4 relative">
          {libraryResourceLinks
            ? 'Violet = school events · Sky = quiz opens · Rose = quiz due · Amber = flashcards due'
            : 'School events and quiz dates from your school appear automatically on the calendar.'}
        </p>
      </div>
    </motion.section>
  );
}
