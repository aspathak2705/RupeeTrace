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
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] text-[11px] font-mono bg-white border border-rt-ink text-rt-ink shadow-[1.5px_1.5px_0px_#171717] ${className}`}
      title={`Raw Verified Dataset Record: ${file} (ID: ${id})`}
    >
      <Database className="w-3 h-3 text-rt-ink shrink-0" />
      <span className="text-rt-secondary-text">{file}:</span>
      <span className="font-bold text-rt-ink">{id}</span>
    </span>
  );
};
