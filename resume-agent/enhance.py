"""ATS Resume Enhancement Agent

Enhances a structured profile JSON for ATS compliance and single-page formatting,
then extracts career metadata (detected role + total years of experience).

Input  (stdin) : {"profile": { basics, education, experience, projects, skills }}
Output (stdout): {
  "profile": { ...enhanced profile, same structure... },
  "detected_role": "Full Stack Engineer",
  "years_of_experience": 3.5
}
"""

import json
import sys
from typing import TypedDict, Optional

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

load_dotenv()

llm = ChatOpenAI(model="gpt-5-mini", temperature=0.3)


# ── State ─────────────────────────────────────────────────────────────────────

class EnhanceState(TypedDict):
    profile: dict
    enhanced: dict
    validation_feedback: str
    iterations: int
    detected_role: str
    years_of_experience: float


# ── Prompts ───────────────────────────────────────────────────────────────────

ENHANCE_SYSTEM = """\
You are an expert resume writer who specialises in crafting ATS-optimised, \
single-page tech resumes that consistently score 90+ on ATS scanners.

ABSOLUTE RULES — NEVER BREAK THESE:
1. Do NOT invent, add, or fabricate any facts, companies, job titles, dates,
   skills, projects, or achievements not already present in the input.
2. Do NOT remove any experience entry, project, or education entry — only
   trim bullets within entries.
3. Preserve every field name and data type exactly (JSON structure must be
   identical to the input).
4. Return ONLY valid JSON — no markdown fences, no explanatory text.

ATS OPTIMISATION RULES:
• Start every bullet with a strong past-tense action verb (Led, Built,
  Developed, Implemented, Optimised, Reduced, Increased, Architected,
  Deployed, Automated, Streamlined, Designed, Integrated, Migrated, …)
• Keep each bullet under 100 characters (one physical line on the page)
• Weave in industry-standard tech keywords that naturally fit the context
• No personal pronouns (I, my, we) anywhere in the document
• Summary: 2–3 tight sentences, keyword-rich, no pronouns

ONE-PAGE CONSTRAINTS:
• Experience : keep max 4 bullets per entry (drop the weakest if more exist)
• Projects   : keep max 3 bullets per entry (if project has description but
               no bullets, convert description into 1 tight bullet)
• Education  : keep compact — no extra prose beyond what is given
• Skills     : return skills.items unchanged — ATS scans them verbatim
"""

VALIDATE_SYSTEM = """\
You are an ATS compliance auditor reviewing a resume profile JSON.

Check every criterion below and report strictly:

CRITERIA:
1. Every bullet in experience and projects starts with a strong action verb
2. No single bullet exceeds 100 characters
3. No experience entry has more than 4 bullets
4. No project entry has more than 3 bullets
5. summary is 2–3 sentences, contains no personal pronouns
6. No hallucinated content (all data looks factually grounded)
7. Total content volume is reasonable for a single printed page

If EVERY criterion passes → reply with exactly: APPROVED
If any criterion fails  → reply with: REVISION_NEEDED
  then list each issue as a numbered line so the writer can fix it.
"""

EXTRACT_SYSTEM = """\
You are a career analyst. Given a resume profile JSON, do two things:

1. DETECTED ROLE — Identify the single best-fit standard job title that describes
   this person based on their combined experience, projects, and skills.
   Use a specific, industry-recognised title such as:
   "Full Stack Engineer", "Backend Engineer", "Frontend Engineer",
   "Data Engineer", "DevOps / Platform Engineer", "Machine Learning Engineer",
   "Mobile Developer", "Cloud Engineer", "Site Reliability Engineer", etc.

2. YEARS OF EXPERIENCE — Calculate total professional years by examining the
   startDate and endDate of every experience entry.
   - Treat missing/empty endDate as today (ongoing role).
   - Dates may be in formats like "July, 2025", "Sep. 2017", "2020-01", etc.
   - Sum up durations (handle overlaps conservatively — don't double-count).
   - Round to one decimal place (e.g. 3.5).

Return ONLY valid JSON with exactly these two fields — no markdown, no extra text:
{
  "detected_role": "...",
  "years_of_experience": 0.0
}
"""


# ── Nodes ─────────────────────────────────────────────────────────────────────

