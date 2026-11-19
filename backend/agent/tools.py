import pandas as pd
import seaborn as sns
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import duckdb
from langchain_core.tools import tool
import data_loader

@tool
def run_sql(query: str):
    """Run SQL queries on df using duckdb."""
    df = data_loader.dataset.get("df")
    if df is None:
        return "Error: No dataset loaded."
    try:
        return str(duckdb.query(query).df())
    except Exception as e:
        return str(e)

@tool
def run_code(code: str):
    """Run python analysis code on df."""
    df = data_loader.dataset.get("df")
    if df is None:
        return "Error: No dataset loaded."
    output = []
    def custom_print(*args, **kwargs):
        output.append(" ".join(str(a) for a in args))
    try:
        scope = {"df": df, "pd": pd, "duckdb": duckdb, "print": custom_print}
        stripped = code.strip()
        if "\n" not in stripped and not stripped.startswith("import") and "=" not in stripped and not stripped.startswith("print("):
            val = eval(stripped, scope)
            return str(val)
        exec(code, scope)
        if output:
            return "\n".join(output)
        if "result" in scope:
            return str(scope["result"])
        return "Code executed successfully."
    except Exception as e:
        return str(e)

@tool
def clean_data(code: str):
    """Clean and transform df."""
    df = data_loader.dataset.get("df")
    if df is None:
        return "Error: No dataset loaded."
    try:
        data_loader.save_to_history(df)
        scope = {"df": df.copy(), "pd": pd, "duckdb": duckdb}
        exec(code, scope)
        updated_df = scope.get("df", df)
        data_loader.dataset["df"] = updated_df
        updated_df.to_csv("cleaned.csv", index=False)
        return f"DATA_CLEANED_SUCCESS: Dataset updated to {updated_df.shape[0]} rows and {updated_df.shape[1]} columns."
    except Exception as e:
        return f"Data cleaning error: {str(e)}"

@tool
def create_chart(code: str):
    """Generate and save chart to chart.png."""
    df = data_loader.dataset.get("df")
    if df is None:
        return "Error: No dataset loaded."
    try:
        plt.close("all")
        plt.figure(figsize=(9, 5), dpi=130)
        sns.set_theme(style="whitegrid", palette="muted")
        
        orig_close = matplotlib.pyplot.close
        orig_show = matplotlib.pyplot.show
        matplotlib.pyplot.close = lambda *args, **kwargs: None
        matplotlib.pyplot.show = lambda *args, **kwargs: None

        scope = {"df": df, "plt": plt, "sns": sns, "pd": pd, "duckdb": duckdb}
        exec(code, scope)
        
        figures = [plt.figure(i) for i in plt.get_fignums()]
        target_fig = None
        for f in reversed(figures):
            if f.axes:
                target_fig = f
                break
        
        if target_fig is not None and target_fig.axes:
            for ax in target_fig.axes:
                try:
                    sns.despine(ax=ax)
                except Exception:
                    pass
            target_fig.tight_layout()
            target_fig.savefig("chart.png", bbox_inches="tight", dpi=130)
        
        matplotlib.pyplot.close = orig_close
        matplotlib.pyplot.show = orig_show
        orig_close("all")
        
        data_loader.dataset["has_chart"] = True
        return "CHART_CREATED_SUCCESS"
    except Exception as e:
        plt.close("all")
        return f"Chart generation error: {str(e)}"
