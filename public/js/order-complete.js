window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const filename = params.get("filename");
  const link = document.getElementById("pdfLink");
  if (!filename || !link) return;

  link.href = `/uploads/pdfs/${encodeURIComponent(filename)}`;
  link.textContent = filename;

  link.removeAttribute("download");
  link.target = "_blank";
  link.rel = "noopener noreferrer";
});
