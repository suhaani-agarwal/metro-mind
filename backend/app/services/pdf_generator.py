from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfgen import canvas
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

class DutyPDFGenerator:
    """Generate PDF for train operator duty schedule"""
    
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        self.output_dir = os.path.join(self.base_dir, "storage", "duty_pdfs")
        os.makedirs(self.output_dir, exist_ok=True)
        
        self.styles = getSampleStyleSheet()
    
    def generate_pdf(self, duty: dict) -> str:
        """Generate PDF file and return file path"""
        try:
            filename = f"KMRL_Duty_{duty['operator_id']}_{duty['date']}.pdf"
            filepath = os.path.join(self.output_dir, filename)
            
            doc = SimpleDocTemplate(
                filepath,
                pagesize=A4,
                topMargin=0.5*inch,
                bottomMargin=0.5*inch,
                leftMargin=0.5*inch,
                rightMargin=0.5*inch
            )
            
            story = []
            
            # Header
            story.append(self._create_header())
            story.append(Spacer(1, 0.1*inch))
            
            # Operator Info
            story.append(self._create_operator_info(duty))
            story.append(Spacer(1, 0.1*inch))
            
            # Duty Summary
            story.append(self._create_duty_summary(duty))
            story.append(Spacer(1, 0.1*inch))
            
            # Train Assignment
            story.append(self._create_train_assignment(duty))
            story.append(Spacer(1, 0.1*inch))
            
            # Trip Schedule
            if duty.get("trips"):
                story.append(self._create_trip_schedule(duty))
                story.append(Spacer(1, 0.1*inch))
            
            # Operational Bulletin
            story.append(self._create_operational_bulletin(duty))
            story.append(Spacer(1, 0.1*inch))
            
            # Checklist
            story.append(self._create_checklist(duty))
            story.append(Spacer(1, 0.1*inch))
            
            # Emergency Contacts
            story.append(self._create_emergency_contacts(duty))
            story.append(Spacer(1, 0.1*inch))
            
            # Reminders
            story.append(self._create_reminders(duty))
            story.append(Spacer(1, 0.2*inch))
            
            # Acknowledgment
            story.append(self._create_acknowledgment(duty))
            
            doc.build(story)
            
            logger.info(f"PDF generated: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error generating PDF: {e}")
            raise
    
    def _create_header(self) -> Table:
        """Create header table"""
        header_data = [
            ["KOCHI METRO RAIL LIMITED (KMRL)"],
            ["TRAIN OPERATOR DUTY SCHEDULE"]
        ]
        
        header_table = Table(header_data, colWidths=[7*inch])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 16),
            ('FONTNAME', (0, 1), (0, 1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (0, 1), 14),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#003366')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#003366')),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0F8FF')),
        ]))
        
        return header_table
    
    def _create_operator_info(self, duty: dict) -> Table:
        """Create operator information table"""
        try:
            date_obj = datetime.strptime(duty["date"], "%Y-%m-%d")
            date_str = date_obj.strftime('%d-%b-%Y (%A)')
        except:
            date_str = duty["date"]
        
        info_data = [
            ["DATE:", date_str, "DUTY ID:", duty["duty_id"], "SHIFT:", duty["shift"]],
            ["OPERATOR:", f"{duty['operator_name']} ({duty['employee_id']})", "PHONE:", duty["phone"], "", ""]
        ]
        
        info_table = Table(info_data, colWidths=[0.8*inch, 2.6*inch, 0.8*inch, 1.2*inch, 0.8*inch, 1.2*inch])
        info_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (-1, -1), colors.whitesmoke),
        ]))
        
        return info_table
    
    def _create_duty_summary(self, duty: dict) -> Table:
        """Create duty summary table"""
        try:
            # Subtract 15 minutes for arrival time
            sign_on_dt = datetime.strptime(duty["sign_on"], "%H:%M")
            arrival_dt = sign_on_dt - timedelta(minutes=15)
            sign_on_arrival = arrival_dt.strftime("%H:%M")
        except:
            sign_on_arrival = duty["sign_on"]
        
        summary_data = [
            ["DUTY SUMMARY:"],
            [f"Sign-on: {duty['sign_on']} @ Muttom Depot Crew Room A (Arrive {sign_on_arrival})"],
            [f"Sign-off: {duty['sign_off']} @ Aluva Station"],
            [f"Total Duty: {duty['total_hours']} hrs | Driving: {duty['driving_hours']} hrs | Breaks: {duty['break_hours']} hrs"],
            [f"Meal Break: {duty['meal_break']} @ Aluva Crew Rest Area"],
            [f"Standby: {duty['standby_time']} @ Aluva (Relief Coverage)"]
        ]
        
        summary_table = Table(summary_data, colWidths=[7*inch])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E8F4FF')),
            ('BOX', (0, 0), (-1, -1), 1, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        return summary_table
    
    def _create_train_assignment(self, duty: dict) -> Table:
        """Create train assignment table aligned with actual maintenance status."""
        train_id = duty.get("train_id", "")
        cfg = duty.get("train_config", "")

        config_str = ""
        known_issues_text = "Known issues: None reported"

        if isinstance(cfg, dict):
            config_str = cfg.get("config_string", "")
            known_issues = cfg.get("known_issues", [])
            if known_issues:
                known_issues_text = "Known issues: " + "; ".join(known_issues)
        else:
            # cfg is a string coming from _get_train_config
            config_str = str(cfg)

        train_data = [
            ["TRAIN ROSTER & CONFIGURATION:"],
            [f"Primary Set: {train_id}"],
            [f"Configuration: {config_str}"],
            [known_issues_text]
        ]
        
        train_table = Table(train_data, colWidths=[7*inch])
        train_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E8F4FF')),
            ('BOX', (0, 0), (-1, -1), 1, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        return train_table
    
    def _create_trip_schedule(self, duty: dict) -> Table:
        """Create trip schedule table"""
        if not duty.get("trips"):
            return Table([["No trips scheduled"]], colWidths=[7*inch])
        
        # Create header
        header = ["#", "Route", "Depart", "Arrive", "Dur.", "Pax", "Notes / Predicted Delay"]
        
        # Create data rows
        data = [header]
        for trip in duty["trips"]:
            notes = trip.get("notes", "")
            if trip.get("predicted_delay_summary"):
                pd = trip["predicted_delay_summary"]
                notes = f"{notes} | {pd}" if notes else pd
            data.append([
                trip["trip_number"],
                trip["route"],
                trip["departure"],
                trip["arrival"],
                trip["duration"],
                trip["pax_estimate"],
                notes
            ])
        
        col_widths = [0.4*inch, 1.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 1.6*inch]
        trip_table = Table(data, colWidths=col_widths, repeatRows=1)
        
        # Style the table
        style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#003366')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ])
        
        trip_table.setStyle(style)
        return trip_table
    
    def _create_operational_bulletin(self, duty: dict) -> Table:
        """Create operational bulletin table"""
        try:
            date_obj = datetime.strptime(duty["date"], "%Y-%m-%d")
            bulletin_date = date_obj.strftime('%d-%b-%Y')
        except:
            bulletin_date = duty["date"]
        
        restrictions = duty.get("restrictions", [])
        bulletin_data = [
            [f"⚠️ OPERATIONAL BULLETIN ({bulletin_date}):"]
        ]
        
        for restriction in restrictions:
            bulletin_data.append([f"• {restriction['type']}: {restriction['description']}"])
            if restriction.get('reason'):
                bulletin_data.append([f"  Reason: {restriction['reason']} | Action: {restriction.get('action', 'N/A')}"])
        
        bulletin_table = Table(bulletin_data, colWidths=[7*inch])
        bulletin_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, 0), colors.red),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FFF0F0')),
            ('BOX', (0, 0), (-1, -1), 1, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        return bulletin_table
    
    def _create_checklist(self, duty: dict) -> Table:
        """Create pre-check checklist table"""
        checklist_data = [
            ["PRE-CHECK CHECKLIST (Muttom Depot 05:45-06:00):"]
        ]
        
        for item in duty.get("pre_check_checklist", []):
            checklist_data.append([f"□ {item}"])
        
        checklist_table = Table(checklist_data, colWidths=[7*inch])
        checklist_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F0FFF0')),
            ('BOX', (0, 0), (-1, -1), 1, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        return checklist_table
    
    def _create_emergency_contacts(self, duty: dict) -> Table:
        """Create emergency contacts table"""
        contacts = duty.get("emergency_contacts", {})
        
        contacts_data = [
            ["EMERGENCY CONTACTS:"],
            [f"EMERGENCY: {contacts.get('emergency', '0484-2755-0000 (24/7)')} | OCC: {contacts.get('occ', 'Radio Ch-1 / 275-5050 ext.1')}"],
            [f"Depot Control: {contacts.get('depot_control', '275-6000 ext.5')} | Aluva SC: {contacts.get('aluva_sc', 'Vikram +91-98XXXXXX')}"],
            [f"Tripunithura SC: {contacts.get('tripunithura_sc', 'Priya +91-98YYYYYY')} | Duty In-charge: {contacts.get('duty_incharge', '275-6000')}"]
        ]
        
        contacts_table = Table(contacts_data, colWidths=[7*inch])
        contacts_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FFF8E1')),
            ('BOX', (0, 0), (-1, -1), 1, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        return contacts_table
    
    def _create_reminders(self, duty: dict) -> Table:
        """Create mandatory reminders table"""
        reminders = duty.get("reminders", [])
        
        reminders_data = [
            ["MANDATORY REMINDERS:"]
        ]
        
        # Group reminders into lines
        for i in range(0, len(reminders), 2):
            line_reminders = reminders[i:i+2]
            reminders_data.append([f"• {' • '.join(line_reminders)}"])
        
        reminders_table = Table(reminders_data, colWidths=[7*inch])
        reminders_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F5F5F5')),
            ('BOX', (0, 0), (-1, -1), 1, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        return reminders_table
    
    def _create_acknowledgment(self, duty: dict) -> Table:
        """Create acknowledgment section"""
        gen_time = datetime.now().strftime('%d-%b-%Y %H:%M')
        valid_date = duty["date"]
        
        ack_data = [
            ["────────────────────────────────────────────────────────────────────────"],
            ["ACKNOWLEDGMENT: I have read & understood this duty schedule"],
            ["Signature: ____________________ Date: ________ Time: ________"],
            [f"Generated: KMRL Crew System v2.3 | {gen_time} | Valid: {valid_date} only"]
        ]
        
        ack_table = Table(ack_data, colWidths=[7*inch])
        ack_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.grey),
        ]))
        
        return ack_table