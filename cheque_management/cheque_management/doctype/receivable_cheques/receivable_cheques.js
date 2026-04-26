// Copyright (c) 2017, Direction and contributors
// For license information, please see license.txt

frappe.ui.form.on('Receivable Cheques', {
	setup: function(frm) {
        // Filter the Bank Account field
        frm.set_query("bank_account", function() {
            // First, check if a deposit bank is selected
            if (!frm.doc.deposit_bank) {
                frappe.msgprint(__('Please select a Deposit Bank first.'));
                return {};
            }
            
            // Return filters strictly matching the chosen bank, company, and company account flag
            return {
                filters: {
                    "bank": frm.doc.deposit_bank,
                    "company": frm.doc.company,
                    "is_company_account": 1
                }
            };
        });
    },
	deposit_bank: function(frm) {
        // Clear the Bank Account if the Deposit Bank changes to prevent invalid selections
        frm.set_value('bank_account', null);
		frm.toggle_reqd('bank_account', frm.doc.deposit_bank ? true : false);
    },
	onload: function(frm) {
		// formatter for Receivable Cheques Status
		//frm.page.actions_btn_group.show();
		// frm.set_indicator_formatter('status',
		// 	function(doc) { 
		// 		if(doc.status=="Cheque Received") {	return "lightblue"}
		// 		if(doc.status=="Cheque Deposited") {	return "blue"}
		// 		if(doc.status=="Cheque Collected") {	return "green"}
		// 		if(doc.status=="Cheque Returned") {	return "orange"}
		// 		if(doc.status=="Cheque Rejected") {	return "red"}
		// 		if(doc.status=="Cheque Cancelled") {	return "black"}
		// })
	},
	refresh: function(frm) {
		frm.toggle_reqd('bank_account', frm.doc.deposit_bank ? true : false);
		//frm.page.actions_btn_group.show();
		if (frm.doc.cheque_status=="Cheque Received" || frm.doc.cheque_status=="Cheque Returned") {
			frm.set_df_property("deposit_bank", 'read_only', 0);
			frm.set_df_property("deposit_bank", 'reqd', 1);
		}
		else {
			frm.set_df_property("deposit_bank", 'read_only', 1);
			frm.set_df_property("deposit_bank", 'reqd', 0);
		}

		        // 3. Custom Buttons Logic
        if (frm.doc.docstatus === 1) {
            let active_states = ["Cheque Received", "Cheque Deposited", "Cheque Returned"];
            
            if (active_states.includes(frm.doc.cheque_status)) {
                
                // Helper function so we don't repeat the date prompt code 3 times
                let process_action = function(action_status) {
                    frappe.prompt([
                        {'fieldname': 'posting_date', 'fieldtype': 'Date', 'label': 'Posting Date', 'reqd': 1}
                    ], function(values) {
                        frm.doc.posting_date = values.posting_date;
                        frm.doc.cheque_status = action_status;
                        frm.call('on_update').then(result => {
                            frm.reload_doc();
                            frappe.show_alert({message: __('Cheque marked as ' + action_status), indicator: 'green'});
                        });
                    }, __("Transaction Posting Date"), __("Confirm"));
                };

                // Show Deposit button only when Received or Returned
                if (frm.doc.cheque_status === "Cheque Received" || frm.doc.cheque_status === "Cheque Returned") {
                    frm.add_custom_button(__('Deposit Cheque'), function() {
                        process_action("Cheque Deposited");
                    }, __("Actions"));
                }

                // Show Collect and Return buttons only when Deposited
                if (frm.doc.cheque_status === "Cheque Deposited") {
                    frm.add_custom_button(__('Collect Cheque'), function() {
                        process_action("Cheque Collected");
                    }, __("Actions"));

                    frm.add_custom_button(__('Return Cheque'), function() {
                        process_action("Cheque Returned");
                    }, __("Actions"));
                }

                // Show Cancel / Reject buttons for ANY active state
                frm.add_custom_button(__('Cancel Cheque'), function() {
                    frappe.confirm(__('Are you sure you want to cancel this cheque?'), function() {
                        frm.doc.cheque_status = "Cheque Cancelled";
                        frm.call('on_update').then(() => { frm.reload_doc(); });
                    });
                }, __("Actions"));

				// only at "Cheque Received" ir "Cheque Returned" state, show the Reject button (since it doesn't make sense to reject a cheque that's already deposited)
				if (frm.doc.cheque_status === "Cheque Received" || frm.doc.cheque_status === "Cheque Returned") {	

					frm.add_custom_button(__('Reject Cheque'), function() {
						frappe.confirm(__('Are you sure you want to reject this cheque?'), function() {
							frm.doc.cheque_status = "Cheque Rejected";
							frm.call('on_update').then(() => { frm.reload_doc(); });
						});
					}, __("Actions"));
				}
            }
        }

	},

});

