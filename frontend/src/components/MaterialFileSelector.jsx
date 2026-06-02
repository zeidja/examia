import { useState, useEffect } from 'react';
import api from '../api/axios';
import { fileNameWithoutExtension } from '../utils/format';

/** Subject material file picker (same UX as Study Lab). */
export function MaterialFileSelector({ subjectId, selectedPaths, onSelectedPathsChange }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) {
      setFiles([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get('/materials/subject-files', { params: { subjectId } })
      .then((res) => {
        if (!cancelled && res.data?.success && Array.isArray(res.data.files)) setFiles(res.data.files);
      })
      .catch(() => {
        if (!cancelled) setFiles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const toggleFile = (relativePath) => {
    onSelectedPathsChange(
      selectedPaths.includes(relativePath)
        ? selectedPaths.filter((p) => p !== relativePath)
        : [...selectedPaths, relativePath]
    );
  };

  const selectAll = () => onSelectedPathsChange(files.map((f) => f.relativePath));
  const clearAll = () => onSelectedPathsChange([]);

  return (
    <div className="mt-4 pt-4 border-t border-examia-soft/30">
      <p className="text-xs font-medium text-examia-mid uppercase tracking-wide mb-3">
        Files
        {selectedPaths.length > 0 && (
          <span className="ml-2 normal-case font-semibold text-examia-dark">
            ({selectedPaths.length} selected)
          </span>
        )}
      </p>
      {loading ? (
        <div className="flex items-center gap-3 py-8 text-examia-mid">
          <span className="animate-spin rounded-full h-6 w-6 border-2 border-examia-mid border-t-transparent" />
          <span className="text-sm">Loading materials…</span>
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-xl border border-dashed border-examia-soft/50 bg-examia-soft/10 py-10 px-4 text-center">
          <svg className="w-10 h-10 mx-auto text-examia-soft mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-examia-dark">No materials yet</p>
          <p className="text-xs text-examia-mid mt-0.5">PDF, DOC, or TXT files for this subject will appear here.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-examia-mid">
              {selectedPaths.length} of {files.length} selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-medium text-examia-dark px-3 py-1.5 rounded-lg border border-examia-soft/50 hover:bg-examia-soft/20 transition"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-examia-mid px-3 py-1.5 rounded-lg hover:bg-examia-soft/20 transition"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto rounded-xl border border-examia-soft/40 bg-examia-bg/50 p-2 space-y-1.5 scrollbar-thin">
            {files.map((f) => {
              const isSelected = selectedPaths.includes(f.relativePath);
              const ext = (f.name || '').split('.').pop()?.toLowerCase() || '';
              return (
                <button
                  key={f.relativePath}
                  type="button"
                  onClick={() => toggleFile(f.relativePath)}
                  className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-examia-dark/5 border-examia-dark/30 shadow-sm'
                      : 'bg-white border-examia-soft/30 hover:border-examia-soft/50 hover:bg-examia-soft/10'
                  }`}
                >
                  <span
                    className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-examia-dark text-white' : 'bg-examia-soft/30 text-examia-mid'
                    }`}
                  >
                    {ext === 'pdf' ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium text-examia-dark truncate" title={f.relativePath}>
                    {fileNameWithoutExtension(f.name)}
                  </span>
                  {isSelected && (
                    <span className="shrink-0 w-5 h-5 rounded-full bg-examia-dark text-white flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedPaths.length === 0 && (
            <p className="flex items-center gap-2 text-amber-600 text-xs mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/60">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Select at least one file to start.
            </p>
          )}
        </>
      )}
    </div>
  );
}
