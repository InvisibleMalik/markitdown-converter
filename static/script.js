document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("theme-toggle");
    const body = document.body;

    // Dark mode toggle
    if (localStorage.getItem("theme") === "dark") {
        body.classList.add("dark");
    }
    themeToggle.addEventListener("click", () => {
        body.classList.toggle("dark");
        localStorage.setItem("theme", body.classList.contains("dark") ? "dark" : "light");
    });

    const uploadArea = document.getElementById("upload-area");
    const fileInput = document.getElementById("file-input");
    const convertBtn = document.getElementById("convert-btn");
    const loading = document.getElementById("loading");
    const resultArea = document.getElementById("result-area");
    const markdownOutput = document.getElementById("markdown-output");
    const downloadMarkdown = document.getElementById("download-markdown");

    uploadArea.addEventListener("dragover", e => {
        e.preventDefault();
        uploadArea.style.background = "#cbd5e0";
    });
    uploadArea.addEventListener("dragleave", () => {
        uploadArea.style.background = "";
    });
    uploadArea.addEventListener("drop", e => {
        e.preventDefault();
        fileInput.files = e.dataTransfer.files;
        uploadArea.style.background = "";
    });

    convertBtn.addEventListener("click", () => {
        if (!fileInput.files.length) {
            alert("Please select a file first!");
            return;
        }
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        loading.classList.remove("hidden");
        resultArea.classList.add("hidden");

        fetch("/convert", {
            method: "POST",
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            loading.classList.add("hidden");
            if (data.error) {
                alert(data.error);
                return;
            }
            markdownOutput.value = data.markdown;
            downloadMarkdown.value = data.markdown;
            resultArea.classList.remove("hidden");
        });
    });
});

function copyMarkdown() {
    const textarea = document.getElementById("markdown-output");
    textarea.select();
    document.execCommand("copy");
    alert("Markdown copied to clipboard!");
}