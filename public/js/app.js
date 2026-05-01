document.addEventListener("DOMContentLoaded", () => {
  const assignModal = document.getElementById("assignModal");
  if (assignModal) {
    assignModal.addEventListener("show.bs.modal", (event) => {
      const button = event.relatedTarget;
      const keluhanId = button.getAttribute("data-keluhan");
      document.getElementById("assignKeluhanId").value = keluhanId;
    });
  }

  const paymentMethodSelect = document.getElementById("paymentMethodSelect");
  const paymentBillSelect = document.getElementById("paymentBillSelect");
  if (paymentMethodSelect && paymentBillSelect) {
    const syncMethodHint = () => {
      if (paymentMethodSelect.value === "cash" && paymentBillSelect.value) {
        const url = new URL(window.location.href);
        url.searchParams.set("metode", "cash");
        url.searchParams.set("id_tagihan", paymentBillSelect.value);
        history.replaceState({}, "", url);
      }
    };

    paymentMethodSelect.addEventListener("change", syncMethodHint);
    paymentBillSelect.addEventListener("change", syncMethodHint);
  }
});
