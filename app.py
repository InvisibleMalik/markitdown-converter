import os
import re
import tempfile
import shutil
from flask import Flask, request, render_template, jsonify, send_file, redirect, url_for, make_response
from markitdown import MarkItDown

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # 20 MB

TASKS = {
    "pdf-to-md": {
        "title": "PDF to Markdown",
        "description": "Convert PDF documents into clean Markdown.",
        "extensions": [".pdf"],
        "guide": "Best for text-based PDFs. For scanned PDFs, run OCR first."
    },
    "word-to-md": {
        "title": "Word (DOCX) to Markdown",
        "description": "Convert .docx files into Markdown.",
        "extensions": [".docx", ".doc"],
        "guide": "Works best with modern .docx files."
    },
    "ppt-to-md": {
        "title": "PowerPoint to Markdown",
        "description": "Convert .pptx/.ppt slides into Markdown.",
        "extensions": [".pptx", ".ppt"],
        "guide": "Slides become headings and lists; check bullet formatting."
    },
    "excel-to-md": {
        "title": "Excel to Markdown",
        "description": "Convert .xlsx/.xls spreadsheets into Markdown tables.",
        "extensions": [".xlsx", ".xls"],
        "guide": "Very large sheets may be trimmed for readability."
    },
    "html-to-md": {
        "title": "HTML to Markdown",
        "description": "Convert .html files to Markdown.",
        "extensions": [".html", ".htm"],
        "guide": "Great for exporting blog posts or simple pages."
    },
    "any-to-md": {
        "title": "Any File to Markdown",
        "description": "Let MarkItDown detect file type automatically.",
        "extensions": [],
        "guide": "Use this if you’re unsure of the file type."
    }
}

@app.context_processor
def inject_tasks():
    return dict(tasks=TASKS)

def allowed_file_for_task(filename: str, task_slug: str) -> bool:
    if not filename:
        return False
    ext = os.path.splitext(filename.lower())[1]
    allowed = TASKS.get(task_slug, {}).get("extensions", [])
    return True if not allowed else ext in allowed

def polish_markdown(md: str) -> str:
    """Light cleanup to feel modern/GitHuby without changing content semantics."""
    if not md:
        return ""
    # Normalize line endings
    md = md.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse 3+ blank lines to max 2
    md = re.sub(r"\n{3,}", "\n\n", md)
    # Trim trailing spaces
    md = re.sub(r"[ \t]+\n", "\n", md)
    # Ensure file ends with single newline
    if not md.endswith("\n"):
        md += "\n"
    return md

@app.route("/")
def index():
    return render_template(
        "index.html",
        page_title="File to Markdown Converter",
        page_desc="Convert files to Markdown fast — PDF, Word, PowerPoint, Excel, HTML and more."
    )

@app.route("/task/<task_slug>")
def task_page(task_slug):
    task = TASKS.get(task_slug)
    if not task:
        return redirect(url_for("index"))
    return render_template(
        "task.html",
        task_slug=task_slug,
        task=task,
        page_title=task["title"],
        page_desc=task["description"]
    )

@app.route("/api/convert", methods=["POST"])
def api_convert():
    task_slug = request.form.get("task", "any-to-md")
    f = request.files.get("file")
    if not f or f.filename == "":
        return jsonify({"error": "No file uploaded."}), 400

    if not allowed_file_for_task(f.filename, task_slug):
        return jsonify({"error": f"File type not allowed for this task. Allowed: {TASKS[task_slug]['extensions']}"}), 400

    temp_dir = tempfile.mkdtemp()
    try:
        local_path = os.path.join(temp_dir, f.filename)
        f.save(local_path)

        md_engine = MarkItDown()
        result = md_engine.convert(local_path)
        markdown_text = polish_markdown(result.text_content or "")

        return jsonify({"markdown": markdown_text, "filename": f.filename})
    except Exception as e:
        return jsonify({"error": f"Error converting file: {e}"}), 500
    finally:
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass

@app.route("/download", methods=["POST"])
def download():
    content = request.form.get("markdown", "")
    name = request.form.get("name", "converted.md")
    if not content:
        return "No content", 400

    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, name)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    return send_file(file_path, as_attachment=True, download_name=name)

@app.route("/sitemap.xml")
def sitemap():
    base = request.url_root.rstrip("/")
    urls = [base + url_for("index")] + [base + url_for("task_page", task_slug=s) for s in TASKS.keys()]
    xml = ["<?xml version='1.0' encoding='UTF-8'?>", "<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>"]
    xml += [f"<url><loc>{u}</loc><changefreq>monthly</changefreq></url>" for u in urls]
    xml.append("</urlset>")
    resp = make_response("\n".join(xml))
    resp.headers["Content-Type"] = "application/xml"
    return resp

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
