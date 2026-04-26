frappe.listview_settings['Payable Cheques'] = {
    // 1. Force the list view to fetch your custom field from the database
    add_fields: ["cheque_status"],

    // 2. Override the default status pill rendering
    get_indicator: function(doc) {
        
        // Handle Draft state natively
        if (doc.docstatus === 0) {
            return [__("Draft"), "red", "docstatus,=,0"];
        }

        // Handle your custom submitted states
        if (doc.cheque_status === "Cheque Issued") {
            // Format: [Text to Display, Color, Filter string when clicked]
            return [__("Cheque Issued"), "orange", "cheque_status,=,Cheque Issued"];
        }
        
        if (doc.cheque_status === "Cheque Deducted") {
            return [__("Cheque Deducted"), "green", "cheque_status,=,Cheque Deducted"];
        }
        
        // Handle Cancelled state (whether cancelled via button or natively)
        if (doc.cheque_status === "Cheque Cancelled" || doc.docstatus === 2) {
            return [__("Cheque Cancelled"), "red", "cheque_status,=,Cheque Cancelled"];
        }
    }
};