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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-body">
      <div className="relative w-full max-w-md bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal-xl overflow-hidden">
        {/* Physical Tag Top Header */}
        <div className="bg-rt-primary border-b-3 border-rt-ink p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-headline font-black text-sm tracking-tight text-rt-ink uppercase">
              MUNICIPAL ASSET PASSPORT TAG
            </span>
            <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-rt-ink">
              VERIFIED
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 bg-white border-2 border-rt-ink rounded text-rt-ink hover:bg-rt-canvas transition-colors shadow-brutal-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center">
            <h3 className="text-xl font-headline font-extrabold text-rt-ink tracking-tight">{roadName}</h3>
            <p className="text-xs font-mono font-bold text-rt-secondary-text mt-0.5">CANONICAL ASSET ID: {roadId}</p>
          </div>

          {/* QR Canvas Box styled as an authentic municipal plate */}
          <div className="flex flex-col items-center justify-center p-6 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
            <div className="p-3 bg-white border-2 border-rt-ink rounded-[3px]">
              <QRCodeSVG
                value={url}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>
            <span className="text-[10px] text-rt-ink font-mono mt-3 font-bold uppercase tracking-wider">
              SCAN ON-SITE TO REVEAL REPAIR EXPENDITURE
            </span>
          </div>

          {/* URL Box */}
          <div className="flex items-center justify-between gap-2 p-2.5 bg-rt-muted border-2 border-rt-ink rounded-[4px] text-xs font-mono text-rt-ink">
            <span className="truncate font-semibold">{url}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-headline font-bold rounded bg-white hover:bg-yellow-50 text-rt-ink border border-rt-ink shadow-[1px_1px_0px_#171717] shrink-0 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-rt-coral" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-headline font-bold bg-white hover:bg-rt-canvas border-2 border-rt-ink rounded-[4px] text-rt-ink shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              <Printer className="w-4 h-4 text-rt-ink" />
              <span>Print Physical Tag</span>
            </button>
            <a
              href={`#/passport/${roadId}`}
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-headline font-bold bg-rt-primary hover:bg-yellow-300 border-2 border-rt-ink rounded-[4px] text-rt-ink shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Passport</span>
            </a>
          </div>

          <p className="text-[10px] text-rt-secondary-text font-mono text-center">
            Synthetic civic intelligence record. Reflects simulated municipal asset registry.
          </p>
        </div>
      </div>
    </div>
  );
};
