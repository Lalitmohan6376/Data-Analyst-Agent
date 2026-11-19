from dotenv import load_dotenv
from langchain_groq import ChatGroq
from agent.prompts import prompt
from agent.tools import run_code, clean_data, create_chart, run_sql

load_dotenv()

llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0)
model_with_tools = llm.bind_tools([run_code, clean_data, create_chart, run_sql])

analyst_chain = prompt | model_with_tools
