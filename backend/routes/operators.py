from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional
from datetime import datetime
import os
import json
import logging

from app.services.operators import TrainOperatorService
from app.services.pdf_generator import DutyPDFGenerator

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize services
operator_service = TrainOperatorService()
pdf_generator = DutyPDFGenerator()

@router.get("")
@router.get("/")
async def get_all_operators():
    """Get list of all train operators"""
    try:
        operators = operator_service.get_all_operators()
        return JSONResponse(content={
            "success": True,
            "operators": operators,
            "count": len(operators),
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Failed to get operators: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get operators: {str(e)}")

@router.get("/summary")
@router.get("/summary/")
async def get_operators_summary(service_date: Optional[str] = None):
    """Get duty summary for all operators"""
    try:
        summary = operator_service.get_operator_duty_summary(service_date)
        return JSONResponse(content={
            "success": True,
            "summary": summary,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Failed to get operator summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get operator summary: {str(e)}")

@router.get("/{operator_id}/duty")
async def get_operator_duty(
    operator_id: str,
    service_date: Optional[str] = None
):
    """Get duty schedule for a specific operator"""
    try:
        duty = operator_service.generate_duty_schedule(operator_id, service_date)
        
        return JSONResponse(content={
            "success": True,
            "duty": duty,
            "timestamp": datetime.now().isoformat()
        })
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to generate duty schedule: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate duty schedule: {str(e)}")

@router.get("/{operator_id}/duty/pdf/download")
async def download_operator_duty_pdf(
    operator_id: str,
    service_date: Optional[str] = None
):
    """Download the generated PDF"""
    try:
        # Generate duty schedule
        duty = operator_service.generate_duty_schedule(operator_id, service_date)
        
        # Generate PDF
        pdf_path = pdf_generator.generate_pdf(duty)
        
        filename = f"KMRL_Duty_{operator_id}_{duty['date']}.pdf"
        
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            filename=filename
        )
            
    except Exception as e:
        logger.error(f"Failed to download PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download PDF: {str(e)}")