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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-navy-900 border border-slate-700 rounded-xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-navy-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="w-8 h-8 border-2 border-accent-teal border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Assembling audit evidence trail...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm">
            <p className="font-semibold">Failed to load evidence bundle:</p>
            <p>{error}</p>
          </div>
        )}

        {evidence && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-accent-teal/20 text-accent-teal border border-accent-teal/30">
                  {evidence.work_order.work_order_id}
                </span>
                <span className="text-xs text-slate-400">
                  Ward {evidence.work_order.ward_code} • Road {evidence.work_order.road_id}
                </span>
                <EvidenceBadge provenance={evidence.work_order.provenance} />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {evidence.work_order.repair_method}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Contractor: <span className="text-slate-200 font-medium">{evidence.work_order.contractor_name}</span> ({evidence.work_order.contractor_id})
              </p>
            </div>

            {/* Financial Reconciliation Box */}
            <div className="p-4 bg-navy-950 border border-slate-800 rounded-xl">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Financial Audit Reconciliation
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 block">Recorded Billed Cost</span>
                  <span className="text-lg font-bold font-mono text-white">
                    ₹{evidence.financial_audit.billed_cost_inr.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Billed by contractor</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Rate Card Benchmark</span>
                  <span className="text-lg font-bold font-mono text-slate-200">
                    {evidence.financial_audit.expected_cost_inr ? `₹${evidence.financial_audit.expected_cost_inr.toLocaleString()}` : 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {evidence.rate_card ? `₹${evidence.rate_card.standard_rate_inr.toLocaleString()} ${evidence.rate_card.unit}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Cost Variance</span>
                  <span className={`text-lg font-bold font-mono ${
                    (evidence.financial_audit.cost_variance_pct || 0) > 30 ? 'text-accent-rose' :
                    (evidence.financial_audit.cost_variance_pct || 0) > 20 ? 'text-accent-amber' : 'text-accent-emerald'
                  }`}>
                    {evidence.financial_audit.cost_variance_pct !== undefined ? (
                      `${evidence.financial_audit.cost_variance_pct > 0 ? '+' : ''}${evidence.financial_audit.cost_variance_pct}%`
                    ) : '0%'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {evidence.financial_audit.is_overbilled_flag ? '⚠️ Exceeds 30% band' : 'Normal range'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Repaired Area</span>
                  <span className="text-lg font-bold font-mono text-white">
                    {evidence.work_order.area_sqm} <span className="text-xs text-slate-400 font-sans font-normal">sqm</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Measured surface</span>
                </div>
              </div>

              {evidence.financial_audit.is_dlp_breach_flag && (
                <div className="mt-3.5 p-2.5 rounded-lg bg-accent-rose/10 border border-accent-rose/30 flex items-start gap-2 text-xs text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-accent-rose shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">DLP Warranty Notice:</span>
                    Recorded work on a road marked under Defect Liability Period — contract/warranty review required before payment.
                  </div>
                </div>
              )}
            </div>

            {/* Timelines & Durability */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-navy-850 border border-slate-800 rounded-xl">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent-teal" />
                  Execution Timeline & SLA
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Assigned:</span>
                    <span className="font-mono text-slate-200">{evidence.work_order.assigned_at}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Work Started:</span>
                    <span className="font-mono text-slate-200">{evidence.work_order.work_started_at}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Completed:</span>
                    <span className="font-mono text-slate-200">{evidence.work_order.completed_at}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-2">
                    <span className="text-slate-400">SLA Target ({evidence.work_order.sla_hours}h):</span>
                    <span className={`font-semibold flex items-center gap-1 ${evidence.work_order.sla_met ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                      {evidence.work_order.sla_met ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {evidence.work_order.sla_met ? 'SLA Met' : 'Breached SLA'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-navy-850 border border-slate-800 rounded-xl">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" />
                  30-Day Durability Status
                </h4>
                <div className="p-3 rounded-lg bg-navy-950 border border-slate-800 text-xs mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400">Reopened in 30 Days:</span>
                    <span className={`font-semibold px-2 py-0.5 rounded ${
                      evidence.work_order.reopened_within_30d
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {evidence.work_order.reopened_within_30d ? 'YES (Premature Failure)' : 'NO (Held Up)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {evidence.work_order.reopened_within_30d
                      ? 'Fix failed within 30 days of completion. Indicates rapid asphalt debonding or substandard binder under heavy rain.'
                      : 'No repeat complaint or repair logged within 30 days of sign-off.'}
                  </p>
                </div>
                {evidence.work_order.engineer_remark && (
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400 block text-[11px]">Site Engineer Remark:</span>
                    <span className="italic text-slate-300">"{evidence.work_order.engineer_remark}"</span>
                  </div>
                )}
              </div>
            </div>

            {/* Linked Citizen Complaints */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent-teal" />
                Linked Citizen Complaints ({evidence.linked_complaints.length})
              </h4>
              {evidence.linked_complaints.length === 0 ? (
                <div className="p-3 bg-navy-950 border border-slate-800 rounded-lg text-xs text-slate-400 italic">
                  No citizen complaint linked. Municipal engineering-initiated or scheduled maintenance job.
                </div>
              ) : (
                <div className="space-y-2">
                  {evidence.linked_complaints.map(c => (
                    <div key={c.complaint_id} className="p-3 bg-navy-950 border border-slate-800/80 rounded-lg text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-accent-teal">{c.complaint_id}</span>
                        <span className="text-slate-400">{c.channel} • {c.received_at}</span>
                      </div>
                      <p className="text-slate-200 mb-1">{c.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Category: <strong className="text-slate-300">{c.category_reported}</strong></span>
                        <span className="px-1.5 py-0.5 rounded bg-navy-850 text-slate-300 border border-slate-700/50">{c.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Raw Provenances */}
            <div className="p-3 bg-navy-950/70 border border-slate-800 rounded-lg">
              <span className="text-[11px] text-slate-400 font-medium block mb-1.5">
                Source Dataset Provenance Trail:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {evidence.provenances.map((p, idx) => (
                  <EvidenceBadge key={idx} provenance={p} />
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              {onNavigateRoad && evidence.work_order.road_id && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateRoad(evidence.work_order.road_id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  View Road Passport ({evidence.work_order.road_id})
                </button>
              )}
              {onNavigateGraph && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateGraph(evidence.work_order.work_order_id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent-teal/20 hover:bg-accent-teal/30 text-accent-teal border border-accent-teal/40 transition-colors"
                >
                  Inspect in Money Trace Graph
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
