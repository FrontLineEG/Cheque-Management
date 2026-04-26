# -*- coding: utf-8 -*-
# Copyright (c) 2017, Direction and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe, erpnext
from frappe.utils import flt, cstr, nowdate, comma_and
from frappe import throw, msgprint, _
def pe_before_submit(self, method):
# 	# if self.mode_of_payment == "Receivable Cheque" and self.payment_type == "Receive":
		
# 	# 	notes_acc = frappe.db.get_value("Company", self.company, "receivable_notes_account")
# 	# 	if not notes_acc:
# 	# 		frappe.throw(_("Receivable Notes Account not defined in the company setup page"))

# 	# 	rec_acc = frappe.db.get_value("Company", self.company, "default_receivable_account")
# 	# 	if not rec_acc:
# 	# 		frappe.throw(_("Default Receivable Account not defined in the company setup page"))

# 	# 	self.db_set("paid_to", notes_acc)
# 	# 	self.db_set("paid_from", rec_acc)

# 	# if self.mode_of_payment == "Payable Cheque" and self.payment_type == "Pay":
# 	# 	notes_acc = frappe.db.get_value("Company", self.company, "payable_notes_account")
# 	# 	if not notes_acc:
# 	# 		frappe.throw(_("Payable Notes Account not defined in the company setup page"))

# 	# 	rec_acc = frappe.db.get_value("Company", self.company, "default_payable_account")
# 	# 	if not rec_acc:
# 	# 		frappe.throw(_("Default Payable Account not defined in the company setup page"))

# 	# 	self.db_set("paid_from", notes_acc)
# 	# 	self.db_set("paid_to", rec_acc)
	pass

def pe_on_submit(self, method):
	# 1. Fetch the custom_cheque_type from the parent Mode of Payment document
	custom_cheque_type = frappe.db.get_value("Mode of Payment", self.mode_of_payment, "custom_cheque_type")

	# Proceed only if this is one of our custom cheque types
	if custom_cheque_type not in ["Receivable Cheque", "Payable Cheque"]:
		return

	# 2. Query our NEW custom child table
	mop_account = frappe.db.get_value(
		"Cheque Account", 
		{"parent": self.mode_of_payment, "company": self.company}, 
		["custom_receivable_notes_account", "custom_payable_notes_account"], 
		as_dict=True
	)

	if not mop_account:
		frappe.throw(_("Mode of Payment {0} is not configured for Company {1} in the Cheque Accounts table.").format(self.mode_of_payment, self.company))

	custom_receivable_notes_account = mop_account.get("custom_receivable_notes_account")
	custom_payable_notes_account = mop_account.get("custom_payable_notes_account")

	# # Validate currencies
	# hh_currency = erpnext.get_company_currency(self.company)
	# if self.paid_from_account_currency != hh_currency or self.paid_to_account_currency != hh_currency:
	# 	frappe.throw(_("You cannot use foreign currencies with Mode of Payment Cheque"))

	# --------------------------------------------------------
	# RECEIVABLE CHEQUE LOGIC
	# --------------------------------------------------------
	if custom_cheque_type == "Receivable Cheque" and self.payment_type == "Receive":
		# repalce this from mode of payment
		notes_acc = custom_receivable_notes_account

		if not notes_acc:
			frappe.throw(_("Receivable Notes Account not defined for company {0} in Mode of Payment").format(self.company))

		self.db_set("paid_to", notes_acc)

		# rec_acc = frappe.db.get_value("Company", self.company, "default_receivable_account")
		# if not rec_acc:
		# 	frappe.throw(_("Default Receivable Account not defined in the company setup page"))

		rc = frappe.new_doc("Receivable Cheques")
		rc.cheque_no = self.reference_no 
		rc.cheque_date = self.reference_date 
		
		rc.customer = self.party

		rc.party_type = self.party_type
		rc.party = self.party
	
		rc.company = self.company
		rc.payment_entry = self.name
		if self.project:
			rc.project = self.project

		rc.currency = self.paid_to_account_currency
		rc.amount = self.received_amount
		rc.amount_in_company_currency= self.base_received_amount
		rc.exchange_rate = self.target_exchange_rate
		
		rc.remarks = self.remarks
		rc.docstatus=1
		rc.cheque_status = 'Cheque Received'
		rc.set("status_history", [
			{
				"status": "Cheque Received",
				"transaction_date": nowdate(),
				"credit_account": self.paid_from, # this will be from account padid from in payment entry
				"debit_account": notes_acc, # this will be to account paid to in payment entry
			}
		])
		rc.insert(ignore_permissions=True)
		rc.submit()
		message = """<a href="../receivable-cheques/%s" target="_blank">%s</a>""" % (rc.name, rc.name)
		msgprint(_("Receivable Cheque {0} created").format(comma_and(message)))

	# --------------------------------------------------------
	# PAYABLE CHEQUE LOGIC
	# --------------------------------------------------------
	if custom_cheque_type == "Payable Cheque" and self.payment_type == "Pay":
		notes_acc = custom_payable_notes_account
		if not notes_acc:
			frappe.throw(_("Payable Notes Account not defined for company {0} in Mode of Payment").format(self.company))

		self.db_set("paid_from", notes_acc)

		# rec_acc = frappe.db.get_value("Company", self.company, "default_payable_account")
		# if not rec_acc:
		# 	frappe.throw(_("Default Payable Account not defined in the company setup page"))

		pc = frappe.new_doc("Payable Cheques")
		pc.cheque_status = "Cheque Issued"
		pc.cheque_no = self.reference_no 
		pc.cheque_date = self.reference_date 
		pc.party_type = self.party_type
		pc.party = self.party
		pc.company = self.company
		pc.payment_entry = self.name
		if self.project:
			pc.project = self.project

		pc.currency = self.paid_from_account_currency
		pc.amount = self.paid_amount
		pc.amount_in_company_currency = self.base_paid_amount
		pc.exchange_rate = self.source_exchange_rate

		pc.remarks = self.remarks
		#pc.cheque_status = 'Cheque Received'
		pc.docstatus=1
		new_row = pc.append("status_history",{})
		new_row.status = "Cheque Issued"
		new_row.transaction_date = nowdate()
		new_row.credit_account = notes_acc
		new_row.debit_account = self.paid_to # payment entry > paid_to
		pc.insert(ignore_permissions=True)
		frappe.db.commit()
		pc.submit()
		message = """<a href="../payable-cheques/%s" target="_blank">%s</a>""" % (pc.name, pc.name)
		msgprint(_("Payable Cheque {0} created").format(comma_and(message)))

def pe_on_cancel(self, method):
	if frappe.db.sql("""select name from `tabReceivable Cheques` where payment_entry=%s and docstatus<>2  
				and not cheque_status in ("Cheque Cancelled","Cheque Rejected")""" , (self.name)):
		frappe.throw(_("Cannot Cancel this Payment Entry as it is Linked with Receivable Cheque"))
	if frappe.db.sql("""select name from `tabPayable Cheques` where payment_entry=%s and docstatus<>2  
				and cheque_status<>'Cheque Cancelled'""" , (self.name)):
		frappe.throw(_("Cannot Cancel this Payment Entry as it is Linked with Payable Cheque"))
	return
