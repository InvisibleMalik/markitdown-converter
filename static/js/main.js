document.addEventListener("DOMContentLoaded", function () {
  const drop = document.getElementById("drop-area");
  const fileInput = document.getElementById("file-input");
  const browseLink = document.getElementById("browse-link");
  const convertBtn = document.getElementById("convert-btn");
  const progressWrap = document.getElementById("progress-wrap");
  const uploadBar = document.getElementById("upload-bar");
  const processBar = document.getElementById("process-bar");
  const resultPanel = document.getElementById("result-panel");
  const output = document.getElementById("markdown-output");
  const preview = document.getElementById("markdown-preview");
  const copyBtn = document.getElementById("copy-btn");
  const downloadMarkdown = document.getElementById("download-markdown");
  const downloadName = document.getElementById("download-name");
  const selectedFile = document.getElementById("selected-file");
  const errorBox = document.getElementById("error-box");
  const progressLabel = document.getElementById("progress-label");
  const resultFilename = document.getElementById("result-filename");
  const taskSlugEl = document.getElementById("task-slug");
  const taskSlug = taskSlugEl ? taskSlugEl.value : "any-to-md";

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("d-none");
  }
  function hideError() { errorBox.classList.add("d-none"); }

  // Drag & drop
  drop.addEventListener("click", (e) => { e.preventDefault(); fileInput.click(); });
  browseLink.addEventListener("click", (e) => { e.preventDefault(); fileInput.click(); });

  ["dragover","dragenter"].forEach(evt =>
    drop.addEventListener(evt, e => { e.preventDefault(); drop.classList.add("dragover"); })
  );
  ["dragleave","drop"].forEach(evt =>
    drop.addEventListener(evt, e => { e.preventDefault(); drop.classList.remove("dragover"); })
  );
  drop.addEventListener("drop", (e) => {
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
      hideError();
    } else {
      selectedFile.textContent = "";
    }
  }

  // Convert with upload progress
  convertBtn && convertBtn.addEventListener("click", async () => {
    hideError();
    if (!fileInput.files || fileInput.files.length === 0) {
      return showError("Please select a file first.");
    }
    const file = fileInput.files[0];
    if (file.size > 20 * 1024 * 1024) {
      return showError("File too large. Max allowed: 20MB.");
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("task", taskSlug);

    progressWrap.classList.remove("d-none");
    uploadBar.style.width = "0%";
    uploadBar.textContent = "0%";
    processBar.style.visibility = "hidden";
    resultPanel.classList.add("d-none");
    convertBtn.disabled = true;

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/convert", true);

      // Upload progress
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          uploadBar.style.width = pct + "%";
          uploadBar.textContent = pct + "%";
          progressLabel.textContent = "Uploading…";
          if (pct >= 100) {
            // Switch to processing state
            progressLabel.textContent = "Processing…";
            processBar.style.visibility = "visible";
          }
        }
      };

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          convertBtn.disabled = false;
          progressWrap.classList.add("d-none");
          if (xhr.status >= 200 && xhr.status < 300) {
            const json = JSON.parse(xhr.responseText);
            const md = json.markdown || "";
            const original = json.filename || "converted";
            const mdName = original.replace(/\.[^/.]+$/, "") + ".md";

            // Fill outputs
            output.value = md;
            downloadMarkdown.value = md;
            downloadName.value = mdName;
            resultFilename.textContent = mdName;

            // Live preview (GitHub style)
            try {
              const html = window.marked ? window.marked.parse(md) : md;
              preview.innerHTML = html;
            } catch {
              preview.textContent = md;
            }

            resultPanel.classList.remove("d-none");
            resultPanel.scrollIntoView({ behavior: "smooth" });
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              showError(err.error || "Conversion failed.");
            } catch {
              showError("Conversion failed.");
            }
          }
        }
      };

      xhr.send(fd);
    } catch (err) {
      convertBtn.disabled = false;
      progressWrap.classList.add("d-none");
      showError("Network or server error: " + err.message);
    }
  });

  // Copy
  copyBtn && copyBtn.addEventListener("click", function () {
    output.select();
    document.execCommand("copy");
    const old = copyBtn.textContent;
    copyBtn.textContent = "✅ Copied";
    setTimeout(() => copyBtn.textContent = old, 1500);
  });
});
