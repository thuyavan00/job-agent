import os
from dotenv import load_dotenv
from typing import TypedDict
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
import sys
import json

# Define the State
class AgentState(TypedDict):
    resume: str
    job_description: str
    tailored_resume: str
    critique: str
    iterations: int

load_dotenv()

#llm = ChatAnthropic(model="claude-3-5-sonnet-20241022", temperature=0)
llm = ChatOpenAI(
    model="gpt-5-mini", 
    temperature=0
)
# 1. Define the routing logic FIRST
def should_continue(state: AgentState):
    # If the critique says FACTUAL, we stop. Otherwise, go back to writer.
    if "FACTUAL" in state.get("critique", ""):
        return END
    return "writer"

# 2. Define the Nodes
# --- NODE 1: ANALYZER ---
def analyzer(state: AgentState):
    prompt = ChatPromptTemplate.from_template("""
    You are a Senior Recruiter. Compare the provided <resume> and <job_description>.
    Identify key skill gaps. Do NOT suggest new experience. Only identify what is missing.
    
    Resume: {resume}
    JD: {jd}
    """)
    response = llm.invoke(prompt.format(resume=state['resume'], jd=state['job_description']))
    return {"critique": response.content, "iterations": state.get("iterations", 0) + 1}

# --- NODE 2: WRITER (The "Fact-Grounded" Prompt) ---
def writer(state: AgentState):
    # This prompt uses "Negative Constraints" to prevent hallucinations
    prompt = ChatPromptTemplate.from_template("""
    You are an expert Resume Editor. Your task is to rewrite the resume to match the JD.
    
    CRITICAL RULES:
    1. Only use facts present in the original <resume>. 
    2. DO NOT invent job titles, companies, or dates.
    3. DO NOT fabricate metrics or achievements.
    4. You MAY rephrase existing bullet points to use keywords from the <job_description>.
    
    Original Resume: {resume}
    Job Description: {jd}
    Gap Analysis: {critique}
    
    Output the tailored resume in Markdown.
    """)
    response = llm.invoke(prompt.format(
        resume=state['resume'], 
        jd=state['job_description'], 
        critique=state['critique']
    ))
    return {"tailored_resume": response.content}

# --- NODE 3: REFLECTOR (The Fact-Checker) ---
def reflect(state: AgentState):
    prompt = ChatPromptTemplate.from_template("""
    Compare the <tailored_resume> with the <original_resume>.
    Did the assistant invent any new work experience or skills that weren't in the original?
    
    If yes, list the hallucinations and say 'NEEDS REVISION'.
    If no, say 'FACTUAL'.
    
    Original: {resume}
    Tailored: {tailored}
    """)
    response = llm.invoke(prompt.format(resume=state['resume'], tailored=state['tailored_resume']))
    return {"critique": response.content}

# 5. Build the Graph
workflow = StateGraph(AgentState)

workflow.add_node("analyzer", analyzer)
workflow.add_node("writer", writer)
workflow.add_node("reflect", reflect)

workflow.set_entry_point("analyzer")
workflow.add_edge("analyzer", "writer")
workflow.add_edge("writer", "reflect")

# Conditional Edge: Does it need another pass?
workflow.add_conditional_edges("reflect", should_continue)

app = workflow.compile()

def main():
    # 1. Read input from NestJS stdin
    try:
        raw_input = sys.stdin.read()
        if not raw_input:
            return
        data = json.loads(raw_input)
    except Exception as e:
        sys.stderr.write(f"Error parsing input: {str(e)}\n")
        sys.exit(1)

    # 2. Setup your Agent inputs
    inputs = {
        "resume": data["resume"],
        "job_description": data["jd"],
        "iterations": 0
    }

    # 3. Run the Graph (Assuming 'app' is your compiled LangGraph)
    try:
        # We use .invoke() to get the final state after all loops
        final_state = app.invoke(inputs)
        
        # 4. Output ONLY the final resume to stdout
        # NestJS captures this
        print(final_state["tailored_resume"])
    except Exception as e:
        sys.stderr.write(f"Agent Error: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()