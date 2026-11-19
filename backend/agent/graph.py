from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from agent.chains import analyst_chain
from agent.tools import run_code, create_chart, clean_data, run_sql
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver

class State(TypedDict):
    messages: Annotated[list,add_messages]

def analyst_node(state: State):
    msgs = state["messages"][-8:] if len(state["messages"]) > 8 else state["messages"]
    response = analyst_chain.invoke({"messages": msgs})
    return {"messages": [response]}

builder = StateGraph(State)

builder.add_node("analyst",analyst_node)
builder.add_node("tools", ToolNode([run_code,create_chart,clean_data,run_sql]))

builder.add_edge(START,"analyst")
builder.add_conditional_edges("analyst", tools_condition)
builder.add_edge("tools","analyst")

checkpointer = MemorySaver()
graph = builder.compile(checkpointer=checkpointer)
