import frappe

@frappe.whitelist()
def validate_mode_of_payments():
    if not frappe.db.exists("Mode of Payment","Receivable Cheque"):
        mode_of_payment_doc = frappe.new_doc("Mode of Payment")
        mode_of_payment_doc.mode_of_payment = "Receivable Cheque"
        mode_of_payment_doc.enabled = 1
        mode_of_payment_doc.type = "Bank"
        mode_of_payment_doc.insert()
    
    if not frappe.db.exists("Mode of Payment","Payable Cheque"):
        mode_of_payment_doc = frappe.new_doc("Mode of Payment")
        mode_of_payment_doc.mode_of_payment = "Payable Cheque"
        mode_of_payment_doc.enabled = 1
        mode_of_payment_doc.type = "Bank"
        mode_of_payment_doc.insert()