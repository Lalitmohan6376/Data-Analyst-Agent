import duckdb
import pandas as pd

dataset = {
    "df": None,
    "filename": None,
    "history": [],
    "has_chart": False
}

def save_to_history(df):
    if df is not None:
        dataset["history"].append(df.copy(deep=True))
        if len(dataset["history"]) > 10:
            dataset["history"].pop(0)

def undo_transformation():
    if len(dataset["history"]) <= 1:
        return {"success": False, "error": "No previous state to restore"}
    dataset["history"].pop()
    dataset["df"] = dataset["history"][-1].copy(deep=True)
    return {
        "success": True,
        "total_rows": len(dataset["df"]),
        "total_cols": len(dataset["df"].columns)
    }

def generate_suggestions(df):
    num_cols = df.select_dtypes(include="number").columns.tolist()
    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    suggestions = []
    if num_cols and cat_cols:
        suggestions.append(f"Show average {num_cols[0]} by {cat_cols[0]}")
        suggestions.append(f"Plot bar chart of {num_cols[0]} by {cat_cols[0]}")
    if num_cols:
        suggestions.append(f"What is the average {num_cols[0]}?")
    if cat_cols:
        suggestions.append(f"What are the top categories in {cat_cols[0]}?")
    return suggestions[:4]

def load_dataset(file):
    name = file.filename
    try:
        if name.endswith(".csv"):
            df = pd.read_csv(file.file)
        elif name.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file.file)
        else:
            return {"error": "Please upload a CSV or Excel file"}
        df.columns = [str(c).strip() for c in df.columns]
        dataset["df"] = df
        dataset["filename"] = name
        dataset["history"] = [df.copy(deep=True)]
        dataset["has_chart"] = False
        return {
            "filename": name,
            "columns": list(df.columns),
            "total_rows": len(df),
            "total_cols": len(df.columns),
            "suggestions": generate_suggestions(df)
        }
    except Exception as e:
        return {"error": str(e)}

def get_data_preview(page=1, page_size=15):
    df = dataset.get("df")
    if df is None:
        return {"error": "No dataset loaded"}
    
    total_rows = len(df)
    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    total_pages = (total_rows + page_size - 1) // page_size if page_size else 1
    offset = (page - 1) * page_size
    sliced = duckdb.query(f"SELECT * FROM df LIMIT {page_size} OFFSET {offset}").df()
    
    return {
        "filename": dataset.get("filename", "dataset"),
        "total_rows": total_rows,
        "total_cols": len(df.columns),
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "columns": [{"name": c, "type": str(df[c].dtype)} for c in df.columns],
        "rows": sliced.fillna("").astype(str).to_dict(orient="records")
    }

def generate_automated_eda():
    df = dataset.get("df")
    if df is None:
        return {"error": "No dataset loaded"}
    
    num_cols = df.select_dtypes(include="number").columns.tolist()
    date_cols = df.select_dtypes(include=["datetime"]).columns.tolist()
    cat_cols = [c for c in df.columns if c not in num_cols and c not in date_cols]
    
    total_rows = len(df)
    total_cols = len(df.columns)
    total_cells = total_rows * total_cols
    missing_cells = int(df.isna().sum().sum())
    missing_pct = round((missing_cells / total_cells) * 100, 2) if total_cells > 0 else 0
    duplicate_rows = int(df.duplicated().sum())
    
    columns_info = []
    for col in df.columns:
        if col in num_cols:
            col_type = "numeric"
        elif col in date_cols:
            col_type = "datetime"
        else:
            col_type = "categorical"
        columns_info.append({
            "name": col,
            "type": col_type,
            "raw_type": str(df[col].dtype),
            "missing": int(df[col].isna().sum())
        })
    
    outlier_columns = []
    for col in num_cols:
        series = df[col].dropna()
        if len(series) > 3:
            q25 = series.quantile(0.25)
            q75 = series.quantile(0.75)
            iqr = q75 - q25
            if iqr > 0:
                count = int(((series < (q25 - 1.5 * iqr)) | (series > (q75 + 1.5 * iqr))).sum())
                if count > 0:
                    outlier_columns.append({"column": col, "count": count})
                    
    return {
        "filename": dataset.get("filename", "Dataset"),
        "total_rows": total_rows,
        "total_cols": total_cols,
        "missing_cells": missing_cells,
        "missing_pct": missing_pct,
        "duplicate_rows": duplicate_rows,
        "numeric_count": len(num_cols),
        "categorical_count": len(cat_cols),
        "datetime_count": len(date_cols),
        "columns_info": columns_info,
        "outlier_columns": outlier_columns
    }
