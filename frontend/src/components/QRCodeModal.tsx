import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Printer, ExternalLink } from 'lucide-react';

interface Props {
  roadId: string;
  roadName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<Props> = ({ roadId, roadName, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const url = `${window.location.origin}/#/passport/${roadId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md p-6 bg-navy-900 border border-slate-700/80 rounded-xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-navy-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-teal/15 text-accent-teal border border-accent-teal/30 mb-2">
            Public Road Passport
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">{roadName}</h3>
          <p className="text-xs font-mono text-slate-400 mt-0.5">Asset ID: {roadId}</p>
        </div>

        {/* QR Canvas Box */}
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-inner mb-4">
          <QRCodeSVG
            value={url}
            size={200}
            level="H"
            includeMargin={true}
          />
          <span className="text-[10px] text-slate-700 font-mono mt-2 font-medium">
            Scan to inspect verifiable money trail
          </span>
        </div>

        {/* URL Box */}
        <div className="flex items-center justify-between gap-2 p-2.5 bg-navy-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 mb-5">
          <span className="truncate">{url}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-medium rounded bg-navy-800 hover:bg-navy-700 text-slate-200 shrink-0 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-accent-emerald" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-navy-800 hover:bg-navy-700 border border-slate-700 rounded-lg text-slate-200 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            Print QR Tag
          </button>
          <a
            href={`#/passport/${roadId}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-accent-teal/20 hover:bg-accent-teal/30 border border-accent-teal/40 rounded-lg text-accent-teal transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Passport
          </a>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-4">
          ⚠️ Prototype navigation mechanism for civic accountability. Not an official BMC municipal QR plate.
        </p>
      </div>
    </div>
  );
};
