import os
import re
import httpx
from typing import Dict, Any, List, Optional
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.core.provenance import SourceProvenance
from rupeetrace.core.config import settings

class AssistantService:
    def __init__(self, rel_service: RelationshipService):
        self.rel_service = rel_service
        self.api_key = settings.ANTHROPIC_API_KEY

    def detect_language(self, text: str) -> str:
        """Detects whether user prompt is English, Hindi, Marathi, or Hinglish."""
        # Devanagari script detection
        devanagari_chars = len(re.findall(r'[\u0900-\u097F]', text))
        if devanagari_chars > 3:
            # Check for Marathi specific vocabulary or verb inflections
            marathi_markers = ['आहे', 'नाही', 'रस्ता', 'रस्त्या', 'खर्च', 'नोंदवला', 'केला', 'का', 'सांगा', 'झाला']
            if any(m in text for m in marathi_markers):
                return "Marathi"
            return "Hindi"

        # Latin script Hinglish markers
        hinglish_markers = ['kya', 'kitna', 'kharcha', 'rasta', 'kaise', 'batao', 'karen', 'kyu', 'hota', 'hai', 'nahi', 'hua']
        lower = text.lower()
        if any(m in lower.split() for m in hinglish_markers):
            return "Hinglish"

        return "English"

    def retrieve_context(self, question: str, default_ward: str = "K/E") -> Dict[str, Any]:
        """
        Retrieval-first extraction: Resolves road_id, work_order_id, ward_code, contractor_id,
        and retrieves bounded records from RelationshipService. Never dumps whole dataset.
        """
        q_upper = question.upper()
        
        # 1. Extract IDs
        road_match = re.search(r'\b(RD\d{4})\b', q_upper)
        wo_match = re.search(r'\b(WO\d{2}-\d{5})\b', q_upper)
        ward_match = re.search(r'\b(WARD\s+)?([A-T](?:/[NSECW])?)\b', q_upper)
        contr_match = re.search(r'\b(CT\d{2})\b', q_upper)

        target_road_id = road_match.group(1) if road_match else None
        target_wo_id = wo_match.group(1) if wo_match else None
        target_ward_code = ward_match.group(2) if ward_match else None
        target_contr_id = contr_match.group(1) if contr_match else None

        # If question mentions Marol or Andheri or similar localities, resolve road
        if not target_road_id:
            if "MAROL" in q_upper:
                target_road_id = "RD0140"
            elif "SHAHID BHAGAT" in q_upper:
                target_road_id = "RD0001"

        context: Dict[str, Any] = {
            "resolved_road": None,
            "resolved_work_order": None,
            "resolved_ward": None,
            "resolved_contractor": None,
            "linked_complaints": [],
            "rate_card": None,
            "audit_findings": [],
            "contractor_scorecard": None,
            "next_rupee_rec": None,
            "cited_provenances": []
        }

        # Resolve Work Order
        if target_wo_id:
            wo = self.rel_service.get_work_order(target_wo_id)
            if wo:
                context["resolved_work_order"] = wo
                context["cited_provenances"].append(wo.provenance)
                if not target_road_id:
                    target_road_id = wo.road_id
                if not target_ward_code:
                    target_ward_code = wo.ward_code
                if not target_contr_id:
                    target_contr_id = wo.contractor_id

                # Resolve rate card
                rc = self.rel_service.rate_card_by_method.get(wo.repair_method)
                if rc:
                    context["rate_card"] = rc
                    context["cited_provenances"].append(rc.provenance)

                # Resolve linked complaints
                for cid in wo.linked_complaint_ids:
                    comp = self.rel_service.get_complaint(cid)
                    if comp:
                        context["linked_complaints"].append(comp)
                        context["cited_provenances"].append(comp.provenance)

        # Resolve Road
        if target_road_id:
            road = self.rel_service.get_road(target_road_id)
            if road:
                context["resolved_road"] = road
                context["cited_provenances"].append(road.provenance)
                if not target_ward_code:
                    target_ward_code = road.ward_code

                # Get linked work orders for this road if not already targeted
                road_wos = self.rel_service.get_road_work_orders(target_road_id)
                context["road_work_orders"] = road_wos[:5]
                for w in road_wos[:3]:
                    context["cited_provenances"].append(w.provenance)

                # Get linked complaints for road
                road_comps = self.rel_service.get_road_complaints(target_road_id)
                context["road_complaints"] = road_comps[:5]

        # Resolve Ward
        ward_code_to_use = target_ward_code or default_ward
        ward = self.rel_service.get_ward(ward_code_to_use)
        if ward:
            context["resolved_ward"] = ward
            context["cited_provenances"].append(ward.provenance)

        # Resolve Contractor
        if target_contr_id:
            contr = self.rel_service.get_contractor(target_contr_id)
            if contr:
                context["resolved_contractor"] = contr
                context["cited_provenances"].append(contr.provenance)

        return context

    async def answer_question(self, question: str, default_ward: str = "K/E") -> Dict[str, Any]:
        """
        Grounded QA Pipeline:
        1. Language detection
        2. Bounded Context Retrieval
        3. Model Call (if API key available) OR Grounded Synthesis Engine (deterministic fallback)
        """
        lang = self.detect_language(question)
        ctx = self.retrieve_context(question, default_ward)

        # Deduplicate cited provenances
        seen_keys = set()
        unique_provs = []
        for p in ctx["cited_provenances"]:
            k = f"{p.source_file}:{p.source_record_id}"
            if k not in seen_keys:
                seen_keys.add(k)
                unique_provs.append({"file": p.source_file, "id": p.source_record_id})

        # Define missing evidence categories
        missing_evidence = [
            "Contractor raw material purchase invoice and bitumen batch test certificate",
            "Physical Measurement Book (MB) verified on-site by Assistant Engineer",
            "Verified treasury bank disbursement scroll (cost_inr represents recorded billed cost only)"
        ]

        # Check if Claude API key is available
        if self.api_key:
            try:
                answer = await self._call_claude_api(question, lang, ctx)
                return {
                    "answer": answer,
                    "language": lang,
                    "retrieved_context": self._format_context_summary(ctx),
                    "cited_records": unique_provs,
                    "missing_evidence": missing_evidence,
                    "recommended_action": self._determine_next_action(ctx)
                }
            except Exception as e:
                # Log error and fall back gracefully to deterministic grounded engine
                pass

        # Deterministic Grounded Engine Fallback
        answer = self._generate_grounded_fallback(question, lang, ctx)
        return {
            "answer": answer,
            "language": lang,
            "retrieved_context": self._format_context_summary(ctx),
            "cited_records": unique_provs,
            "missing_evidence": missing_evidence,
            "recommended_action": self._determine_next_action(ctx)
        }

    def _determine_next_action(self, ctx: Dict[str, Any]) -> str:
        wo = ctx.get("resolved_work_order")
        road = ctx.get("resolved_road")

        if wo and wo.cost_variance_pct and wo.cost_variance_pct > 20.0:
            return f"Issue formal audit clarification request to Ward Executive Engineer regarding {wo.cost_variance_pct:.1f}% deviation above rate card."
        if road and road.under_dlp:
            return f"Verify whether contractor {road.road_name} warranty clause applies before sanctioning non-warranty municipal budget."
        if road:
            return f"Open Road Passport for {road.road_id} to track complete multi-year resurfacing timeline."
        return "Inspect Ward Money Trail to review contractor expenditure allocations."

    def _format_context_summary(self, ctx: Dict[str, Any]) -> Dict[str, Any]:
        summary: Dict[str, Any] = {}
        if ctx.get("resolved_road"):
            r = ctx["resolved_road"]
            summary["road"] = {"id": r.road_id, "name": r.road_name, "ward": r.ward_code, "dlp": r.under_dlp}
        if ctx.get("resolved_work_order"):
            w = ctx["resolved_work_order"]
            summary["work_order"] = {
                "id": w.work_order_id,
                "repair_method": w.repair_method,
                "cost_inr": w.cost_inr,
                "expected_inr": w.expected_cost_inr,
                "variance_pct": w.cost_variance_pct
            }
        if ctx.get("resolved_ward"):
            wd = ctx["resolved_ward"]
            summary["ward"] = {"code": wd.ward_code, "name": wd.ward_name, "budget_inr": wd.monsoon_repair_budget_inr_2025}
        return summary

    async def _call_claude_api(self, question: str, lang: str, ctx: Dict[str, Any]) -> str:
        """Invokes Claude API with strict evidence guardrails and language constraints."""
        system_prompt = f"""You are RupeeTrace Assistant, an evidence-grounded civic finance intelligence assistant for Mumbai road repairs.
You communicate strictly in {lang}.

GUARDRAILS:
1. ONLY make claims supported by the provided retrieved context.
2. Distinguish recorded data (e.g. 'recorded billed cost') from verified treasury disbursements.
3. NEVER invent numbers, materials, or contractor fraud conclusions.
4. CITE exact record IDs like [RD0140], [WO25-00600] in your explanation.
5. All data is synthetic research prototype data developed for Claude Impact Labs.
"""
        context_str = f"RETRIEVED CONTEXT:\n{self._format_context_summary(ctx)}\n"
        if ctx.get("resolved_work_order"):
            wo = ctx["resolved_work_order"]
            context_str += f"Work Order: {wo.work_order_id}, Road: {wo.road_id}, Method: {wo.repair_method}, Billed: ₹{wo.cost_inr:,.0f}, Expected: ₹{wo.expected_cost_inr:,.0f}, Variance: {wo.cost_variance_pct}%, SLA Met: {wo.sla_met}, Reopened: {wo.reopened_within_30d}\n"
        if ctx.get("linked_complaints"):
            context_str += f"Linked Complaints: {[c.complaint_id for c in ctx['linked_complaints']]}\n"

        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 600,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": f"{context_str}\n\nUSER QUESTION: {question}"}
            ]
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json=payload
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["content"][0]["text"]
            else:
                raise Exception(f"Anthropic API returned {resp.status_code}")

    def _generate_grounded_fallback(self, question: str, lang: str, ctx: Dict[str, Any]) -> str:
        """
        Deterministic, fully-grounded response synthesizer.
        Handles English, Hindi, Marathi, and Hinglish with mathematical accuracy.
        """
        wo = ctx.get("resolved_work_order")
        road = ctx.get("resolved_road")
        ward = ctx.get("resolved_ward")
        rate_card = ctx.get("rate_card")
        linked_comps = ctx.get("linked_complaints", [])

        # Scenario 1: Work Order Specific Question
        if wo:
            cost_str = f"₹{wo.cost_inr:,.0f}"
            exp_str = f"₹{wo.expected_cost_inr:,.0f}" if wo.expected_cost_inr else "N/A"
            var_pct = f"+{wo.cost_variance_pct:.1f}%" if wo.cost_variance_pct else "0%"
            sla_status = "met within SLA schedule" if wo.sla_met else "exceeded SLA turnaround limit"
            reopen_status = "reopened within 30 days" if wo.reopened_within_30d else "unreopened during 30-day warranty window"

            comp_ids = ", ".join([c.complaint_id for c in linked_comps]) if linked_comps else "No directly linked complaint IDs"

            if lang == "Hindi":
                return (
                    f"कार्य आदेश [{wo.work_order_id}] के अनुसार, दर्ज किया गया बिल खर्च {cost_str} है [work_orders.csv#{wo.work_order_id}]। "
                    f"मानक रेट कार्ड के अनुसार अपेक्षित लागत {exp_str} थी [rate_card.csv#{wo.repair_method}], जिससे {var_pct} का अंतर पाया गया है। "
                    f"यह कार्य सड़क [{wo.road_id}] ({road.road_name if road else 'वार्ड ' + wo.ward_code}) पर ठेकेदार [{wo.contractor_id}] द्वारा किया गया। "
                    f"संबंधित नागरिक शिकायतें: {comp_ids}। मरम्मत कार्य 30 दिनों में {reopen_status}। "
                    f"ध्यान दें: यह दर्ज बिल लागत है, अंतिम कोषागार भुगतान नहीं।"
                )
            elif lang == "Marathi":
                return (
                    f"काम आदेश [{wo.work_order_id}] नुसार, नोंदवलेला बिल खर्च {cost_str} आहे [work_orders.csv#{wo.work_order_id}]। "
                    f"दरपत्रकानुसार अपेक्षित खर्च {exp_str} होता [rate_card.csv#{wo.repair_method}], ज्यामुळे {var_pct} फरक दिसून येतो. "
                    f"हे काम रस्ता [{wo.road_id}] ({road.road_name if road else 'वॉर्ड ' + wo.ward_code}) वर कंत्राटदार [{wo.contractor_id}] द्वारे केले गेले. "
                    f"जोडलेल्या तक्रारी: {comp_ids}। ३० दिवसांत काम {reopen_status}। "
                    f"नोंद: हा नोंदवलेला बिल खर्च आहे, कोषागार वाटप नव्हे."
                )
            elif lang == "Hinglish":
                return (
                    f"Work Order [{wo.work_order_id}] ka recorded billed cost {cost_str} hai [work_orders.csv#{wo.work_order_id}]. "
                    f"Rate card schedule ke mutabik expected amount {exp_str} tha [rate_card.csv#{wo.repair_method}], jisme {var_pct} ka review deviation mila hai. "
                    f"Yeh repair road [{wo.road_id}] ({road.road_name if road else ''}) par contractor [{wo.contractor_id}] ne execute kiya. "
                    f"Linked citizen complaints: {comp_ids}. Job SLA {sla_status} aur 30 din me {reopen_status}. "
                    f"Note: Yeh recorded billed figure hai, verified treasury payment nahi."
                )
            else: # English
                return (
                    f"For Work Order [{wo.work_order_id}], the recorded billed expenditure is {cost_str} [work_orders.csv#{wo.work_order_id}]. "
                    f"The benchmark standard cost from the rate card was {exp_str} [rate_card.csv#{wo.repair_method}], yielding a deterministic variance of {var_pct}. "
                    f"This job was executed on road [{wo.road_id}] ({road.road_name if road else 'Ward ' + wo.ward_code}) by contractor [{wo.contractor_id}]. "
                    f"Linked citizen complaints: {comp_ids}. Turnaround was {sla_status}, and repair remained {reopen_status}. "
                    f"Clarification: Expenditure represents recorded billed cost, not verified treasury disbursement."
                )

        # Scenario 2: Road Specific Question
        if road:
            road_wos = ctx.get("road_work_orders", [])
            total_spend = sum(w.cost_inr for w in road_wos)
            dlp_note = "is currently under active Defect Liability Period (DLP)" if road.under_dlp else "is not currently under DLP warranty"

            if lang == "Hindi":
                return (
                    f"सड़क [{road.road_id}] ({road.road_name}, वार्ड {road.ward_code}) [roads.csv#{road.road_id}] "
                    f"की लंबाई {road.length_m} मीटर है और सतह '{road.surface}' है। यह सड़क वर्तमान में {dlp_note}। "
                    f"इस सड़क पर दर्ज कार्य आदेशों का कुल दर्ज खर्च ₹{total_spend:,.0f} है। "
                    f"विस्तृत जानकारी के लिए रोड पासपोर्ट (/passport/{road.road_id}) देखें।"
                )
            elif lang == "Marathi":
                return (
                    f"रस्ता [{road.road_id}] ({road.road_name}, वॉर्ड {road.ward_code}) [roads.csv#{road.road_id}] "
                    f"ची लांबी {road.length_m} मीटर असून पृष्ठभाग '{road.surface}' आहे. हा रस्ता सध्या {dlp_note}। "
                    f"या रस्त्यासाठी नोंदवलेला एकूण खर्च ₹{total_spend:,.0f} आहे. "
                    f"सविस्तर माहितीसाठी रोड पासपोर्ट (/passport/{road.road_id}) उघडा."
                )
            elif lang == "Hinglish":
                return (
                    f"Road [{road.road_id}] ({road.road_name}, Ward {road.ward_code}) [roads.csv#{road.road_id}] "
                    f"ki length {road.length_m} meters hai aur surface '{road.surface}' hai. Yeh asset {dlp_note}. "
                    f"Recorded work orders ka total billed spend ₹{total_spend:,.0f} hai. "
                    f"Detailed timeline ke liye Road Passport check karein (/passport/{road.road_id})."
                )
            else:
                return (
                    f"Road [{road.road_id}] ({road.road_name}, Ward {road.ward_code}) [roads.csv#{road.road_id}] "
                    f"measures {road.length_m} meters with a '{road.surface}' surface. The asset {dlp_note}. "
                    f"Total recorded work-order expenditure across retrieved jobs is ₹{total_spend:,.0f}. "
                    f"Complete 6-chapter asset history is available in the Road Passport (/passport/{road.road_id})."
                )

        # Scenario 3: Ward Specific or General Question
        if ward:
            budget_str = f"₹{ward.monsoon_repair_budget_inr_2025:,.0f}"
            if lang == "Hindi":
                return (
                    f"वार्ड {ward.ward_code} ({ward.ward_name}) [wards.csv#{ward.ward_code}] "
                    f"का वर्ष 2025 के लिए कुल स्वीकृत मानसून मरम्मत बजट {budget_str} है। "
                    f"इसकी जलजमाव संवेदनशीलता (Low-Lying Index) {ward.low_lying_index} दर्ज है। "
                    f"विस्तृत खर्च आवंटन के लिए 'Ward Money Trail' देखें।"
                )
            elif lang == "Marathi":
                return (
                    f"वॉर्ड {ward.ward_code} ({ward.ward_name}) [wards.csv#{ward.ward_code}] "
                    f"साठी २०२५ मधील मंजूर पावसाळी रस्ता दुरुस्ती अर्थसंकल्प {budget_str} आहे. "
                    f"या वॉर्डाचा पूर निर्देशांक (Low-Lying Index) {ward.low_lying_index} आहे. "
                    f"सविस्तर पाहण्यासाठी 'Ward Money Trail' तपासा."
                )
            elif lang == "Hinglish":
                return (
                    f"Ward {ward.ward_code} ({ward.ward_name}) [wards.csv#{ward.ward_code}] "
                    f"ka 2025 Monsoon Repair Budget {budget_str} sanctioned hai. "
                    f"Ward ka low-lying waterlogging index {ward.low_lying_index} hai. "
                    f"Pura kharcha audit track karne ke liye 'Ward Money Trail' view karein."
                )
            else:
                return (
                    f"Ward {ward.ward_code} ({ward.ward_name}) [wards.csv#{ward.ward_code}] "
                    f"has a total sanctioned monsoon road repair budget of {budget_str}. "
                    f"The ward has an environmental low-lying waterlogging index of {ward.low_lying_index}. "
                    f"Explore the Ward Money Trail view to reconcile contractor allocations against available balance."
                )

        return (
            "RupeeTrace Assistant: Please specify a Road ID (e.g. RD0140), Work Order ID (e.g. WO25-00600), "
            "or Ward Code (e.g. K/E) to retrieve deterministic civic finance records."
        )
