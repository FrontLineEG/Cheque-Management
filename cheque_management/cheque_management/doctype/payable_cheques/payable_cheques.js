// Copyright (c) 2017, Direction and contributors
// For license information, please see license.txt

frappe.ui.form.on('Payable Cheques', {
	setup: function (frm) {
		// Filter the Bank Account field
		frm.set_query("bank_account", function () {
			// First, check if a bank is selected
			if (!frm.doc.bank) {
				frappe.msgprint(__('Please select a Bank first.'));
				return {};
			}

			// Return filters strictly matching the chosen bank, company, and company account flag
			return {
				filters: {
					"bank": frm.doc.bank,
					"company": frm.doc.company,
					"is_company_account": 1
				}
			};
		});
	},
	bank: function (frm) {
		// Clear the Bank Account if the Bank changes to prevent invalid selections
		frm.set_value('bank_account', null);

		// Make bank_account mandatory if bank is not empty
		frm.toggle_reqd('bank_account', frm.doc.bank ? true : false);
	},
	onload: function (frm) {
		// formatter for Payable Cheques Status
		//frm.page.actions_btn_group.show();
		// frm.set_indicator_formatter('status',
		// 	function(doc) { 
		// 		if(doc.status=="Cheque Issued") {	return "lightblue"}
		// 		if(doc.status=="Cheque Deducted") {	return "green"}
		// 		if(doc.status=="Cheque Cancelled") {	return "black"}
		// })
	},
	refresh: function (frm) {
		// --- NEW: Custom Status Badge ---
        // Only override the badge if the document is submitted
        // if (frm.doc.docstatus === 1 && frm.doc.cheque_status) {
        //     let color = "blue"; 
            
        //     if (frm.doc.cheque_status === "Cheque Issued") color = "orange";
        //     if (frm.doc.cheque_status === "Cheque Deducted") color = "green";
        //     if (frm.doc.cheque_status === "Cheque Cancelled") color = "red";
            
        //     // Force the UI to show our field and color instead of "Submitted"
        //     frm.page.set_indicator(frm.doc.cheque_status, color);
        // }

		// Make bank_account mandatory if bank is not empty on page load
		frm.toggle_reqd('bank_account', frm.doc.bank ? true : false);

		if (frm.doc.cheque_status == "Cheque Issued") {
			frm.set_df_property("bank", 'read_only', 0);
		}
		else {
			if (frm.doc.bank) {
				frm.set_df_property("bank", 'read_only', 1);
			}
		}
		frm.set_df_property("bank", 'reqd', 1);
		// --- NEW BUTTON LOGIC ---
		// Only show buttons if document is submitted and currently "Issued"
		if (frm.doc.docstatus === 1 ) {

			if (frm.doc.cheque_status != "Cheque Deducted") {
				// 1. Deduct Button
				frm.add_custom_button(__('Cheque Deduct '), function () {
					frappe.prompt([
						{ 'fieldname': 'posting_date', 'fieldtype': 'Date', 'label': 'Posting Date', 'reqd': 1 }
					],
						function (values) {
							// Set the variables silently in the background
							frm.doc.posting_date = values.posting_date;
							frm.doc.cheque_status = "Cheque Deducted";
	
							// Trigger Python
							frm.call('on_update').then(result => {
								frm.reload_doc(); // Reload page to show new history table row
								frappe.show_alert({ message: __('Cheque Deducted Successfully'), indicator: 'green' });
							});
						},
						__("Transaction Posting Date"),
						__("Confirm")
					);
				}, __("Actions")); // Puts button in an "Actions" dropdown menu

			}

			if (frm.doc.cheque_status != "Cheque Cancelled") {
				
				// 2. Cancel Button
				frm.add_custom_button(__('Cheque Cancel '), function () {
					frappe.confirm(__('Are you sure you want to cancel this cheque?'), function () {
		
						frm.doc.cheque_status = "Cheque Cancelled";
		
						frm.call('on_update').then(result => {
							frm.reload_doc();
							frappe.show_alert({ message: __('Cheque Cancelled Successfully'), indicator: 'red' });
						});
					});
				}, __("Actions"));
			}
		}
		
		

	},


});

