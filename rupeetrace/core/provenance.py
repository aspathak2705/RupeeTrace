from typing import Optional
from pydantic import BaseModel, Field

class SourceProvenance(BaseModel):
    """
    Tracks provenance of an ingested entity back to its raw source file and record identifier.
    """
    source_file: str = Field(..., description="Original dataset filename (e.g., work_orders.csv)")
    source_record_id: str = Field(..., description="Unique identifier in source dataset (e.g., WO25-00001)")
    row_index: Optional[int] = Field(None, description="0-indexed line number in source dataset")

    class Config:
        frozen = True
