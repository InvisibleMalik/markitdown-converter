// main.js - handles file selection, drag/drop, AJAX conversion, UI states
document.addEventListener("DOMContentLoaded", function () {
  const drop = document.getElementById("drop-area");
  const fileInput = document.getElementById("file-input");
  const browseLink = document.getElementById("browse-link");
  const convertBtn = document.getElementById("convert-btn");
  const progress = document.getElementById("progress");
  const progressText = document.getElementById("progress-text");
  const resultPanel = document.getElementById("result-panel");
  const output = document.getElementById("markdown-output");
  const copyBtn = document.getElementById("copy-btn");
  const downloadMarkdown = document.getElementById("download-markdown");
  const downloadName = document.getElementById("download-name");
  const selectedFile = document.getElementById("selected-file");
  const errorBox = document.getElementById("error-box");
  const taskSlug = document.getElementById("task-slug").value;

  // drag/drop
  drop.addEventListener("click", () => fileInput.click());
  browseLink.addEventListener("click", (e) => { e.preventDefault(); fileInput.click(); });

  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("dragover");
  });
  drop.addEventListener("dragleave", (e) => {
    e.preventDefault();
    drop.classList.remove("dragover");
  });
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      showSelectedFile();
    }
  });

  fileInput.addEventListener("change", showSelectedFile);

  function showSelectedFile() {
    if (fileInput.files && fileInput.files.length) {
      const f = fileInput.files[0];
      selectedFile.textContent = `${f.name} · ${Math.round(f.size/1024)} KB`;
      resultPanel.classList.add("d-none");
      errorBox.classList.add("d-none");
    } else {
      selectedFile.textContent = "";
    }
  }

  convertBtn.addEventListener("click", async () => {
    errorBox.classList.add("d-none");
    if (!fileInput.files || fileInput.files.length === 0) {
      return showError("Please select a file first.");
    }
    const file = fileInput.files[0];
    // small client check for size
    if (file.size > 20 * 1024 * 1024) {
      return showError("File too large. Max allowed: 20MB.");
    }

    // Prepare form data
    const fd = new FormData();
    fd.append("file", file);
    fd.append("task", taskSlug);

    // UI states
    progress.classList.remove("d-none");
    output.value = "";
    resultPanel.classList.add("d-none");
    convertBtn.disabled = true;

    try {
      const res = await fetch("/api/convert", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        showError(json.error || "Conversion failed");
      } else {
        const md = json.markdown || "";
        output.value = md;
        downloadMarkdown.value = md;
        // set download file name based on uploaded filename
        const original = json.filename || "converted";
        downloadName.value = original.replace(/\.[^/.]+$/, "") + ".md";
        resultPanel.classList.remove("d-none");
        // scroll into view
        resultPanel.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      showError("Network or server error: " + err.message);
    } finally {
      progress.classList.add("d-none");
      convertBtn.disabled = false;
    }
  });

  copyBtn && copyBtn.addEventListener("click", function () {
    output.select();
    document.execCommand("copy");
    copyBtn.textContent = "✅ Copied";
    setTimeout(() => copyBtn.textContent = "📋 Copy", 1500);
  });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("d-none");
  }

  // Theme toggle (optional)
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    });
  }

}); // DOMContentLoaded