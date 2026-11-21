import React, { useEffect, useState } from 'react';
import {
  Compass, QrCode, GitBranch, ShieldAlert, CheckCircle2, Clock,
  AlertTriangle, FileText, ArrowRight, Activity, Building, MapPin,
  ExternalLink, Calendar, Car, AlertOctagon, HeartHandshake, Eye, Printer
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
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-rt-secondary-text font-body">
        <div className="w-10 h-10 border-3 border-rt-ink border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-mono font-bold uppercase tracking-wider text-rt-ink">
          Assembling Official Road Passport for {roadId}...
        </p>
      </div>
    );
  }

  if (error || !road) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 bg-white border-3 border-rt-ink rounded-[4px] shadow-brutal text-center font-body">
        <AlertTriangle className="w-10 h-10 text-rt-coral mx-auto mb-3" />
        <h2 className="text-2xl font-headline font-black text-rt-ink mb-1">Road Asset {roadId} Not Found</h2>
        <p className="text-xs font-mono text-rt-secondary-text mb-4">{error || 'Asset not registered in verified database.'}</p>
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
      subtitle: `${c.channel} • Anonymized Complainant • ${c.status}`,
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
        subtitle: `Contractor: ${wo.contractor_name} • Billed: ₹${wo.recorded_billed_cost_inr.toLocaleString('en-IN')} • ${wo.sla_met ? 'SLA Met' : 'Missed SLA'}`,
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
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-body pb-20">
      
      {/* Canonical Passport Official Header */}
      <div className="p-6 sm:p-8 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal-xl relative overflow-hidden">
        {/* Top Watermark / Asset Stamp */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 border-b-2 border-rt-ink pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-[3px] text-xs font-mono font-bold bg-rt-primary border border-rt-ink text-rt-ink shadow-[1.5px_1.5px_0px_#171717]">
                ROAD PASSPORT • {road.road_id}
              </span>
              <span className="text-xs font-mono font-bold text-rt-ink bg-rt-canvas px-2 py-0.5 rounded border border-rt-ink">
                WARD {road.ward_code} • SEGMENT #{road.segment_no}
              </span>
              {road.under_dlp ? (
                <span className="px-2 py-0.5 rounded-[3px] text-xs font-bold bg-rt-coral text-white border border-rt-ink flex items-center gap-1 shadow-[1px_1px_0px_#171717]">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  UNDER DLP WARRANTY
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-[3px] text-xs font-bold bg-rt-muted text-rt-ink border border-rt-ink">
                  DLP EXPIRED
                </span>
              )}
              <EvidenceBadge provenance={road.provenance} />
            </div>

            <h1 className="text-3xl sm:text-4xl font-headline font-black text-rt-ink tracking-tight">
              {road.road_name}
            </h1>

            <p className="text-xs font-mono text-rt-secondary-text mt-1.5 max-w-2xl">
              Canonical Asset Identity: <strong className="text-rt-ink font-bold">{road.road_id}</strong>. 
              Coordinates: ({road.start_lat.toFixed(4)}, {road.start_lon.toFixed(4)}) to ({road.end_lat.toFixed(4)}, {road.end_lon.toFixed(4)}).
            </p>
          </div>

          {/* Signature Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-headline font-bold rounded-[4px] bg-white hover:bg-rt-canvas text-rt-ink border-2 border-rt-ink shadow-brutal-sm hover:shadow-brutal active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              <QrCode className="w-4 h-4 text-rt-ink" />
              <span>Asset QR Tag</span>
            </button>

            <button
              onClick={() => onNavigateGraph(road.road_id)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-headline font-bold rounded-[4px] bg-rt-primary hover:bg-yellow-300 text-rt-ink border-2 border-rt-ink shadow-brutal-sm hover:shadow-brutal active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              <GitBranch className="w-4 h-4 text-rt-ink" />
              <span>Trace Money Graph</span>
            </button>
          </div>
        </div>

        {/* Quick Spec Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-6 pt-2 text-xs font-mono">
          <div className="p-3 bg-rt-canvas border border-rt-ink rounded-[3px]">
            <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Classification</span>
            <span className="font-bold text-rt-ink text-sm block mt-0.5">{road.road_type}</span>
          </div>
          <div className="p-3 bg-rt-canvas border border-rt-ink rounded-[3px]">
            <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Surface Engineering</span>
            <span className="font-bold text-rt-ink text-sm block mt-0.5">{road.surface}</span>
          </div>
          <div className="p-3 bg-rt-canvas border border-rt-ink rounded-[3px]">
            <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Length / Lanes</span>
            <span className="font-bold text-rt-ink text-sm block mt-0.5">{road.length_m} m ({road.lanes} L)</span>
          </div>
          <div className="p-3 bg-rt-canvas border border-rt-ink rounded-[3px]">
            <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Last Resurfaced</span>
            <span className="font-bold text-rt-ink text-sm block mt-0.5">{road.last_resurfaced || 'N/A'}</span>
          </div>
          <div className="p-3 bg-rt-primary border border-rt-ink rounded-[3px]">
            <span className="text-[10px] text-rt-ink uppercase font-bold block">Recorded Spend</span>
            <span className="font-black font-financial text-rt-ink text-sm block mt-0.5">₹{road.total_spend_inr.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-3 bg-rt-canvas border border-rt-ink rounded-[3px]">
            <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Heavy Corridor</span>
            <span className="font-bold text-rt-ink text-sm block mt-0.5">{road.bus_route ? 'BEST Route' : 'Local'}</span>
          </div>
        </div>

        <div className="mt-4 p-2.5 bg-rt-muted border border-rt-ink rounded-[3px] text-[11px] font-mono text-rt-secondary-text">
          ⚠️ <strong>SYNTHETIC ASSET DISCLAIMER:</strong> Geometry and repair histories are synthetic civic research data. Does not represent actual BMC site measurements.
        </div>
      </div>

      {/* Chapter Tabs Navigation Bar */}
      <div className="flex items-center space-x-2 border-b-2 border-rt-ink pb-3 overflow-x-auto no-scrollbar text-xs font-headline">
        {[
          { num: 1, name: '01 ROAD IDENTITY' },
          { num: 2, name: '02 CITIZEN HISTORY' },
          { num: 3, name: '03 REPAIRS & SCOPE' },
          { num: 4, name: '04 MONEY HISTORY' },
          { num: 5, name: '05 DURABILITY' },
          { num: 6, name: '06 CASES & ACTIONS' }
        ].map(ch => (
          <button
            key={ch.num}
            onClick={() => setActiveChapter(ch.num)}
            className={`px-3.5 py-2 rounded-[4px] whitespace-nowrap transition-all font-bold border-2 border-rt-ink ${
              activeChapter === ch.num
                ? 'bg-rt-primary text-rt-ink shadow-brutal-sm'
                : 'bg-white hover:bg-rt-canvas text-rt-ink shadow-[1.5px_1.5px_0px_#171717]'
            }`}
          >
            {ch.name}
          </button>
        ))}
      </div>

      {/* Chapter Content Switcher */}
      <div className="space-y-6">
        
        {/* CHAPTER 1 — Road Identity */}
        {activeChapter === 1 && (
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
            <h2 className="text-lg font-headline font-black text-rt-ink uppercase tracking-wider flex items-center gap-2 border-b-2 border-rt-ink pb-3">
              <Compass className="w-5 h-5 text-rt-ink" />
              Chapter 01 — Road Identity & Physical Assets
            </h2>
            <p className="text-xs font-mono text-rt-secondary-text leading-relaxed">
              Documented segment attributes from municipal arterial survey records. No sanitized promises or unverified road expansion projects are included.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-mono">
              <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] space-y-2.5 text-xs shadow-brutal-sm">
                <h4 className="font-headline font-bold text-rt-ink uppercase text-sm border-b border-rt-ink/20 pb-1.5">Segment Profile</h4>
                <div className="flex justify-between py-1 border-b border-rt-ink/10">
                  <span className="text-rt-secondary-text font-bold">Road Identifier:</span>
                  <span className="text-rt-ink font-bold">{road.road_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-rt-ink/10">
                  <span className="text-rt-secondary-text font-bold">Arterial Name:</span>
                  <span className="text-rt-ink">{road.road_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-rt-ink/10">
                  <span className="text-rt-secondary-text font-bold">Classification:</span>
                  <span className="text-rt-ink">{road.road_type}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-rt-secondary-text font-bold">Surface Engineering:</span>
                  <span className="text-rt-ink font-bold">{road.surface}</span>
                </div>
              </div>

              <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] space-y-2.5 text-xs shadow-brutal-sm">
                <h4 className="font-headline font-bold text-rt-ink uppercase text-sm border-b border-rt-ink/20 pb-1.5">Warranty & Administration</h4>
                <div className="flex justify-between py-1 border-b border-rt-ink/10">
                  <span className="text-rt-secondary-text font-bold">Defect Liability:</span>
                  <span className={`font-bold px-1.5 py-0.2 rounded border border-rt-ink ${road.under_dlp ? 'bg-rt-coral text-white' : 'bg-white text-rt-ink'}`}>
                    {road.under_dlp ? 'Active DLP Warranty' : 'Expired'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-rt-ink/10">
                  <span className="text-rt-secondary-text font-bold">Last Resurfaced:</span>
                  <span className="text-rt-ink font-bold">{road.last_resurfaced || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-rt-ink/10">
                  <span className="text-rt-secondary-text font-bold">Transit Route:</span>
                  <span className="text-rt-ink">{road.bus_route ? 'BEST Heavy Transit Corridor' : 'Local Traffic'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-rt-secondary-text font-bold">Jurisdiction:</span>
                  <span className="text-rt-ink font-bold">BMC Ward {road.ward_code}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHAPTER 2 — Citizen History */}
        {activeChapter === 2 && (
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-rt-ink pb-3">
              <div>
                <h2 className="text-lg font-headline font-black text-rt-ink uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-rt-ink" />
                  Chapter 02 — Citizen History & Complaint Log ({complaints.length})
                </h2>
                <p className="text-xs font-mono text-rt-secondary-text mt-0.5">
                  Citizen complaints linked to this road segment. All personal complainant identifiers are masked for privacy.
                </p>
              </div>
              {onNavigateCreateCase && (
                <button
                  onClick={() => onNavigateCreateCase(road.road_id)}
                  className="px-3 py-1.5 text-xs font-headline font-bold rounded-[4px] bg-rt-mint text-rt-ink border-2 border-rt-ink shadow-brutal-sm hover:shadow-brutal transition-all"
                >
                  + Log Observation
                </button>
              )}
            </div>

            {complaints.length === 0 ? (
              <div className="p-8 text-center text-rt-secondary-text text-xs bg-rt-canvas border-2 border-rt-ink rounded-[4px] font-mono">
                No citizen complaints recorded for this road segment during the 2025 monsoon cycle.
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.map(c => (
                  <div key={c.complaint_id} className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-brutal-sm text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-rt-primary px-2 py-0.5 rounded border border-rt-ink text-rt-ink shadow-[1px_1px_0px_#171717]">
                          {c.complaint_id}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white text-rt-ink font-bold border border-rt-ink">
                          {c.category_reported}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-rt-secondary-text">{c.received_at}</span>
                    </div>

                    <p className="text-rt-ink leading-relaxed font-body font-medium">{c.description}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-rt-secondary-text">
                      <span>Channel: <strong className="text-rt-ink">{c.channel}</strong> • Upvotes: {c.upvotes}</span>
                      <span className="px-2 py-0.5 rounded bg-white border border-rt-ink text-rt-ink font-bold">
                        Status: {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAPTER 3 — Construction & Repairs */}
        {activeChapter === 3 && (
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
            <h2 className="text-lg font-headline font-black text-rt-ink uppercase tracking-wider flex items-center gap-2 border-b-2 border-rt-ink pb-3">
              <Building className="w-5 h-5 text-rt-ink" />
              Chapter 03 — Executed Work Orders ({history?.repair_history.length || 0})
            </h2>
            <p className="text-xs font-mono text-rt-secondary-text">
              Documented municipal road repair contracts executed on this segment. Click any work order to inspect its full evidence docket.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {(history?.repair_history || []).map(wo => (
                <div
                  key={wo.work_order_id}
                  onClick={() => onSelectWorkOrder(wo.work_order_id)}
                  className="p-4 bg-rt-canvas hover:bg-yellow-50 border-2 border-rt-ink rounded-[4px] shadow-brutal-sm cursor-pointer transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-rt-ink text-white px-2 py-0.5 rounded">
                      {wo.work_order_id}
                    </span>
                    <span className="font-mono font-bold text-rt-ink text-sm font-financial">
                      ₹{wo.recorded_billed_cost_inr.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <h4 className="text-sm font-headline font-bold text-rt-ink">{wo.repair_method}</h4>
                  <p className="text-xs font-mono text-rt-secondary-text">
                    Contractor: <strong className="text-rt-ink">{wo.contractor_name}</strong>
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                    <span className="text-rt-secondary-text">Scope: {wo.area_sqm} sqm</span>
                    <span className={`px-1.5 py-0.2 rounded border border-rt-ink font-bold text-[10px] ${
                      wo.reopened_within_30d ? 'bg-rt-coral text-white' : 'bg-rt-mint text-rt-ink'
                    }`}>
                      {wo.reopened_within_30d ? 'Reopened in 30d' : 'Held Up'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHAPTER 4 — Money History */}
        {activeChapter === 4 && (
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-rt-ink pb-3">
              <div>
                <h2 className="text-lg font-headline font-black text-rt-ink uppercase tracking-wider flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-rt-ink" />
                  Chapter 04 — Financial Expenditure Breakdown
                </h2>
                <p className="text-xs font-mono text-rt-secondary-text mt-0.5">
                  Follow the recorded rupee across contractors, repair techniques, and rate-card variances.
                </p>
              </div>

              <button
                onClick={() => onNavigateGraph(road.road_id)}
                className="px-3.5 py-2 text-xs font-headline font-bold rounded-[4px] bg-rt-primary text-rt-ink border-2 border-rt-ink shadow-brutal-sm hover:shadow-brutal transition-all flex items-center space-x-1.5"
              >
                <span>Open in Money Trace Graph</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 font-mono">
              <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
                <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Total Recorded Spend</span>
                <span className="text-2xl font-black font-financial text-rt-ink mt-1 block">
                  ₹{road.total_spend_inr.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-rt-secondary-text block mt-1">Across all work orders</span>
              </div>

              <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
                <span className="text-[10px] text-rt-coral uppercase font-bold block">Failed Fix Spend</span>
                <span className="text-2xl font-bold font-financial text-rt-coral mt-1 block">
                  ₹{history?.repair_history.filter(w => w.reopened_within_30d).reduce((a, c) => a + c.recorded_billed_cost_inr, 0).toLocaleString('en-IN') || 0}
                </span>
                <span className="text-[10px] text-rt-secondary-text block mt-1">Reopened within 30 days</span>
              </div>

              <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
                <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Executed Work Orders</span>
                <span className="text-2xl font-bold font-financial text-rt-ink mt-1 block">
                  {history?.total_work_orders || 0}
                </span>
                <span className="text-[10px] text-rt-secondary-text block mt-1">Total recorded contracts</span>
              </div>
            </div>
          </div>
        )}

        {/* CHAPTER 5 — Repair Performance & Audit Findings */}
        {activeChapter === 5 && (
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
            <h2 className="text-lg font-headline font-black text-rt-ink uppercase tracking-wider flex items-center gap-2 border-b-2 border-rt-ink pb-3">
              <ShieldAlert className="w-5 h-5 text-rt-coral" />
              Chapter 05 — Audit Findings & Repair Durability
            </h2>
            <p className="text-xs font-mono text-rt-secondary-text">
              Algorithmic screening findings: rate-card deviations, duplicate work orders, and DLP warranty expenditures.
            </p>

            {auditFindings.length === 0 ? (
              <div className="p-6 bg-rt-canvas border-2 border-rt-ink rounded-[4px] text-xs font-mono text-rt-secondary-text">
                No active audit flags triggered for this road asset. Standard variance parameters met.
              </div>
            ) : (
              <div className="space-y-3">
                {auditFindings.map(af => (
                  <div key={af.finding_id} className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold bg-rt-coral text-white px-2 py-0.5 rounded border border-rt-ink">
                          {af.finding_id}
                        </span>
                        <span className="font-headline font-bold text-rt-ink">{af.finding_type}</span>
                      </div>
                      <span className="font-mono font-bold text-rt-coral uppercase text-[10px]">{af.status}</span>
                    </div>
                    <p className="text-rt-ink font-body font-medium">{af.reason}</p>
                    <div className="p-2 bg-rt-canvas rounded border border-rt-ink font-mono text-[11px] text-rt-secondary-text">
                      Recommended Action: <strong className="text-rt-ink">{af.recommended_action}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAPTER 6 — Accountability & Cases */}
        {activeChapter === 6 && (
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-rt-ink pb-3">
              <div>
                <h2 className="text-lg font-headline font-black text-rt-ink uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-5 h-5 text-rt-ink" />
                  Chapter 06 — Citizen & Officer Follow-up Dialogue
                </h2>
                <p className="text-xs font-mono text-rt-secondary-text mt-0.5">
                  Two-way accountability cases logged by citizens and answered by ward executive engineers.
                </p>
              </div>
              {onNavigateCreateCase && (
                <button
                  onClick={() => onNavigateCreateCase(road.road_id)}
                  className="px-3 py-1.5 text-xs font-headline font-bold rounded-[4px] bg-rt-mint text-rt-ink border-2 border-rt-ink shadow-brutal-sm hover:shadow-brutal transition-all"
                >
                  + Create New Case
                </button>
              )}
            </div>

            {cases.length === 0 ? (
              <div className="p-8 text-center text-rt-secondary-text text-xs bg-rt-canvas border-2 border-rt-ink rounded-[4px] font-mono">
                No active follow-up cases on this road. Use "+ Create New Case" to log a field observation.
              </div>
            ) : (
              <div className="space-y-3">
                {cases.map(cs => (
                  <div key={cs.case_id} className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-brutal-sm text-xs space-y-2 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="font-bold bg-white px-2 py-0.5 rounded border border-rt-ink text-rt-ink">
                        {cs.case_id}
                      </span>
                      <span className="font-bold uppercase text-[10px] bg-rt-primary px-2 py-0.5 rounded border border-rt-ink text-rt-ink">
                        {cs.status}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-rt-ink font-body text-rt-ink">
                      <strong>Citizen Observation:</strong> "{cs.citizen_observation}"
                    </div>
                    {cs.officer_response && (
                      <div className="bg-rt-muted p-2.5 rounded border border-rt-ink font-body text-rt-ink">
                        <strong>Official Officer Clarification:</strong> "{cs.officer_response}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unified Chronological Timeline Section */}
      <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-6">
        <div className="border-b-2 border-rt-ink pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-headline font-black text-rt-ink uppercase tracking-wider">
              Chronological Asset Timeline ({timelineItems.length} Records)
            </h3>
            <p className="text-xs font-mono text-rt-secondary-text mt-0.5">
              Verified sequence of complaints, contracted repairs, audit screenings, and engineer follow-ups.
            </p>
          </div>
        </div>

        <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[3px] before:bg-rt-ink">
          {timelineItems.map((item, idx) => (
            <div key={idx} className="relative group">
              {/* Dot on line */}
              <div className="absolute -left-[27px] top-1.5 w-4 h-4 rounded-full bg-rt-primary border-2 border-rt-ink" />

              <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-brutal-sm space-y-1">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[11px] font-bold text-rt-secondary-text">{item.date}</span>
                  <span className="text-[10px] font-bold uppercase bg-white px-1.5 py-0.2 rounded border border-rt-ink text-rt-ink">
                    {item.recordId}
                  </span>
                </div>
                <h4 className="text-sm font-headline font-bold text-rt-ink">{item.title}</h4>
                <p className="text-xs font-body text-rt-secondary-text">{item.subtitle}</p>

                {item.type === 'work_order' && (
                  <button
                    onClick={() => onSelectWorkOrder(item.recordId)}
                    className="mt-2 text-xs font-headline font-bold text-rt-ink hover:underline flex items-center space-x-1"
                  >
                    <span>Inspect Work Order Evidence</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        roadId={road.road_id}
        roadName={road.road_name}
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />
    </div>
  );
};
