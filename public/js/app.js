document.addEventListener("DOMContentLoaded", () => {
  const assignModal = document.getElementById("assignModal");
  if (assignModal) {
    assignModal.addEventListener("show.bs.modal", (event) => {
      const button = event.relatedTarget;
      const keluhanId = button.getAttribute("data-keluhan");
      document.getElementById("assignKeluhanId").value = keluhanId;
    });
  }
});
