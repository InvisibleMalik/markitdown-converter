import os
import tempfile
from flask import Flask, request, render_template, send_file, jsonify
from markitdown import MarkItDown

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/convert", methods=["POST"])
def convert():
    uploaded_file = request.files.get("file")
    if not uploaded_file:
        return jsonify({"error": "No file uploaded"}), 400

    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, uploaded_file.filename)
    uploaded_file.save(file_path)

    try:
        md = MarkItDown()
        result = md.convert(file_path)
        markdown_text = result.text_content
    except Exception as e:
        markdown_text = f"Error converting file: {str(e)}"

    os.remove(file_path)
    return jsonify({"markdown": markdown_text})

@app.route("/download", methods=["POST"])
def download_md():
    content = request.form.get("markdown", "")
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, "converted.md")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    return send_file(file_path, as_attachment=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)