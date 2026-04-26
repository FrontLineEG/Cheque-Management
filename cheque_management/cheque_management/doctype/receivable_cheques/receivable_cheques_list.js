frappe.listview_settings['Receivable Cheques'] = {
    // 1. Force the list view to fetch your custom field from the database
    add_fields: ["cheque_status"],

    // 2. Override the default status pill rendering
    get_indicator: function(doc) {
        
        // Handle Draft state natively
        if (doc.docstatus === 0) {
            return [__("Draft"), "red", "docstatus,=,0"];
        }

        // Handle your custom submitted states
        if (doc.cheque_status === "Cheque Received") {
            return [__("Cheque Received"), "lightblue", "cheque_status,=,Cheque Received"];
        }
        
        if (doc.cheque_status === "Cheque Deposited") {
            return [__("Cheque Deposited"), "blue", "cheque_status,=,Cheque Deposited"];
        }
        
        if (doc.cheque_status === "Cheque Collected") {
            return [__("Cheque Collected"), "green", "cheque_status,=,Cheque Collected"];
        }
        
        if (doc.cheque_status === "Cheque Returned") {
            return [__("Cheque Returned"), "orange", "cheque_status,=,Cheque Returned"];
        }
        
        if (doc.cheque_status === "Cheque Rejected") {
            return [__("Cheque Rejected"), "red", "cheque_status,=,Cheque Rejected"];
        }

        // Handle Cancelled state (whether cancelled via button or natively)
        if (doc.cheque_status === "Cheque Cancelled" || doc.docstatus === 2) {
            return [__("Cheque Cancelled"), "red", "cheque_status,=,Cheque Cancelled"];
        }
    }
};