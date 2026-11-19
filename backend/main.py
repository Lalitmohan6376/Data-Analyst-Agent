from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from data_loader import (
    load_dataset,
    dataset,
    get_data_preview,
    generate_automated_eda,
    undo_transformation
)
from agent.graph import graph

app = FastAPI(title="AI Data Analyst Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chat_history = []

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    return load_dataset(file)

@app.get("/data-preview")
async def data_preview(page: int = 1, page_size: int = 15):
    return get_data_preview(page=page, page_size=page_size)

@app.get("/eda")
async def get_eda():
    return generate_automated_eda()

@app.post("/undo")
async def undo():
    return undo_transformation()

@app.post("/reset")
async def reset_session():
    dataset["df"] = None
    dataset["filename"] = None
    dataset["history"] = []
    dataset["has_chart"] = False
    chat_history.clear()
    return {"success": True}

@app.post("/chat")
async def chat(data: dict):
    user_message = data.get("message")
    thread_id = data.get("thread_id", "default_session")
    dataset["has_chart"] = False

    try:
        result = graph.invoke(
            {"messages": [("user", user_message)]},
            config={"configurable": {"thread_id": thread_id}}
        )
    except Exception as e:
        if dataset.get("has_chart"):
            chat_history.append({"query": user_message, "reply": "Visualization generated:"})
            return {
                "reply": "Here is the visualization generated from your data:",
                "has_chart": True,
                "cleaned_ready": False,
                "can_undo": len(dataset.get("history", [])) > 1,
                "error": None
            }
        return {
            "reply": f"Analysis encountered a temporary issue: {str(e)}",
            "has_chart": False,
            "cleaned_ready": False,
            "can_undo": len(dataset.get("history", [])) > 1,
            "error": None
        }

    is_cleaned = False
    for msg in result["messages"]:
        content = str(getattr(msg, "content", ""))
        if "DATA_CLEANED_SUCCESS" in content:
            is_cleaned = True

    reply_content = result["messages"][-1].content
    if not reply_content:
        for msg in reversed(result["messages"]):
            if getattr(msg, "content", None):
                reply_content = msg.content
                break
    if not reply_content:
        if dataset.get("has_chart"):
            reply_content = "Generated visualization based on your query."
        else:
            reply_content = "Analysis executed successfully on the active dataset."

    chat_history.append({"query": user_message, "reply": reply_content})

    return {
        "reply": reply_content,
        "has_chart": dataset.get("has_chart", False),
        "cleaned_ready": is_cleaned,
        "can_undo": len(dataset.get("history", [])) > 1,
        "error": None
    }

@app.get("/chart.png")
async def get_chart():
    if not dataset.get("has_chart"):
        return {"error": "No chart found"}
    try:
        with open("chart.png", "rb") as f:
            pass
        return FileResponse("chart.png", media_type="image/png")
    except Exception:
        return {"error": "No chart found"}

@app.get("/download-cleaned")
async def download_cleaned():
    df = dataset.get("df")
    if df is None:
        return {"error": "No dataset available"}
    df.to_csv("cleaned.csv", index=False)
    return FileResponse("cleaned.csv", media_type="text/csv", filename="cleaned_dataset.csv")

@app.get("/export-report")
async def export_report():
    df = dataset.get("df")
    if df is None:
        return {"error": "No dataset available"}

    report_file = "report.pdf"
    doc = SimpleDocTemplate(report_file, pagesize=letter, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    story = [] 

    story.append(Paragraph("AI Data Analyst - Executive Summary", styles["Heading1"]))
    story.append(Spacer(1, 10))

    fname = str(dataset.get("filename", "Active Dataset"))
    meta_text = f"Dataset: <b>{fname}</b> | Total Rows: <b>{len(df)}</b> | Columns: <b>{len(df.columns)}</b>"
    story.append(Paragraph(meta_text, styles["Normal"]))
    story.append(Spacer(1, 15))

    if dataset.get("has_chart"):
        try:
            with open("chart.png", "rb") as f:
                pass
            story.append(Paragraph("<b>Featured Visualization:</b>", styles["Heading2"]))
            story.append(Spacer(1, 8))
            story.append(Image("chart.png", width=460, height=240))
            story.append(Spacer(1, 15))
        except Exception:
            pass

    story.append(Paragraph("<b>Analysis Log:</b>", styles["Heading2"]))
    story.append(Spacer(1, 8))

    if not chat_history:
        story.append(Paragraph("No queries logged in this session.", styles["Normal"]))
    else:
        for idx, item in enumerate(chat_history[-8:], 1):
            q_text = f"<b>Q{idx}:</b> {item['query']}"
            r_text = f"<b>Insight:</b> {item['reply'][:600]}"
            story.append(Paragraph(q_text, styles["Normal"]))
            story.append(Spacer(1, 4))
            story.append(Paragraph(r_text, styles["Normal"]))
            story.append(Spacer(1, 10))

    doc.build(story)
    return FileResponse(report_file, media_type="application/pdf", filename="executive_report.pdf")
