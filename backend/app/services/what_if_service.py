
# layer2_backend/app/services/what_if_service.py
import re
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv() 
print(f"Gemini API Key loaded: {os.getenv('GEMINI_API_KEY') is not None}")
print(f"Key starts with: {os.getenv('GEMINI_API_KEY', '')[:10]}...")
import google.generativeai as genai

from pathlib import Path

# Configure Gemini API - FIXED TYPO
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class WhatIfAnalyzer:
    """
    Service for analyzing "what if" scenarios when swapping scheduled and standby trains
    Uses Gemini AI and scheduling rationale from layer2_service to provide intelligent analysis
    """
    
    def __init__(self, gemini_api_key: Optional[str] = None):
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            # Try to get API key from environment and create model
            api_key = os.getenv("GEMINI_API_KEY")
            if api_key:
                # API key is already configured globally, just create the model
                try:
                    self.model = genai.GenerativeModel('gemini-1.5-flash')
                    print("Gemini model initialized successfully")
                except Exception as e:
                    print(f"Failed to initialize Gemini model: {e}")
                    self.model = None
            else:
                print("No Gemini API key found, using fallback analysis")
                self.model = None
    
    def get_standby_trains(self, optimization_result: Dict[str, Any], readiness_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Identify trains that are on standby (have readiness data but aren't scheduled)
        Enhanced to include scheduling rationale from optimization result
        """
        # Extract scheduled train IDs from assignments - FIXED KEY
        scheduled_trains = set()
        if "optimized_assignments" in optimization_result:
            scheduled_trains = {assignment["train_id"] for assignment in optimization_result["optimized_assignments"]}
        elif "assignments" in optimization_result:
            scheduled_trains = {assignment["train_id"] for assignment in optimization_result["assignments"]}
        
        # Get standby trains from optimization result if available
        if "standby_trains" in optimization_result:
            return optimization_result["standby_trains"]
        
        # Fallback: Generate standby trains list
        all_trains = {train["train_id"] for train in readiness_data}
        standby_train_ids = all_trains - scheduled_trains
        
        standby_trains = []
        for train_id in standby_train_ids:
            readiness_info = self._get_train_readiness_details(train_id, readiness_data)
            if readiness_info:
                standby_trains.append({
                    "train_id": train_id,
                    "readiness_score": readiness_info.get("score", 0),
                    "readiness_summary": readiness_info.get("summary", ""),
                    "readiness_details": readiness_info.get("details", {}),
                    "scheduling_rationale": {
                        "primary_reason": "not_optimized",
                        "readiness_factor": f"Readiness: {readiness_info.get('score', 0)}%",
                        "position_factor": "Position not optimized in this analysis",
                        "shunting_factor": "Shunting impact not assessed"
                    }
                })
        
        # Sort by readiness score (highest first)
        standby_trains.sort(key=lambda x: x["readiness_score"], reverse=True)
        
        return standby_trains
    
    def get_all_swap_scenarios(self, optimization_result: Dict[str, Any], readiness_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate all possible swap scenarios for analysis
        """
        # Get scheduled trains - FIXED KEY
        scheduled_trains = []
        if "optimized_assignments" in optimization_result:
            scheduled_trains = optimization_result["optimized_assignments"]
        elif "assignments" in optimization_result:
            scheduled_trains = optimization_result["assignments"]
        
        # Get standby trains
        standby_trains = self.get_standby_trains(optimization_result, readiness_data)
        
        # Generate all possible swap scenarios
        scenarios = []
        for scheduled_train in scheduled_trains:
            for standby_train in standby_trains:
                scenarios.append({
                    "scheduled_train": scheduled_train,
                    "standby_train": standby_train,
                    "departure_time": scheduled_train.get("departure_time", "08:00"),
                    "bay": scheduled_train.get("bay", "Unknown")
                })
        
        return scenarios
    
    def analyze_swap_scenario(
        self, 
        scheduled_train: Dict[str, Any], 
        standby_train: Dict[str, Any],
        all_readiness_data: List[Dict[str, Any]],
        departure_time: str,
        bay_info: str
    ) -> Dict[str, Any]:
        """
        Analyze the implications of swapping a scheduled train with a standby train
        Enhanced to use scheduling rationale from layer2_service
        """
        
        # Get detailed readiness information for both trains
        scheduled_readiness = self._get_train_readiness_details(scheduled_train["train_id"], all_readiness_data)
        standby_readiness = self._get_train_readiness_details(standby_train["train_id"], all_readiness_data)
        
        if not scheduled_readiness or not standby_readiness:
            return {
                "status": "error",
                "message": "Could not find readiness data for one or both trains"
            }
        
        # Extract scheduling rationale from optimization result
        scheduled_rationale = scheduled_train.get("scheduling_rationale", {})
        standby_rationale = standby_train.get("scheduling_rationale", {})
        
        # Generate AI-powered analysis using Gemini with rationale context
        ai_analysis = self._generate_ai_analysis_with_rationale(
            scheduled_train=scheduled_train,
            standby_train=standby_train,
            scheduled_readiness=scheduled_readiness,
            standby_readiness=standby_readiness,
            scheduled_rationale=scheduled_rationale,
            standby_rationale=standby_rationale,
            departure_time=departure_time,
            bay_info=bay_info
        )
        
        # Calculate quantitative impact
        impact_analysis = self._calculate_swap_impact(
            scheduled_readiness, 
            standby_readiness,
            departure_time,
            standby_rationale
        )
        
        return {
            "swap_scenario": {
                "from_train": scheduled_train["train_id"],
                "to_train": standby_train["train_id"],
                "departure_time": departure_time,
                "bay": bay_info
            },
            "readiness_comparison": {
                "scheduled_train": {
                    "score": scheduled_readiness["score"],
                    "summary": scheduled_readiness.get("summary", ""),
                    "details": scheduled_readiness.get("details", {})
                },
                "standby_train": {
                    "score": standby_readiness["score"],
                    "summary": standby_readiness.get("summary", ""),
                    "details": standby_readiness.get("details", {})
                }
            },
            "original_scheduling_rationale": {
                "scheduled_train_reason": scheduled_rationale,
                "standby_train_reason": standby_rationale
            },
            "ai_analysis": ai_analysis,
            "impact_analysis": impact_analysis,
            "recommendation": self._generate_recommendation_with_rationale(
                scheduled_readiness["score"], 
                standby_readiness["score"],
                ai_analysis,
                scheduled_rationale,
                standby_rationale
            ),
            "generated_at": datetime.now().isoformat()
        }
    
    def _get_train_readiness_details(self, train_id: str, readiness_data: List[Dict]) -> Optional[Dict]:
        """Get detailed readiness information for a specific train"""
        for train_data in readiness_data:
            if train_data.get("train_id") == train_id:
                return train_data
        return None
    
    def _generate_ai_analysis_with_rationale(
        self, 
        scheduled_train: Dict, 
        standby_train: Dict,
        scheduled_readiness: Dict,
        standby_readiness: Dict,
        scheduled_rationale: Dict,
        standby_rationale: Dict,
        departure_time: str,
        bay_info: str
    ) -> Dict[str, Any]:
        """Generate AI-powered analysis using existing scheduling rationale"""
        
        if not self.model:
            print("Using fallback analysis - Gemini model not available")
            return self._generate_fallback_analysis_with_rationale(
                scheduled_readiness, standby_readiness, 
                scheduled_rationale, standby_rationale
            )
        
        print("Using Gemini AI for analysis with scheduling rationale")
        # Create enhanced prompt with scheduling rationale
        prompt = self._create_enhanced_analysis_prompt(
            scheduled_train, standby_train,
            scheduled_readiness, standby_readiness,
            scheduled_rationale, standby_rationale,
            departure_time, bay_info
        )
        
        try:
            response = self.model.generate_content(prompt)
            analysis_text = response.text
            print("Gemini AI analysis completed successfully")
            
            # Parse the AI response into structured format
            parsed_result = self._parse_ai_response(analysis_text)
            
            # Add scheduling context to AI analysis
            if scheduled_rationale:
                parsed_result["scheduling_context"] = scheduled_rationale.get("primary_reason", "unknown")
                parsed_result["original_decision_rationale"] = scheduled_rationale.get("readiness_advantage", "") or scheduled_rationale.get("position_advantage", "")
            
            return parsed_result
            
        except Exception as e:
            print(f"AI analysis failed: {e}")
            return self._generate_fallback_analysis_with_rationale(
                scheduled_readiness, standby_readiness,
                scheduled_rationale, standby_rationale
            )
    
    def _create_enhanced_analysis_prompt(
        self, 
        scheduled_train: Dict, 
        standby_train: Dict,
        scheduled_readiness: Dict,
        standby_readiness: Dict,
        scheduled_rationale: Dict,
        standby_rationale: Dict,
        departure_time: str,
        bay_info: str
    ) -> str:
        """Create enhanced prompt with scheduling rationale context"""
        
        rationale_context = ""
        if scheduled_rationale or standby_rationale:
            rationale_context = f"""
ORIGINAL OPTIMIZATION DECISIONS:

SCHEDULED TRAIN SELECTION RATIONALE:
- Primary Reason: {scheduled_rationale.get('primary_reason', 'Unknown')}
- Readiness Advantage: {scheduled_rationale.get('readiness_advantage', 'None specified')}
- Position Advantage: {scheduled_rationale.get('position_advantage', 'None specified')}
- Shunting Benefit: {scheduled_rationale.get('shunting_benefit', 'None specified')}
- Secondary Factors: {', '.join(scheduled_rationale.get('secondary_factors', []))}

STANDBY TRAIN REJECTION RATIONALE:
- Primary Reason: {standby_rationale.get('primary_reason', 'Unknown')}
- Readiness Factor: {standby_rationale.get('readiness_factor', 'None specified')}
- Position Factor: {standby_rationale.get('position_factor', 'None specified')}
- Shunting Factor: {standby_rationale.get('shunting_factor', 'None specified')}
"""
        
        prompt = f"""
You are an expert railway operations analyst for Kochi Metro. Analyze the implications of swapping two trains, considering the original CP-SAT optimization decisions.

SCHEDULED TRAIN (Currently assigned to depart at {departure_time}):
- Train ID: {scheduled_train['train_id']}
- Readiness Score: {scheduled_readiness['score']}%
- Bay Location: {bay_info}
- Bay Position: {scheduled_train.get('bay_position', 'Unknown')}
- Departure Slot: #{scheduled_train.get('departure_slot', 'Unknown')}
- Readiness Summary: {scheduled_readiness.get('summary', 'No summary available')}
- Technical Details: {json.dumps(scheduled_readiness.get('details', {}), indent=2)}

STANDBY TRAIN (Proposed replacement):
- Train ID: {standby_train['train_id']}  
- Readiness Score: {standby_readiness['score']}%
- Bay Position: {standby_train.get('bay_position', 'Unknown')}
- Readiness Summary: {standby_readiness.get('summary', 'No summary available')}
- Technical Details: {json.dumps(standby_readiness.get('details', {}), indent=2)}

{rationale_context}

ANALYSIS REQUIRED:
Based on these ACTUAL optimization decisions, analyze what would happen if we make the swap:

1. SAFETY RISKS: What safety concerns arise from using the standby train?
2. OPERATIONAL RISKS: Service delays, reliability issues, passenger impact
3. MAINTENANCE IMPLICATIONS: How might the swap affect maintenance schedules?
4. PASSENGER EXPERIENCE: Impact on service quality and passenger safety
5. RECOMMENDATION: Should the swap be made? Why or why not?

Focus on WHY the original optimization made its decisions and what risks the swap introduces based on those factors.

Please format your response as JSON with the following structure:
{{
    "safety_risks": ["risk1", "risk2", ...],
    "operational_risks": ["risk1", "risk2", ...],
    "maintenance_implications": ["implication1", "implication2", ...],
    "passenger_impact": ["impact1", "impact2", ...],
    "detailed_analysis": "comprehensive explanation explaining the original decision and swap implications",
    "recommendation": "APPROVE/REJECT/REVIEW_REQUIRED",
    "confidence_level": "HIGH/MEDIUM/LOW",
    "critical_concerns": ["concern1", "concern2", ...],
    "mitigation_strategies": ["strategy1", "strategy2", ...],
    "original_decision_validation": "why the original optimization decision was sound"
}}
"""
        return prompt
    
    def _generate_fallback_analysis_with_rationale(
        self, 
        scheduled_readiness: Dict, 
        standby_readiness: Dict,
        scheduled_rationale: Dict,
        standby_rationale: Dict
    ) -> Dict[str, Any]:
        """Generate analysis using existing rationale without AI"""
        
        readiness_diff = scheduled_readiness["score"] - standby_readiness["score"]
        
        # Use the actual rationale to determine risks
        safety_risks = []
        operational_risks = []
        
        # Check why the standby train wasn't selected originally
        standby_primary_reason = standby_rationale.get("primary_reason", "")
        
        if "low_readiness" in standby_primary_reason:
            safety_risks.append("Swapping to lower-readiness train increases failure risk")
            operational_risks.append("Higher probability of in-service breakdowns")
        
        if "poor_parking_position" in standby_primary_reason:
            operational_risks.append("Requires significant shunting operations")
            safety_risks.append("Additional shunting movements increase operational complexity")
        
        if "shunting" in standby_rationale.get("shunting_factor", ""):
            operational_risks.append("Heavy shunting penalty indicates complex repositioning required")
        
        # Check why scheduled train was selected
        scheduled_primary_reason = scheduled_rationale.get("primary_reason", "")
        
        if "optimal_position_no_shunting" in scheduled_primary_reason:
            if standby_rationale.get("position_factor"):
                operational_risks.append("Losing optimal positioning advantage from original selection")
        
        if "high_readiness_priority_slot" in scheduled_primary_reason:
            operational_risks.append("Losing high-readiness train from priority departure slot")
        
        recommendation = "REJECT"
        if readiness_diff < 5 and "shunting" not in standby_rationale.get("shunting_factor", ""):
            recommendation = "REVIEW_REQUIRED"
        elif readiness_diff < -10:  # Standby much better
            recommendation = "APPROVE"
        
        return {
            "safety_risks": safety_risks if safety_risks else ["Minimal safety impact expected based on original optimization"],
            "operational_risks": operational_risks if operational_risks else ["Minor operational adjustments needed"],
            "maintenance_implications": ["No significant maintenance concerns identified"],
            "passenger_impact": ["Service quality may vary"] if abs(readiness_diff) > 10 else ["Minimal passenger impact expected"],
            "detailed_analysis": f"Original selection rationale: {scheduled_rationale.get('primary_reason', 'Unknown')}. "
                               f"Standby exclusion rationale: {standby_rationale.get('primary_reason', 'Unknown')}. "
                               f"Readiness difference: {readiness_diff:.1f}%. "
                               f"The optimization specifically avoided this swap for documented reasons.",
            "recommendation": recommendation,
            "confidence_level": "HIGH" if abs(readiness_diff) > 15 else "MEDIUM",
            "critical_concerns": safety_risks[:2] if safety_risks else ["None identified"],
            "analysis_method": "rationale_based_fallback",
            "original_decision_validation": f"CP-SAT optimization selected scheduled train for: {scheduled_rationale.get('primary_reason', 'optimization reasons')}"
        }
    
    def _parse_ai_response(self, response_text: str) -> Dict[str, Any]:
        """Parse AI response into structured format"""
        try:
            # Try to extract JSON from the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                parsed_response = json.loads(json_match.group())
                parsed_response["analysis_method"] = "gemini_ai_with_rationale"
                return parsed_response
            else:
                # Fallback: create structured response from text
                return {
                    "detailed_analysis": response_text,
                    "recommendation": "MANUAL_REVIEW_REQUIRED",
                    "confidence_level": "LOW",
                    "parsing_note": "Could not extract structured data from AI response",
                    "analysis_method": "gemini_ai_unparsed"
                }
        except Exception as e:
            return {
                "detailed_analysis": response_text,
                "recommendation": "MANUAL_REVIEW_REQUIRED", 
                "confidence_level": "LOW",
                "parsing_error": str(e),
                "analysis_method": "gemini_ai_error"
            }
    
    def _calculate_swap_impact(
        self, 
        scheduled_readiness: Dict, 
        standby_readiness: Dict,
        departure_time: str,
        standby_rationale: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate quantitative impact metrics"""
        
        score_diff = scheduled_readiness["score"] - standby_readiness["score"]
        
        # Calculate risk factors based on departure time
        hour = int(departure_time.split(':')[0]) if ':' in departure_time else 8
        peak_hours = [7, 8, 17, 18, 19]  # Rush hours
        is_peak = hour in peak_hours
        
        risk_multiplier = 1.5 if is_peak else 1.0
        
        # Simple shunting/fuel estimate based on rationale keywords
        # If standby was previously rejected due to shunting/position, assume extra moves and fuel
        estimated_additional_moves = 0
        estimated_extra_fuel_liters = 0.0
        try:
            standby_reason = standby_rationale or {}
            reason_text = (standby_reason.get("primary_reason", "") + " " + standby_reason.get("position_factor", "") + " " + standby_reason.get("shunting_factor", "")).lower()
            if "shunting" in reason_text or "position" in reason_text:
                # crude estimate: 2-4 extra moves if swapping in poorly positioned train
                estimated_additional_moves = 3
                # Assume ~2.5 liters per shunting move for yard movement (example figure)
                estimated_extra_fuel_liters = round(estimated_additional_moves * 2.5, 1)
        except Exception:
            pass

        return {
            "readiness_score_change": score_diff,
            "risk_level": self._calculate_risk_level(score_diff, is_peak),
            "estimated_delay_risk": f"{abs(score_diff) * risk_multiplier / 10:.1f}%",
            "passenger_impact_severity": "HIGH" if is_peak and score_diff > 15 else "MEDIUM" if score_diff > 10 else "LOW",
            "is_peak_hour": is_peak,
            "overall_impact_score": abs(score_diff) * risk_multiplier,
            "estimated_shunting_moves": estimated_additional_moves,
            "estimated_extra_fuel_liters": estimated_extra_fuel_liters
        }
    
    def _calculate_risk_level(self, score_diff: float, is_peak: bool) -> str:
        """Calculate overall risk level for the swap"""
        base_risk = abs(score_diff)
        
        if is_peak:
            base_risk *= 1.5
        
        if base_risk > 20:
            return "HIGH"
        elif base_risk > 10:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _generate_recommendation_with_rationale(
        self, 
        scheduled_score: int, 
        standby_score: int,
        ai_analysis: Dict[str, Any],
        scheduled_rationale: Dict[str, Any],
        standby_rationale: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate recommendation using ONLY readiness differences (no Gemini influence)."""

        # Positive means standby is better than scheduled
        readiness_delta = standby_score - scheduled_score

        # Thresholds (percentage points). Tunable if needed.
        CLOSE_DIFF_THRESHOLD = 3      # within +-3% is considered close
        REJECT_DIFF_THRESHOLD = 8     # if standby worse by >=8% -> reject

        # Determine decision strictly by readiness scores
        if readiness_delta > 0:
            decision = "ACCEPTED"
            reasoning = [
                f"Standby train has higher readiness (+{readiness_delta} pp) than scheduled train",
                "Rule: Any positive readiness improvement should be accepted"
            ]
        elif readiness_delta >= -CLOSE_DIFF_THRESHOLD:
            decision = "REVIEW_REQUIRED"
            reasoning = [
                f"Standby train is slightly lower in readiness ({readiness_delta} pp)",
                f"Rule: Within {CLOSE_DIFF_THRESHOLD}% difference requires manual review"
            ]
        elif readiness_delta <= -REJECT_DIFF_THRESHOLD:
            decision = "REJECTED"
            reasoning = [
                f"Standby train is significantly worse in readiness ({readiness_delta} pp)",
                f"Rule: Worse by {REJECT_DIFF_THRESHOLD}% or more should be rejected"
            ]
        else:
            decision = "FEASIBLE"
            reasoning = [
                f"Standby train has moderately lower readiness ({readiness_delta} pp)",
                "Rule: Moderate reduction is feasible if operations allow"
            ]

        # Confidence purely from magnitude of delta
        abs_delta = abs(readiness_delta)
        if abs_delta >= REJECT_DIFF_THRESHOLD or readiness_delta >= 5:
            confidence = "HIGH"
        elif abs_delta >= CLOSE_DIFF_THRESHOLD:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        # score_difference follows existing convention (scheduled - standby)
        score_difference = scheduled_score - standby_score

        return {
            "decision": decision,
            "reasoning": reasoning,
            "confidence": confidence,
            "score_difference": score_difference,
            "ai_recommendation": ai_analysis.get("recommendation", "IGNORED"),
            "original_selection_reason": scheduled_rationale.get("primary_reason", "Unknown"),
            "original_rejection_reason": standby_rationale.get("primary_reason", "Unknown"),
            "optimization_rationale_considered": True
        }


# Main function to be called from FastAPI
def analyze_train_swap(
    optimization_result: Dict[str, Any],
    scheduled_train_id: str,
    standby_train_id: str,
    original_readiness_data: List[Dict[str, Any]],
    gemini_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main function to analyze a train swap scenario
    Enhanced to use scheduling rationale from layer2 optimization
    
    Args:
        optimization_result: The result from layer2 optimization (with scheduling rationale)
        scheduled_train_id: ID of currently scheduled train
        standby_train_id: ID of standby train to swap in
        original_readiness_data: Complete readiness data from input
        gemini_api_key: Optional Gemini API key
    
    Returns:
        Detailed analysis of the swap scenario with original optimization context
    """
    
    try:
        analyzer = WhatIfAnalyzer(gemini_api_key)
        
        # Find the scheduled train details - FIXED KEY
        scheduled_train = None
        assignments = optimization_result.get("optimized_assignments", optimization_result.get("assignments", []))
        
        for train in assignments:
            if train["train_id"] == scheduled_train_id:
                scheduled_train = train
                break
        
        if not scheduled_train:
            return {
                "status": "error",
                "message": f"Scheduled train {scheduled_train_id} not found in optimization result"
            }
        
        # Find standby train details from standby_trains list or create basic info
        standby_train = {"train_id": standby_train_id}
        standby_trains_list = optimization_result.get("standby_trains", [])
        for train in standby_trains_list:
            if train["train_id"] == standby_train_id:
                standby_train = train
                break
        
        # If not found in standby list, create basic structure
        if "scheduling_rationale" not in standby_train:
            readiness_info = analyzer._get_train_readiness_details(standby_train_id, original_readiness_data)
            standby_train["scheduling_rationale"] = {
                "primary_reason": "not_in_optimization",
                "readiness_factor": f"Readiness: {readiness_info.get('score', 0)}%" if readiness_info else "Readiness data not available",
                "position_factor": "Position not assessed in optimization",
                "shunting_factor": "Shunting impact not assessed"
            }
        
        # Perform the enhanced analysis
        analysis = analyzer.analyze_swap_scenario(
            scheduled_train=scheduled_train,
            standby_train=standby_train,
            all_readiness_data=original_readiness_data,
            departure_time=scheduled_train.get("departure_time", "08:00"),
            bay_info=scheduled_train.get("bay", "Unknown")
        )
        
        analysis["status"] = "success"
        return analysis
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Analysis failed: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }


# Example usage function
def example_usage():
    """Example of how to use the what-if service with your test data"""
    test_path = Path(__file__).parent.parent / "test_data.json"
    
    # Load your test data
    with open('test_data.json', 'r') as f:
        test_data = json.load(f)
    
    # Create a mock optimization result (using assignments from test data)
    optimization_result = {
        "optimized_assignments": test_data["parking"]["assignments"]
    }
    
    # Initialize the analyzer
    analyzer = WhatIfAnalyzer()
    
    # Get all standby trains
    standby_trains = analyzer.get_standby_trains(optimization_result, test_data["readiness"])
    print(f"Found {len(standby_trains)} standby trains:")
    for train in standby_trains:
        print(f"  - {train['train_id']} (Score: {train['readiness_score']}%)")
    
    # Analyze a specific swap scenario
    if standby_trains:
        # Example: swap TM001 with the first standby train
        analysis = analyze_train_swap(
            optimization_result=optimization_result,
            scheduled_train_id="TM001",
            standby_train_id=standby_trains[0]["train_id"],
            original_readiness_data=test_data["readiness"]
        )
        
        print(f"\nSwap analysis result: {analysis['status']}")
        if analysis['status'] == 'success':
            print(f"Recommendation: {analysis['recommendation']['decision']}")
            print(f"Reasoning: {analysis['recommendation']['reasoning']}")


if __name__ == "__main__":
    example_usage()