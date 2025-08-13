import os
import tempfile
import shutil
from flask import Flask, request, render_template, jsonify, send_file, redirect, url_for
from markitdown import MarkItDown

app = Flask(__name__, static_folder="static", template_folder="templates")
# Max upload size (20 MB)
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024

# Define tasks and allowed extensions (simple mapping)
TASKS = {
    "pdf-to-md": {
        "title": "PDF to Markdown",
        "description": "Convert PDF documents into clean Markdown.",
        "extensions": [".pdf"]
    },
    "word-to-md": {
        "title": "Word (DOCX) to Markdown",
        "description": "Convert .docx files into Markdown.",
        "extensions": [".docx", ".doc"]
    },
    "ppt-to-md": {
        "title": "PowerPoint to Markdown",
        "description": "Convert presentations (.pptx) into Markdown.",
        "extensions": [".pptx", ".ppt"]
    },
    "excel-to-md": {
        "title": "Excel to Markdown",
        "description": "Convert spreadsheets (.xlsx) into Markdown tables.",
        "extensions": [".xlsx", ".xls"]
    },
    "html-to-md": {
        "title": "HTML to Markdown",
        "description": "Convert HTML files to Markdown.",
        "extensions": [".html", ".htm"]
    },
    "any-to-md": {
        "title": "Any File to Markdown",
        "description": "Let MarkItDown detect file type automatically.",
        "extensions": []  # allow any
    }
}

def allowed_file_for_task(filename, task_slug):
    if not filename:
        return False
    ext = os.path.splitext(filename.lower())[1]
    exts = TASKS.get(task_slug, {}).get("extensions", [])
    if not exts:
        return True  # any file allowed
    return ext in exts

@app.route("/")
def index():
    # Show list of tasks
    return render_template("index.html", tasks=TASKS)

@app.route("/task/<task_slug>")
def task_page(task_slug):
    task = TASKS.get(task_slug)
    if not task:
        return redirect(url_for("index"))
    return render_template("task.html", task_slug=task_slug, task=task)

@app.route("/api/convert", methods=["POST"])
def api_convert():
    task_slug = request.form.get("task", "any-to-md")
    uploaded_file = request.files.get("file")
    if not uploaded_file:
        return jsonify({"error": "No file uploaded"}), 400

    filename = uploaded_file.filename or "uploaded"
    if not allowed_file_for_task(filename, task_slug):
        return jsonify({"error": f"File type not allowed for this task. Allowed: {TASKS[task_slug]['extensions']}"}), 400

    temp_dir = tempfile.mkdtemp()
    local_path = os.path.join(temp_dir, filename)
    uploaded_file.save(local_path)

    try:
        md = MarkItDown()
        result = md.convert(local_path)
        markdown_text = result.text_content
    except Exception as e:
        # return the meaningful message to UI
        markdown_text = None
        error_msg = f"Error converting file: {str(e)}"
        # cleanup then return
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass
        return jsonify({"error": error_msg}), 500

    # cleanup file
    try:
        shutil.rmtree(temp_dir)
    except Exception:
        pass

    return jsonify({"markdown": markdown_text, "filename": filename})

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
    # Flask >=2.2 supports download_name
    return send_file(file_path, as_attachment=True, download_name=name)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))