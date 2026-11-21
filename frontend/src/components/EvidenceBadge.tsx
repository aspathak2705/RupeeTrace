import React from 'react';
import { Database } from 'lucide-react';
import { SourceProvenance } from '../types';

interface Props {
  provenance?: SourceProvenance;
  sourceFile?: string;
  recordId?: string;
  className?: string;
}

export const EvidenceBadge: React.FC<Props> = ({ provenance, sourceFile, recordId, className = '' }) => {
  const file = provenance?.source_file || sourceFile;
  const id = provenance?.source_record_id || recordId;

  if (!file && !id) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-navy-850 border border-slate-700/60 text-slate-300 ${className}`}
      title={`Raw Provenance: ${file} (ID: ${id})`}
    >
      <Database className="w-3 h-3 text-accent-teal shrink-0" />
      <span className="text-slate-400">{file}:</span>
      <span className="font-semibold text-slate-200">{id}</span>
    </span>
  );
};
