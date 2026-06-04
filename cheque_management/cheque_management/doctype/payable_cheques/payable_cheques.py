# -*- coding: utf-8 -*-
# Copyright (c) 2017, Direction and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import erpnext
import frappe
from frappe.utils import flt, cstr, nowdate, comma_and
from frappe import throw, msgprint, _
from frappe.model.document import Document
from erpnext.accounts.utils import get_account_currency
from erpnext.setup.utils import get_exchange_rate

class PayableCheques(Document):
	def autoname(self):
		name2 = frappe.db.sql("""select left(replace(replace(replace(sysdate(6), ' ',''),'-',''),':',''),14)""")[0][0]

		if name2:
			ndx = "-" + name2
		else:
			ndx = "-"

		self.name = self.cheque_no + ndx
		
	
	def validate(self):
		
		self.cheque_status = self.get_status()
		
		if self.payment_entry:
			
			pe_bank_account = frappe.db.get_value("Payment Entry", self.payment_entry, "bank_account")
			if pe_bank_account:
				self.bank_account = pe_bank_account
				bank_name = frappe.db.get_value("Bank Account", pe_bank_account, "bank")
				if bank_name:
					self.bank = bank_name

	@frappe.whitelist()
	def on_update(self):
		# 1. Get Mode of Payment from the linked Payment Entry
		mop = frappe.db.get_value("Payment Entry", self.payment_entry, "mode_of_payment")
		
		if not mop:
			frappe.throw(_("No Mode of Payment found in the linked Payment Entry ({0})").format(self.payment_entry))

		# 2. Query our custom child table
		mop_account = frappe.db.get_value(
			"Cheque Account", 
			{"parent": mop, "company": self.company}, 
			["custom_payable_notes_account"], 
			as_dict=True
		)

		if not mop_account:
			frappe.throw(_("Mode of Payment {0} is not configured for Company {1} in the Cheque Accounts table.").format(mop, self.company))

		# 3. Validate Payable Notes Account
		notes_acc = mop_account.get("custom_payable_notes_account")
		if not notes_acc:
			frappe.throw(_("Payable Notes Account not defined or invalid for company {0} in the Mode of Payment ({1})").format(self.company, mop))

		# 4. Fetch the GL account tied to the selected Bank Account
		actual_bank_gl_account = None
		if self.bank_account:
			actual_bank_gl_account = frappe.db.get_value("Bank Account", self.bank_account, "account")

		# Execute Journal Entries based on status
		if self.cheque_status == "Cheque Deducted":
			if not actual_bank_gl_account:
				frappe.throw(_("The selected Bank Account ({0}) does not have a designated GL Account.").format(self.bank_account))
				
			# Use actual_bank_gl_account instead of self.bank
			self.make_journal_entry(notes_acc, actual_bank_gl_account, self.amount, self.posting_date, party_type=None, party=None, cost_center=None, 
					save=True, submit=True)
			# ADD THIS: Force the database to save the new status
			self.db_set("cheque_status", "Cheque Deducted")
					
		if self.cheque_status == "Cheque Cancelled":
			# ADD THIS: Force the database to save the new status
			self.db_set("cheque_status", "Cheque Cancelled")
			self.cancel_payment_entry(actual_bank_gl_account)
			self.cancel()
			self.cancel_je()
			
	
	def on_submit(self):
		self.set_status()
	
	def cancel_je(self):
		if self.payment_entry:
			je_data = ''
			# frappe.get_doc('Payment Entry',self.payment_entry).cancel()
			for entry in self.status_history:
				if entry.journal_entry:
					je_data = entry.journal_entry
					frappe.get_doc('Journal Entry',entry.journal_entry).cancel()
					# frappe.db.set_value('Payable Cheques Status',entry.name,'status','Cheque Cancelled')

				if entry.status == 'Cheque Cancelled':
					frappe.db.set_value('Payable Cheques Status',entry.name,'journal_entry',je_data)
				
				frappe.db.set_value('Payable Cheques',self.name,'cheque_status','Cheque Cancelled')
				
				






	def set_status(self, cheque_status=None):
		'''Get and update cheque_status'''
		if not cheque_status:
			cheque_status = self.get_status()
		self.db_set("cheque_status", cheque_status)

	def get_status(self):
		'''Returns cheque_status based on whether it is draft, submitted, scrapped or depreciated'''
		cheque_status = self.cheque_status
		if self.docstatus == 0:
			cheque_status = "Draft"
		if self.docstatus == 1 and self.cheque_status == "Draft":
			cheque_status = "Cheque Issued"
		if self.docstatus == 2:
			cheque_status = "Cancelled"

		return cheque_status

	def cancel_payment_entry(self, bank_gl_account):
		message = ''
		if self.payment_entry: 
			frappe.get_doc("Payment Entry", self.payment_entry).cancel()

		self.append("status_history", {
								"status": self.cheque_status,
								"transaction_date": nowdate(),
								"bank": bank_gl_account
							})
		self.submit()
		message += """<a href="#Form/Payment Entry/%s" target="_blank">%s</a>""" % (self.payment_entry, self.payment_entry) 
		msgprint(_("Payment Entry {0} Cancelled").format(comma_and(message)))

			


	def make_journal_entry(self, account1, account2, amount, posting_date=None, party_type=None, party=None, cost_center=None, 
								save=True, submit=False):
			jv = frappe.new_doc("Journal Entry")
			jv.voucher_type = "Bank Entry"
			jv.posting_date = posting_date or nowdate()
			jv.company = self.company
			jv.cheque_no = self.cheque_no
			jv.cheque_date = self.cheque_date
			jv.user_remark = self.remarks or "Cheque Transaction"   

			# --- Multi-Currency Logic Initialization ---
			company_currency = frappe.get_cached_value('Company', self.company, 'default_currency')
			cheque_currency = self.currency
			exchange_rate = flt(self.exchange_rate) if flt(self.exchange_rate) > 0 else 1.0

			base_amount = flt(self.amount_in_company_currency)
			if not base_amount:
				base_amount = flt(amount) * exchange_rate

			def get_account_values(account):
				acc_currency = frappe.db.get_value("Account", account, "account_currency") or company_currency
				
				if acc_currency == cheque_currency:
					return acc_currency, amount, exchange_rate
				elif acc_currency == company_currency:
					return acc_currency, base_amount, 1.0
				else:
					frappe.throw(_("Cannot use Account {0}. The Account Currency must match either the Company Currency or the Cheque Currency.").format(account))
			
			curr1, val1, exc1 = get_account_values(account1)
			curr2, val2, exc2 = get_account_values(account2)

			jv.multi_currency = 1 if (curr1 != company_currency or curr2 != company_currency) else 0

			# --- Set Journal Entry Accounts ---
			jv.set("accounts", [
				{
					"account": account1,
					"party_type": party_type if (self.cheque_status == "Cheque Cancelled") else None,
					"party": party if self.cheque_status == "Cheque Cancelled" else None,
					"cost_center": cost_center,
					"project": self.project,
					
					"account_currency": curr1,
					"exchange_rate": exc1,
					"debit_in_account_currency": val1 if amount > 0 else 0,
					"credit_in_account_currency": abs(val1) if amount < 0 else 0,
					"debit": base_amount if amount > 0 else 0,
					"credit": base_amount if amount < 0 else 0
				}, {
					"account": account2,
					"party_type": party_type if self.cheque_status == "Cheque Issued" else None,
					"party": party if self.cheque_status == "Cheque Issued" else None,
					"cost_center": cost_center,
					"project": self.project,
					
					"account_currency": curr2,
					"exchange_rate": exc2,
					"credit_in_account_currency": val2 if amount > 0 else 0,
					"debit_in_account_currency": abs(val2) if amount < 0 else 0,
					"credit": base_amount if amount > 0 else 0,
					"debit": base_amount if amount < 0 else 0
				}
			])
			
			if save or submit:
				jv.insert(ignore_permissions=True)

				if submit:
					jv.submit()
					
			# Fetch actual GL account for the history log
			actual_bank_gl_account = None
			if self.bank_account:
				actual_bank_gl_account = frappe.db.get_value("Bank Account", self.bank_account, "account")

			self.append("status_history", {
									"status": self.cheque_status,
									"transaction_date": nowdate(),
									"bank": actual_bank_gl_account,
									"debit_account": account1,
									"credit_account": account2,
									"journal_entry": jv.name
								})
								
			self.submit()
			message = """<a href="../journal-entry/%s" target="_blank">%s</a>""" % (jv.name, jv.name)
			msgprint(_("Journal Entry {0} created").format(comma_and(message)))

			return message
