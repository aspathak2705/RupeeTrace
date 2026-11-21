import React, { useEffect, useState } from 'react';
import {
  Compass, QrCode, GitBranch, ShieldAlert, CheckCircle2, Clock,
  AlertTriangle, FileText, ArrowRight, Activity, Building, MapPin,
  ExternalLink, Calendar, Car, AlertOctagon, HeartHandshake, Eye
} from 'lucide-react';
import { RoadDetail, Complaint, WorkOrder, RoadFinancialHistory, AuditFinding, CaseRecord } from '../types';
import { api } from '../api/client';
import { EvidenceBadge } from '../components/EvidenceBadge';
import { QRCodeModal } from '../components/QRCodeModal';

interface Props {
  roadId: string;
  onSelectWorkOrder: (woId: string) => void;
  onNavigateGraph: (roadId: string) => void;
  onNavigateCreateCase?: (roadId: string) => void;
}

export const RoadPassportView: React.FC<Props> = ({
  roadId,
  onSelectWorkOrder,
  onNavigateGraph,
  onNavigateCreateCase
}) => {
  const [road, setRoad] = useState<RoadDetail | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [history, setHistory] = useState<RoadFinancialHistory | null>(null);
  const [auditFindings, setAuditFindings] = useState<AuditFinding[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeChapter, setActiveChapter] = useState<number>(1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getRoadDetail(roadId),
      api.getRoadComplaints(roadId),
      api.getRoadFinancialHistory(roadId),
      api.getAuditFindings({ road_id: roadId }),
      api.getCases({ road_id: roadId })
    ])
      .then(([roadData, compData, histData, auditData, caseData]) => {
        setRoad(roadData);
        setComplaints(compData);
        setHistory(histData);
        setAuditFindings(auditData);
        setCases(caseData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [roadId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-slate-400">
        <div className="w-10 h-10 border-2 border-accent-emerald border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">Assembling Road Passport for {roadId}...</p>
      </div>
    );
  }

  if (error || !road) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 bg-navy-900 border border-rose-500/30 rounded-2xl text-center">
        <AlertTriangle className="w-10 h-10 text-accent-rose mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-1">Road Asset {roadId} Not Found</h2>
        <p className="text-xs text-slate-400 mb-4">{error || 'Asset not registered in database.'}</p>
      </div>
    );
  }

  // Combined chronological timeline items
  const timelineItems: Array<{
    date: string;
    type: 'complaint' | 'work_order' | 'audit' | 'case';
    title: string;
    subtitle: string;
    statusBadge?: string;
    recordId: string;
  }> = [];

  complaints.forEach(c => {
    timelineItems.push({
      date: c.received_at,
      type: 'complaint',
      title: `Citizen Complaint: ${c.category_reported}`,
      subtitle: `${c.channel} • Anonymized User • ${c.status}`,
      statusBadge: c.status,
      recordId: c.complaint_id
    });
  });

  if (history) {
    history.repair_history.forEach(wo => {
      timelineItems.push({
        date: wo.completed_at || wo.assigned_at,
        type: 'work_order',
        title: `Repair Completed: ${wo.repair_method}`,
        subtitle: `Contractor: ${wo.contractor_name} • Billed: ₹${wo.recorded_billed_cost_inr.toLocaleString()} • ${wo.sla_met ? 'SLA Met' : 'Missed SLA'}`,
        statusBadge: wo.reopened_within_30d ? 'Reopened in 30d' : 'Held Up',
        recordId: wo.work_order_id
      });
    });
  }

  cases.forEach(cs => {
    timelineItems.push({
      date: cs.created_at,
      type: 'case',
      title: `Observation Case: ${cs.status}`,
      subtitle: cs.officer_response ? `Officer Note: ${cs.officer_response.slice(0, 80)}...` : cs.citizen_observation.slice(0, 80),
      statusBadge: cs.status,
      recordId: cs.case_id
    });
  });

  // Sort timeline newest first
  timelineItems.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      
      {/* Canonical Passport Header */}
      <div className="p-6 sm:p-8 bg-gradient-to-b from-navy-900 to-navy-950 border border-slate-800 rounded-3xl shadow-xl relative overflow-hidden">
        {/* Synthetic Watermark */}
        <div className="absolute -right-8 -bottom-10 select-none opacity-5 pointer-events-none">
          <Compass className="w-80 h-80 text-white" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30">
                ROAD PASSPORT • {road.road_id}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Ward {road.ward_code} • Segment #{road.segment_no}
              </span>
              {road.under_dlp ? (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Under DLP Warranty
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  DLP Expired
                </span>
              )}
              <EvidenceBadge provenance={road.provenance} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {road.road_name}
            </h1>

            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Canonical Asset Identity: <strong className="text-slate-300 font-mono">{road.road_id}</strong>. 
              Coordinates: ({road.start_lat.toFixed(4)}, {road.start_lon.toFixed(4)}) to ({road.end_lat.toFixed(4)}, {road.end_lon.toFixed(4)}).
            </p>
          </div>

          {/* Signature Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 border border-slate-700 shadow-sm transition-all"
            >
              <QrCode className="w-4 h-4 text-accent-teal" />
              Passport QR Tag
            </button>

            <button
              onClick={() => onNavigateGraph(road.road_id)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-accent-teal/20 hover:bg-accent-teal/30 text-accent-teal border border-accent-teal/40 transition-all"
            >
              <GitBranch className="w-4 h-4" />
              Trace Money Graph
            </button>
          </div>
        </div>

        {/* Quick Spec Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block">Road Classification</span>
            <span className="font-semibold text-slate-100">{road.road_type}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Surface Type</span>
            <span className="font-semibold text-slate-100">{road.surface}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Segment Length</span>
            <span className="font-mono font-semibold text-slate-100">{road.length_m} m ({road.lanes} Lanes)</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Last Resurfaced</span>
            <span className="font-mono text-slate-200">{road.last_resurfaced || 'Not recorded'}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Recorded Repair Spend</span>
            <span className="font-mono font-bold text-accent-teal">₹{road.total_spend_inr.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">BEST Bus Corridor</span>
            <span className="font-semibold text-slate-200">{road.bus_route ? 'YES (High Wear)' : 'Local Traffic'}</span>
          </div>
        </div>

        <div className="mt-4 p-2.5 bg-navy-950/70 border border-slate-800 rounded-lg text-[11px] text-slate-400">
          ⚠️ <strong>Synthetic Dataset Notice:</strong> Road geometry and repair history are synthetic civic models. Data does not represent real BMC work orders or physical road defects.
        </div>
      </div>

      {/* Chapter Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar text-xs">
        {[
          { num: 1, name: 'Road Identity' },
          { num: 2, name: 'Citizen History' },
          { num: 3, name: 'Construction & Repairs' },
          { num: 4, name: 'Money History' },
          { num: 5, name: 'Repair Performance' },
          { num: 6, name: 'Accountability & Cases' }
        ].map(ch => (
          <button
            key={ch.num}
            onClick={() => setActiveChapter(ch.num)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium ${
              activeChapter === ch.num
                ? 'bg-accent-teal/20 text-accent-teal border border-accent-teal/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-900'
            }`}
          >
            Ch. {ch.num}: {ch.name}
          </button>
        ))}
      </div>

      {/* Chapter Content Switcher */}
      <div className="space-y-6">
        
        {/* CHAPTER 1 — Road Identity */}
        {activeChapter === 1 && (
          <div className="p-6 bg-navy-900 border border-slate-800 rounded-2xl space-y-4 animate-fadeIn">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-accent-teal" />
              Chapter 1 — Road Identity & Physical Assets
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Documented segment attributes from municipal arterial survey records. No sanitized promises or unverified road expansion projects are included.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-navy-950 border border-slate-800/80 rounded-xl space-y-2 text-xs">
                <h4 className="font-semibold text-slate-200">Segment Profile</h4>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Road Identifier:</span>
                  <span className="font-mono text-slate-200 font-bold">{road.road_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Arterial Name:</span>
                  <span className="text-slate-200">{road.road_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Classification:</span>
                  <span className="text-slate-200">{road.road_type}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Surface Engineering:</span>
                  <span className="text-slate-200 font-medium">{road.surface}</span>
                </div>
              </div>

              <div className="p-4 bg-navy-950 border border-slate-800/80 rounded-xl space-y-2 text-xs">
                <h4 className="font-semibold text-slate-200">Warranty & Administrative Zone</h4>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Defect Liability Status:</span>
                  <span className={`font-semibold ${road.under_dlp ? 'text-accent-rose' : 'text-slate-400'}`}>
                    {road.under_dlp ? 'Active DLP Warranty' : 'Expired / Out of Warranty'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Last Surface Resurfacing:</span>
                  <span className="font-mono text-slate-200">{road.last_resurfaced || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Public Transit Route:</span>
                  <span className="text-slate-200">{road.bus_route ? 'BEST Heavy Vehicle Corridor' : 'Non-transit'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Jurisdiction:</span>
                  <span className="text-slate-200 font-medium">BMC Ward {road.ward_code}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHAPTER 2 — Citizen History */}
        {activeChapter === 2 && (
          <div className="p-6 bg-navy-900 border border-slate-800 rounded-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent-teal" />
                  Chapter 2 — Citizen History & Complaint Log ({complaints.length})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Citizen complaints linked to this road segment. All personal complainant identifiers are masked for privacy.
                </p>
              </div>
              {onNavigateCreateCase && (
                <button
                  onClick={() => onNavigateCreateCase(road.road_id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent-teal/20 text-accent-teal border border-accent-teal/30 hover:bg-accent-teal/30 transition-colors"
                >
                  + Log Citizen Observation
                </button>
              )}
            </div>

            {complaints.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-navy-950 rounded-xl">
                No citizen complaints recorded for this road segment during the 2025 monsoon cycle.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 bg-navy-950 rounded-xl border border-slate-800">
                {complaints.map(c => (
                  <div key={c.complaint_id} className="p-4 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-accent-teal">{c.complaint_id}</span>
                        <span className="px-2 py-0.2 rounded bg-navy-850 text-slate-300 font-medium border border-slate-700">
                          {c.category_reported}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{c.received_at}</span>
                    </div>

                    <p className="text-slate-200 leading-relaxed font-sans">{c.description}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                      <span>Channel: <strong className="text-slate-300">{c.channel}</strong> • Upvotes: {c.upvotes}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-navy-900 border border-slate-800 text-slate-300">
                          Status: {c.status}
                        </span>
                        <EvidenceBadge provenance={c.provenance} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAPTER 3 — Construction and Repairs */}
        {activeChapter === 3 && (
          <div className="p-6 bg-navy-900 border border-slate-800 rounded-2xl space-y-4 animate-fadeIn">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent-teal" />
              Chapter 3 — Construction & Work Order Timeline
            </h2>
            <p className="text-xs text-slate-400">
              Chronological log of repair interventions recorded on this segment. Click any job to inspect full audit evidence.
            </p>

            {(!history || history.repair_history.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-navy-950 rounded-xl">
                No recorded work orders executed on this segment during this monsoon period.
              </div>
            ) : (
              <div className="space-y-3">
                {history.repair_history.map(wo => (
                  <div
                    key={wo.work_order_id}
                    onClick={() => onSelectWorkOrder(wo.work_order_id)}
                    className="p-4 bg-navy-950 hover:bg-navy-850 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-accent-teal group-hover:underline">
                          {wo.work_order_id}
                        </span>
                        <span className="font-semibold text-white">{wo.repair_method}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-100 text-sm">
                        ₹{wo.recorded_billed_cost_inr.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <span>Contractor: <strong className="text-slate-300">{wo.contractor_name}</strong></span>
                      <span>Completed: <strong className="text-slate-300 font-mono">{wo.completed_at}</strong></span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      <span className={`px-2 py-0.5 rounded font-medium ${
                        wo.sla_met ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}>
                        {wo.sla_met ? 'Met SLA Target' : 'Missed Target SLA'}
                      </span>
                      {wo.reopened_within_30d && (
                        <span className="px-2 py-0.5 rounded font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Reopened in 30 Days (Failed Fix)
                        </span>
                      )}
                      {wo.is_dlp_breach && (
                        <span className="px-2 py-0.5 rounded font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          DLP Warranty Flag
                        </span>
                      )}
                      <span className="ml-auto text-accent-teal flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Inspect Evidence <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAPTER 4 — Money History */}
        {activeChapter === 4 && (
          <div className="p-6 bg-navy-900 border border-slate-800 rounded-2xl space-y-5 animate-fadeIn">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-accent-teal font-mono">₹</span>
              Chapter 4 — Money History & Financial Accountability
            </h2>
            <p className="text-xs text-slate-400">
              Clear reconciliation of billed work order expenditures versus standard rate card benchmarks.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-navy-950 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Recorded Billed Cost</span>
                <span className="text-2xl font-bold font-mono text-accent-teal mt-1 block">
                  ₹{road.total_spend_inr.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Across {road.total_work_orders} work orders
                </span>
              </div>

              <div className="p-4 bg-navy-950 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">DLP Warranty Breach Spend</span>
                <span className="text-2xl font-bold font-mono text-accent-rose mt-1 block">
                  ₹{(history?.dlp_breach_recorded_spend_inr || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-rose-300 block mt-1">
                  Billed to BMC while road marked under warranty
                </span>
              </div>

              <div className="p-4 bg-navy-950 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Repeat Repair Count</span>
                <span className="text-2xl font-bold font-mono text-accent-amber mt-1 block">
                  {history?.repeat_repair_count || 0}
                </span>
                <span className="text-[10px] text-amber-300 block mt-1">
                  Multiple interventions on same segment
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-navy-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <span className="font-semibold text-slate-200 block">Municipal Accounting Boundary:</span>
              <p className="text-slate-400 text-xs leading-relaxed">
                RupeeTrace documents contractor billed expenditure submitted on completed jobs. No direct bank clearing vouchers or treasury disbursement records are accessible in this civic dataset.
              </p>
            </div>
          </div>
        )}

        {/* CHAPTER 5 — Repair Performance */}
        {activeChapter === 5 && (
          <div className="p-6 bg-navy-900 border border-slate-800 rounded-2xl space-y-5 animate-fadeIn">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent-emerald" />
              Chapter 5 — Repair Performance, Safety & Flood Context
            </h2>
            <p className="text-xs text-slate-400">
              Evaluates environmental stress and traffic factors without claiming these prove physical engineering negligence.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Traffic Box */}
              <div className="p-4 bg-navy-950 border border-slate-800 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-accent-teal font-semibold">
                  <Car className="w-4 h-4" />
                  Traffic Congestion Profile
                </div>
                {road.traffic ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Congestion Index (0-10):</span>
                      <span className="font-bold text-slate-100">{road.traffic.congestion_index_0_10} / 10</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Peak Hour Vehicles:</span>
                      <span className="font-mono text-slate-200">{road.traffic.peak_hour_vehicles.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Avg Peak Speed:</span>
                      <span className="text-slate-200">{road.traffic.avg_peak_speed_kmph} km/h</span>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500">Traffic profile not measured.</p>
                )}
              </div>

              {/* Safety & Accidents */}
              <div className="p-4 bg-navy-950 border border-slate-800 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-accent-rose font-semibold">
                  <AlertOctagon className="w-4 h-4" />
                  Historical Accidents ({road.accidents_recorded.length})
                </div>
                {road.accidents_recorded.length === 0 ? (
                  <p className="text-slate-400">Zero recorded road accidents on this segment.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {road.accidents_recorded.map(a => (
                      <div key={a.accident_id} className="p-1.5 rounded bg-navy-900 border border-slate-800 text-[11px]">
                        <span className="font-bold text-slate-200">{a.severity}:</span> {a.probable_cause} ({a.vehicle_type})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Flood Context */}
              <div className="p-4 bg-navy-950 border border-slate-800 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-accent-amber font-semibold">
                  <MapPin className="w-4 h-4" />
                  Chronic Flood Hotspots ({road.nearby_flood_hotspots.length})
                </div>
                {road.nearby_flood_hotspots.length === 0 ? (
                  <p className="text-slate-400">No chronic flood hotspots within immediate proximity.</p>
                ) : (
                  <div className="space-y-1.5">
                    {road.nearby_flood_hotspots.map(fh => (
                      <div key={fh.hotspot_id} className="p-1.5 rounded bg-navy-900 border border-slate-800 text-[11px]">
                        <span className="font-semibold text-slate-200">{fh.name}</span>
                        <span className="block text-slate-400">
                          Depth: {fh.avg_water_depth_cm} cm • Distance: {fh.distance_m ? `${fh.distance_m} m` : 'Adjacent'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CHAPTER 6 — Accountability & Cases */}
        {activeChapter === 6 && (
          <div className="p-6 bg-navy-900 border border-slate-800 rounded-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-accent-rose" />
                  Chapter 6 — Audit Findings & Demonstration Cases
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Screening flags and shared citizen-officer follow-up cases linked to this asset.
                </p>
              </div>
              {onNavigateCreateCase && (
                <button
                  onClick={() => onNavigateCreateCase(road.road_id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent-teal/20 text-accent-teal border border-accent-teal/30 hover:bg-accent-teal/30 transition-colors"
                >
                  + Log Citizen Observation
                </button>
              )}
            </div>

            {/* Audit Findings */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                Automated Audit Findings ({auditFindings.length})
              </h4>
              {auditFindings.length === 0 ? (
                <div className="p-4 bg-navy-950 border border-slate-800 rounded-xl text-xs text-slate-400">
                  No automated audit deviation flags generated for this road segment.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auditFindings.map(f => (
                    <div key={f.finding_id} className="p-3.5 bg-navy-950 border border-slate-800 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-accent-rose">{f.finding_id}</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          {f.status}
                        </span>
                      </div>
                      <p className="text-slate-200">{f.reason}</p>
                      <div className="text-[11px] text-slate-400">
                        <strong>Recommended Action:</strong> {f.recommended_action}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Citizen-Officer Shared Cases */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                Shared Citizen & Officer Cases ({cases.length})
              </h4>
              {cases.length === 0 ? (
                <div className="p-4 bg-navy-950 border border-slate-800 rounded-xl text-xs text-slate-400">
                  No citizen follow-up cases active on this road.
                </div>
              ) : (
                <div className="space-y-3">
                  {cases.map(cs => (
                    <div key={cs.case_id} className="p-4 bg-navy-950 border border-slate-800 rounded-xl text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-accent-teal">{cs.case_id}</span>
                        <span className="px-2 py-0.5 rounded font-semibold bg-navy-850 text-slate-300 border border-slate-700">
                          {cs.status}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-navy-900 border border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-semibold">Citizen Observation:</span>
                        <p className="text-slate-200 mt-0.5">{cs.citizen_observation}</p>
                      </div>
                      {cs.officer_response && (
                        <div className="p-2.5 rounded bg-accent-emerald/10 border border-accent-emerald/30 text-emerald-200">
                          <span className="text-[11px] text-accent-emerald block font-semibold">
                            Official Clarification ({cs.officer_name}):
                          </span>
                          <p className="mt-0.5">{cs.officer_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Visual Chronological Timeline (Unified across all chapters) */}
      <div className="p-6 bg-navy-900 border border-slate-800 rounded-2xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent-teal" />
          Road Asset Chronological Event Log ({timelineItems.length})
        </h3>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {timelineItems.slice(0, 15).map((item, idx) => (
            <div key={idx} className="relative group">
              {/* Dot */}
              <div className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2 ${
                item.type === 'work_order' ? 'bg-accent-emerald border-navy-900' :
                item.type === 'complaint' ? 'bg-accent-teal border-navy-900' :
                item.type === 'case' ? 'bg-accent-amber border-navy-900' :
                'bg-accent-rose border-navy-900'
              }`} />

              <div className="p-3 bg-navy-950 border border-slate-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-400">{item.date}</span>
                  {item.statusBadge && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-navy-850 text-slate-300 border border-slate-700">
                      {item.statusBadge}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-slate-200">{item.title}</h4>
                <p className="text-slate-400 text-[11px]">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code Modal Component */}
      <QRCodeModal
        roadId={road.road_id}
        roadName={road.road_name}
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />

    </div>
  );
};
