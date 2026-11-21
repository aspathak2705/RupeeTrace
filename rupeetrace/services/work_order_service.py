from typing import List, Dict, Any, Optional
from rupeetrace.models.entities import WorkOrder, AuditEvidence
from rupeetrace.services.relationship_service import RelationshipService

class WorkOrderService:
    def __init__(self, rel_service: RelationshipService):
        self.rel_service = rel_service

    def get_work_order(self, work_order_id: str) -> Optional[WorkOrder]:
        return self.rel_service.get_work_order(work_order_id)

    def get_work_order_evidence(self, work_order_id: str) -> Optional[AuditEvidence]:
        return self.rel_service.get_work_order_evidence(work_order_id)

    def list_work_orders(
        self,
        ward_code: Optional[str] = None,
        road_id: Optional[str] = None,
        contractor_id: Optional[str] = None,
        is_dlp_breach: Optional[bool] = None,
        is_overbilled: Optional[bool] = None,
        limit: int = 100
    ) -> List[WorkOrder]:
        wos = self.rel_service.loader.work_orders
        if ward_code:
            wos = [w for w in wos if w.ward_code == ward_code]
        if road_id:
            wos = [w for w in wos if w.road_id == road_id]
        if contractor_id:
            wos = [w for w in wos if w.contractor_id == contractor_id]
        if is_dlp_breach is not None:
            wos = [w for w in wos if w.is_dlp_breach == is_dlp_breach]
        if is_overbilled is not None:
            wos = [w for w in wos if w.is_overbilled == is_overbilled]
        return wos[:limit]
