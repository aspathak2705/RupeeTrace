import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Clock, AlertTriangle, FileText, ArrowUpRight } from 'lucide-react';
import { AuditEvidence } from '../types';
import { api } from '../api/client';
import { EvidenceBadge } from './EvidenceBadge';

interface Props {
  workOrderId: string | null;
  onClose: () => void;
  onNavigateRoad?: (roadId: string) => void;
  onNavigateGraph?: (workOrderId: string) => void;
}

export const WorkOrderEvidenceModal: React.FC<Props> = ({
  workOrderId,
  onClose,
  onNavigateRoad,
  onNavigateGraph
}) => {
  const [evidence, setEvidence] = useState<AuditEvidence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workOrderId) {
      setEvidence(null);
      return;
    }
    setLoading(true);
    setError(null);
    api.getWorkOrderEvidence(workOrderId)
      .then(data => setEvidence(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [workOrderId]);

  if (!workOrderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-body">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal-xl overflow-hidden">
        {/* Dossier Header */}
        <div className="bg-rt-primary border-b-3 border-rt-ink p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <span className="font-headline font-black text-sm tracking-tight text-rt-ink uppercase">
              WORK ORDER EVIDENCE DOSSIER
            </span>
            <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-rt-ink shadow-[1px_1px_0px_#171717]">
              {workOrderId}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 bg-white border-2 border-rt-ink rounded text-rt-ink hover:bg-rt-canvas transition-colors shadow-brutal-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-rt-secondary-text">
              <div className="w-8 h-8 border-3 border-rt-ink border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-mono font-bold">Assembling evidence trail from dataset records...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rt-coral text-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm text-sm font-mono">
              <p className="font-bold">Failed to load evidence bundle:</p>
              <p>{error}</p>
            </div>
          )}

          {evidence && (
            <div className="space-y-6">
              {/* Asset Header Info */}
              <div className="border-b-2 border-rt-ink pb-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-[3px] text-xs font-mono font-bold bg-rt-ink text-white">
                    {evidence.work_order.work_order_id}
                  </span>
                  <span className="text-xs font-mono font-bold text-rt-ink bg-rt-canvas px-2 py-0.5 rounded border border-rt-ink">
                    WARD {evidence.work_order.ward_code} • ASSET {evidence.work_order.road_id}
                  </span>
                  <EvidenceBadge provenance={evidence.work_order.provenance} />
                </div>
                <h2 className="text-2xl font-headline font-black text-rt-ink tracking-tight">
                  {evidence.work_order.repair_method}
                </h2>
                <p className="text-xs font-mono text-rt-secondary-text mt-1">
                  Contractor: <strong className="text-rt-ink">{evidence.work_order.contractor_name}</strong> ({evidence.work_order.contractor_id})
                </p>
              </div>

              {/* Financial Reconciliation Box */}
              <div className="p-5 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
                <div className="flex items-center justify-between mb-4 border-b-2 border-rt-ink pb-2">
                  <h4 className="text-xs font-headline font-black text-rt-ink uppercase tracking-wider">
                    Financial Audit Reconciliation
                  </h4>
                  <span className="text-[10px] font-mono font-bold uppercase bg-white px-2 py-0.5 rounded border border-rt-ink">
                    Schedule of Rates Screening
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-3 border-2 border-rt-ink rounded-[3px] shadow-[2px_2px_0px_#171717]">
                    <span className="text-[10px] text-rt-secondary-text uppercase font-mono font-bold block">Recorded Billed Cost</span>
                    <span className="text-lg font-bold font-financial text-rt-ink mt-0.5 block">
                      ₹{evidence.financial_audit.billed_cost_inr.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-rt-secondary-text block mt-0.5">Billed figure</span>
                  </div>

                  <div className="bg-white p-3 border-2 border-rt-ink rounded-[3px] shadow-[2px_2px_0px_#171717]">
                    <span className="text-[10px] text-rt-secondary-text uppercase font-mono font-bold block">Rate Card Benchmark</span>
                    <span className="text-lg font-bold font-financial text-rt-ink mt-0.5 block">
                      {evidence.financial_audit.expected_cost_inr ? `₹${evidence.financial_audit.expected_cost_inr.toLocaleString('en-IN')}` : 'N/A'}
                    </span>
                    <span className="text-[9px] text-rt-secondary-text block mt-0.5">
                      {evidence.rate_card ? `₹${evidence.rate_card.standard_rate_inr.toLocaleString('en-IN')} ${evidence.rate_card.unit}` : 'Standard'}
                    </span>
                  </div>

                  <div className={`p-3 border-2 border-rt-ink rounded-[3px] shadow-[2px_2px_0px_#171717] ${
                    (evidence.financial_audit.cost_variance_pct || 0) > 30 ? 'bg-rt-coral text-white' :
                    (evidence.financial_audit.cost_variance_pct || 0) > 20 ? 'bg-rt-primary text-rt-ink' : 'bg-rt-mint text-rt-ink'
                  }`}>
                    <span className="text-[10px] uppercase font-mono font-bold block opacity-90">Cost Variance</span>
                    <span className="text-lg font-black font-financial mt-0.5 block">
                      {evidence.financial_audit.cost_variance_pct !== undefined ? (
                        `${evidence.financial_audit.cost_variance_pct > 0 ? '+' : ''}${evidence.financial_audit.cost_variance_pct}%`
                      ) : '0%'}
                    </span>
                    <span className="text-[9px] font-bold block mt-0.5">
                      {evidence.financial_audit.is_overbilled_flag ? '⚠️ Exceeds 30% band' : 'Normal range'}
                    </span>
                  </div>

                  <div className="bg-white p-3 border-2 border-rt-ink rounded-[3px] shadow-[2px_2px_0px_#171717]">
                    <span className="text-[10px] text-rt-secondary-text uppercase font-mono font-bold block">Repaired Area</span>
                    <span className="text-lg font-bold font-financial text-rt-ink mt-0.5 block">
                      {evidence.work_order.area_sqm} <span className="text-xs font-mono font-normal">sqm</span>
                    </span>
                    <span className="text-[9px] text-rt-secondary-text block mt-0.5">Surface scope</span>
                  </div>
                </div>

                {evidence.financial_audit.is_dlp_breach_flag && (
                  <div className="mt-4 p-3 bg-rt-coral text-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm flex items-start gap-2.5 text-xs font-mono">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-white" />
                    <div>
                      <span className="font-bold uppercase tracking-wider block">DLP Warranty Notice:</span>
                      Recorded road repair executed on asset marked under active Defect Liability Period. Contractual warranty review required before payment approval.
                    </div>
                  </div>
                )}
              </div>

              {/* Timelines & 30-Day Durability */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
                  <h4 className="text-xs font-headline font-black text-rt-ink uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-rt-ink/20 pb-1.5">
                    <Clock className="w-4 h-4 text-rt-ink" />
                    Execution Timeline & SLA
                  </h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-rt-muted">
                      <span className="text-rt-secondary-text font-bold">Assigned:</span>
                      <span className="text-rt-ink font-bold">{evidence.work_order.assigned_at}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-rt-muted">
                      <span className="text-rt-secondary-text font-bold">Started:</span>
                      <span className="text-rt-ink font-bold">{evidence.work_order.work_started_at}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-rt-muted">
                      <span className="text-rt-secondary-text font-bold">Completed:</span>
                      <span className="text-rt-ink font-bold">{evidence.work_order.completed_at}</span>
                    </div>
                    <div className="flex justify-between py-1 pt-1.5">
                      <span className="text-rt-secondary-text font-bold">SLA Target ({evidence.work_order.sla_hours}h):</span>
                      <span className={`font-bold flex items-center gap-1 px-1.5 py-0.2 rounded border border-rt-ink ${
                        evidence.work_order.sla_met ? 'bg-rt-mint text-rt-ink' : 'bg-rt-coral text-white'
                      }`}>
                        {evidence.work_order.sla_met ? 'SLA Met' : 'Breached SLA'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
                  <h4 className="text-xs font-headline font-black text-rt-ink uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-rt-ink/20 pb-1.5">
                    <AlertTriangle className="w-4 h-4 text-rt-ink" />
                    30-Day Durability Status
                  </h4>
                  <div className="p-3 bg-rt-canvas border-2 border-rt-ink rounded-[4px] text-xs mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-rt-secondary-text font-bold font-mono">Reopened within 30d:</span>
                      <span className={`font-bold px-2 py-0.5 rounded border border-rt-ink font-mono text-[11px] ${
                        evidence.work_order.reopened_within_30d
                          ? 'bg-rt-coral text-white'
                          : 'bg-rt-mint text-rt-ink'
                      }`}>
                        {evidence.work_order.reopened_within_30d ? 'YES (Premature Failure)' : 'NO (Held Up)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-rt-secondary-text mt-1.5">
                      {evidence.work_order.reopened_within_30d
                        ? 'Repair failure reported within 30 days of completion. Indicates debonding or substandard material.'
                        : 'No repeat defect reported on this section within the 30-day warranty window.'}
                    </p>
                  </div>
                  {evidence.work_order.engineer_remark && (
                    <div className="text-xs bg-rt-muted p-2 rounded border border-rt-ink font-mono">
                      <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Site Engineer Remark:</span>
                      <span className="text-rt-ink font-medium">"{evidence.work_order.engineer_remark}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Citizen Complaints */}
              <div className="bg-rt-canvas p-4 border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
                <h4 className="text-xs font-headline font-black text-rt-ink uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-rt-ink" />
                  Linked Citizen Complaints ({evidence.linked_complaints.length})
                </h4>
                {evidence.linked_complaints.length === 0 ? (
                  <div className="p-3 bg-white border border-rt-ink rounded text-xs text-rt-secondary-text font-mono italic">
                    No citizen complaint linked. Municipal engineering-initiated job.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {evidence.linked_complaints.map(c => (
                      <div key={c.complaint_id} className="p-3 bg-white border-2 border-rt-ink rounded-[3px] text-xs shadow-brutal-sm">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono font-bold bg-rt-primary px-1.5 py-0.5 rounded border border-rt-ink text-rt-ink">
                            {c.complaint_id}
                          </span>
                          <span className="text-[11px] font-mono text-rt-secondary-text">{c.channel} • {c.received_at}</span>
                        </div>
                        <p className="text-rt-ink font-medium mb-1.5 font-body">{c.description}</p>
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span>Category: <strong className="text-rt-ink">{c.category_reported}</strong></span>
                          <span className="px-1.5 py-0.2 rounded bg-rt-canvas text-rt-ink border border-rt-ink font-bold">
                            {c.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Raw Provenances */}
              <div className="p-3 bg-rt-muted border-2 border-rt-ink rounded-[4px]">
                <span className="text-[10px] text-rt-secondary-text uppercase font-mono font-bold block mb-1.5">
                  Verified Dataset Provenance Trail:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {evidence.provenances.map((p, idx) => (
                    <EvidenceBadge key={idx} provenance={p} />
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-rt-ink">
                {onNavigateRoad && evidence.work_order.road_id && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateRoad(evidence.work_order.road_id);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-headline font-bold bg-white hover:bg-rt-canvas text-rt-ink border-2 border-rt-ink rounded-[4px] shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition-all"
                  >
                    <ArrowUpRight className="w-4 h-4 text-rt-ink" />
                    <span>View Road Passport ({evidence.work_order.road_id})</span>
                  </button>
                )}
                {onNavigateGraph && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateGraph(evidence.work_order.work_order_id);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-headline font-bold bg-rt-primary hover:bg-yellow-300 text-rt-ink border-2 border-rt-ink rounded-[4px] shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition-all"
                  >
                    <span>Inspect in Money Trace Graph</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
