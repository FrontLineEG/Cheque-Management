// Copyright (c) 2017, Direction and contributors
// For license information, please see license.txt

frappe.ui.form.on('Payable Cheques', {
	onload: function(frm) {
		// formatter for Payable Cheques Status
		//frm.page.actions_btn_group.show();
		// frm.set_indicator_formatter('status',
		// 	function(doc) { 
		// 		if(doc.status=="Cheque Issued") {	return "lightblue"}
		// 		if(doc.status=="Cheque Deducted") {	return "green"}
		// 		if(doc.status=="Cheque Cancelled") {	return "black"}
		// })
	},
	refresh: function(frm) {
	
		if(frm.doc.cheque_status=="Cheque Issued") {
			frm.set_df_property("bank", 'read_only', 0);
		} else {
			if(frm.doc.bank){
				frm.set_df_property("bank", 'read_only', 1); 
			} 
	}
		frm.set_df_property("bank", 'reqd', 1);
		var chq_sts = "";
		$.each(frm.doc["status_history"], function(i, row) {
			// console.log(row);
			chq_sts = row.status;
		});
		if(frm.doc.cheque_status) {
			if (chq_sts!=frm.doc.cheque_status) {  
				frm.page.actions_btn_group.hide();
				console.log("cancel trigger");
				if (frm.doc.cheque_status=="Cheque Cancelled") {
					frm.call('on_update').then(result => {
							frm.page.actions_btn_group.show();
							frm.refresh_fields();
					}); 
				}
				else {
					// if(!frm.doc.is_deducted){
					// 	// await set_value(frm.doc.name);
					// 	frappe.prompt([
					// 		{'fieldname': 'posting_date', 'fieldtype': 'Date', 'label': 'Posting Date', 'reqd': 1}  
					// 		],
					// 		function(values){
					// 			if (values) {
					// 				frm.doc.posting_date = values.posting_date;
					// 				frm.call('on_update').then(result => {
					// 						frm.page.actions_btn_group.show();
					// 						frm.refresh_fields();
					// 						console.log(result);
					// 						frm.set_value('is_deducted',1)
					// 				}); 
					// 			}
					// 		},
					// 		__("Transaction Posting Date"),
					// 		__("Confirm")
					// 	);
						

					// }

				}
			}
		}
	},
	before_workflow_action(frm) {
		if (
		  frm.doc.workflow_state == "Cheque Issued" &&
		  frm.selected_workflow_action == "Cheque Cancelled"
		) {
		  if (frm.doc.docstatus === 1) {
			  frm.set_value("cheque_status","Cheque Cancelled")
			  frm.set_value("docstatus","2")
			  frm.call('on_update').then(result => {
				frm.page.actions_btn_group.show();
				frm.refresh_fields();
		}); 
	
		  }
		}
	  },
	  after_workflow_action(frm){
		if (frm.doc.cheque_status !="Cheque Cancelled"){
			frappe.prompt([
				{'fieldname': 'posting_date', 'fieldtype': 'Date', 'label': 'Posting Date', 'reqd': 1}  
				],
				function(values){
					if (values) {
						frm.doc.posting_date = values.posting_date;
						frm.call('on_update').then(result => {
								frm.page.actions_btn_group.show();
								frm.refresh_fields();
								console.log(result);
						}); 
					}
				},
				__("Transaction Posting Date"),
				__("Confirm")
			);

		}
	
	  }
	  
});
cur_frm.fields_dict.bank.get_query = function(doc) {
	return {
		filters: [
			["Account", "account_type", "=", "Bank"],
			// ["Account", "root_type", "=", "Asset"],
			["Account", "is_group", "=",0],
			["Account", "company", "=", doc.company]
		]
	}
}
