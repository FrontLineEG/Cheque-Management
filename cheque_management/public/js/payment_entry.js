frappe.ui.form.on("Payment Entry", {
    refresh(frm) {},
    validate(frm) {
        if (
            frm.doc.mode_of_payment === "Payable Cheque" &&
            frm.doc.payment_type !== "Pay"
        ) {
            frappe.throw("You Must Choose <b>(Pay)</b> for payment type");
        }

        if (
            frm.doc.mode_of_payment === "Receivable Cheque" &&
            frm.doc.payment_type !== "Receive"
        ) {
            frappe.throw("You Must Choose <b>(Receive)</b> for payment type");
        }
    },
});