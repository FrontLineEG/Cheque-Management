frappe.ui.form.on('Mode of Payment', {
    
    setup: function(frm) {
        let get_account_filters = function(doc, cdt, cdn) {
            let row = frappe.get_doc(cdt, cdn);
            if (!row.company) {
                frappe.msgprint(__('Please select a Company first.'));
                return {};
            }
            return {
                filters: {
                    'is_group': 0,
                    'company': row.company,
                    'account_type': ['in', ['Bank', 'Cash']]
                }
            };
        };

        // Attach filters to the NEW child table grid
        frm.set_query('custom_receivable_notes_account', 'custom_cheque_accounts', get_account_filters);
        frm.set_query('custom_payable_notes_account', 'custom_cheque_accounts', get_account_filters);
        frm.set_query('custom_cheques_under_collection_account', 'custom_cheque_accounts', get_account_filters);
    },
    // NEW: Validation before saving
    validate: function(frm) {
        // Skip validation if not a custom cheque type
        if (!frm.doc.custom_cheque_type || !frm.doc.custom_cheque_accounts) {
            return;
        }

        // Call Function 1: Check for duplicate companies
        let is_company_valid = frm.events.validate_duplicate_companies(frm);
        if (!is_company_valid) return; // Stop if it failed

        // Call Function 2: Check if accounts match
        let is_account_valid = frm.events.validate_cheque_accounts_match(frm);
        if (!is_account_valid) return; // Stop if it failed
    },

    // 2. Custom Function: Validate Duplicate Companies
    validate_duplicate_companies: function(frm) {
        let seen_companies = new Set();
        
        for (let i = 0; i < frm.doc.custom_cheque_accounts.length; i++) {
            let row = frm.doc.custom_cheque_accounts[i];
            
            if (!row.company) continue;

            if (seen_companies.has(row.company)) {
                frappe.msgprint({
                    title: __('Duplicate Company'),
                    indicator: 'red',
                    message: __('You cannot add multiple rows for the same Company (<b>{0}</b>) in the Cheque Accounts table.', [row.company])
                });
                frappe.validated = false;
                return false; // Tells the main validate function to stop
            }
            seen_companies.add(row.company);
        }
        return true; // Passed successfully
    },

    // 3. Custom Function: Validate Account Matching
    validate_cheque_accounts_match: function(frm) {
        let is_rec = frm.doc.custom_cheque_type === "Receivable Cheque";
        let is_pay = frm.doc.custom_cheque_type === "Payable Cheque";

        // Create a quick lookup map from the standard 'accounts' table: { "Company A": "Account X" }
        let standard_accounts_map = {};
        if (frm.doc.accounts) {
            frm.doc.accounts.forEach(acc => {
                if (acc.company && acc.default_account) {
                    standard_accounts_map[acc.company] = acc.default_account;
                }
            });
        }

        // Loop through custom accounts and validate against the map
        for (let i = 0; i < frm.doc.custom_cheque_accounts.length; i++) {
            let row = frm.doc.custom_cheque_accounts[i];
            
            if (!row.company) continue;

            let std_default_account = standard_accounts_map[row.company];

            // Ensure the company actually exists in the top standard accounts table
            if (!std_default_account) {
                frappe.msgprint({
                    title: __('Validation Error'),
                    indicator: 'red',
                    message: __('Company <b>{0}</b> is missing a Default Account in the standard Accounts table.', [row.company])
                });
                frappe.validated = false;
                return false;
            }

            // Validate Payable Match
            if (is_pay && row.custom_payable_notes_account !== std_default_account) {
                frappe.msgprint({
                    title: __('Account Mismatch'),
                    indicator: 'red',
                    message: __('For Company <b>{0}</b>, the Payable Notes Account must exactly match the standard Default Account (<b>{1}</b>).', [row.company, std_default_account])
                });
                frappe.validated = false;
                return false;
            }

            // Validate Receivable Match
            if (is_rec && row.custom_receivable_notes_account !== std_default_account) {
                frappe.msgprint({
                    title: __('Account Mismatch'),
                    indicator: 'red',
                    message: __('For Company <b>{0}</b>, the Receivable Notes Account must exactly match the standard Default Account (<b>{1}</b>).', [row.company, std_default_account])
                });
                frappe.validated = false;
                return false;
            }
        }
        return true; // Passed successfully
    },
    refresh: function(frm) {
        frm.trigger('toggle_cheque_fields');
    },

    custom_cheque_type: function(frm) {
        // Clear fields in the NEW child table
        if (frm.doc.custom_cheque_accounts && frm.doc.custom_cheque_accounts.length > 0) {
            frm.doc.custom_cheque_accounts.forEach(row => {
                frappe.model.set_value(row.doctype, row.name, 'custom_receivable_notes_account', null);
                frappe.model.set_value(row.doctype, row.name, 'custom_payable_notes_account', null);
                frappe.model.set_value(row.doctype, row.name, 'custom_cheques_under_collection_account', null);
                // only clear company if cheque type is being cleared, otherwise keep the selected company for user convenience
                if (!frm.doc.custom_cheque_type) {
                    frappe.model.set_value(row.doctype, row.name, 'company', null);
                }
            });
        }

        frm.trigger('toggle_cheque_fields');
    },

    toggle_cheque_fields: function(frm) {
        let is_rec = frm.doc.custom_cheque_type === "Receivable Cheque";
        let is_pay = frm.doc.custom_cheque_type === "Payable Cheque";

        // Target the NEW child table grid
        let grid = frm.fields_dict.custom_cheque_accounts.grid;

        // Determine if any cheque type is selected
        let has_cheque_type = frm.doc.custom_cheque_type ? true : false;
        // Company is only mandatory if a Cheque Type is selected
        grid.toggle_reqd('company', has_cheque_type);

        // Toggle Receivable Fields
        grid.toggle_display('custom_receivable_notes_account', is_rec);
        grid.toggle_reqd('custom_receivable_notes_account', is_rec);
        
        grid.toggle_display('custom_cheques_under_collection_account', is_rec);
        grid.toggle_reqd('custom_cheques_under_collection_account', is_rec);

        // Toggle Payable Fields
        grid.toggle_display('custom_payable_notes_account', is_pay);
        grid.toggle_reqd('custom_payable_notes_account', is_pay);
    }
});