def enhance_node(state: EnhanceState) -> dict:
    prior_issues = ""
    if state.get("validation_feedback") and not state["validation_feedback"].startswith("APPROVED"):
        prior_issues = (
            f"\n\nThe previous attempt had these issues — fix all of them:\n"
            f"{state['validation_feedback']}"
        )

    messages = [
        {"role": "system", "content": ENHANCE_SYSTEM},
        {
            "role": "user",
            "content": (
                "Enhance the following resume profile for ATS and one-page compliance."
                f"{prior_issues}\n\n"
                f"Profile JSON:\n{json.dumps(state['profile'], indent=2)}"
            ),
        },
    ]

    response = llm.invoke(messages)
    content = response.content.strip()

    # Strip accidental markdown code fences
    if "```json" in content:
        content = content.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in content:
        content = content.split("```", 1)[1].split("```", 1)[0].strip()

    try:
        enhanced = json.loads(content)
    except json.JSONDecodeError:
        enhanced = state["profile"]

    return {**state, "enhanced": enhanced, "iterations": state.get("iterations", 0) + 1}


def validate_node(state: EnhanceState) -> dict:
    messages = [
        {"role": "system", "content": VALIDATE_SYSTEM},
        {
            "role": "user",
            "content": (
                "Validate this enhanced resume profile:\n\n"
                f"{json.dumps(state['enhanced'], indent=2)}"
            ),
        },
    ]
    response = llm.invoke(messages)
    return {**state, "validation_feedback": response.content.strip()}


def extract_metadata_node(state: EnhanceState) -> dict:
    """Detect best-fit job role and calculate years of experience."""
    profile_to_analyse = state.get("enhanced") or state["profile"]

    messages = [
        {"role": "system", "content": EXTRACT_SYSTEM},
        {
            "role": "user",
            "content": (
                "Analyse this resume profile and return the detected role and "
                f"years of experience:\n\n{json.dumps(profile_to_analyse, indent=2)}"
            ),
        },
    ]

    response = llm.invoke(messages)
    content = response.content.strip()

    if "```json" in content:
        content = content.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in content:
        content = content.split("```", 1)[1].split("```", 1)[0].strip()

    try:
        meta = json.loads(content)
        detected_role = str(meta.get("detected_role", ""))
        years_of_experience = float(meta.get("years_of_experience", 0))
    except Exception:
        detected_role = ""
        years_of_experience = 0.0

    return {**state, "detected_role": detected_role, "years_of_experience": years_of_experience}


def should_continue(state: EnhanceState) -> str:
    # Always proceed to metadata extraction; limit enhancement loops to 2
    if state.get("iterations", 0) >= 2:
        return "extract_metadata"
    if state.get("validation_feedback", "").startswith("APPROVED"):
        return "extract_metadata"
    return "enhance"


# ── Graph ─────────────────────────────────────────────────────────────────────

builder = StateGraph(EnhanceState)
builder.add_node("enhance", enhance_node)
builder.add_node("validate", validate_node)
builder.add_node("extract_metadata", extract_metadata_node)
builder.set_entry_point("enhance")
builder.add_edge("enhance", "validate")
builder.add_conditional_edges(
    "validate",
    should_continue,
    {"enhance": "enhance", "extract_metadata": "extract_metadata"},
)
builder.add_edge("extract_metadata", END)
graph = builder.compile()


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            sys.stderr.write("enhance.py: no input received\n")
            sys.exit(1)
        data = json.loads(raw)
        profile = data["profile"]
    except Exception as exc:
        sys.stderr.write(f"enhance.py: input parse error — {exc}\n")
        sys.exit(1)

    try:
        initial_state: EnhanceState = {
            "profile": profile,
            "enhanced": {},
            "validation_feedback": "",
            "iterations": 0,
            "detected_role": "",
            "years_of_experience": 0.0,
        }
        result = graph.invoke(initial_state)

        enhanced = result.get("enhanced")
        if not enhanced or not isinstance(enhanced, dict) or "basics" not in enhanced:
            enhanced = profile

        output = {
            "profile": enhanced,
            "detected_role": result.get("detected_role", ""),
            "years_of_experience": result.get("years_of_experience", 0.0),
        }
        print(json.dumps(output))

    except Exception as exc:
        sys.stderr.write(f"enhance.py: agent error — {exc}\n")
        # Graceful fallback: return original profile with empty metadata
        print(json.dumps({
            "profile": profile,
            "detected_role": "",
            "years_of_experience": 0.0,
        }))


if __name__ == "__main__":
    main()
