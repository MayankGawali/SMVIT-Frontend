// Global constants
const FIXED_HOURS = 14;
const EXTENDED_RATE = 100;
const MILLISECONDS_PER_HOUR = 1000 * 60 * 60;

// Helper function to calculate pay based on hours
function calculatePay(hours, baseRate) {
    let totalPay = baseRate;
    let extraHours = 0;
    let extraPay = 0;

    if (hours > FIXED_HOURS) {
        extraHours = hours - FIXED_HOURS;
        extraPay = extraHours * EXTENDED_RATE;
        totalPay += extraPay;
    }
    return { totalPay, extraHours, extraPay };
}

// Helper function to extract numerical pay from table cell text
function extractPay(text) {
    const payString = text.replace('₹', '').replace(/,/g, '');
    return parseFloat(payString) || 0;
}

// Helper function to format date for display
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric'
    });
};

// Function to update the totals (Grand Total and Employee Subtotals)
function updateTotals() {
    const tableBody = document.querySelector('#payrollTable tbody');
    const rows = tableBody.rows;
    let grandTotal = 0;
    let employeeSubtotals = {};

    for (let i = 0; i < rows.length; i++) {
        const employeeName = rows[i].cells[0].textContent.trim();
        const totalPayCell = rows[i].cells[6].textContent;
        
        const payAmount = extractPay(totalPayCell);
        
        if (payAmount > 0) {
            grandTotal += payAmount;
            
            if (employeeSubtotals[employeeName]) {
                employeeSubtotals[employeeName] += payAmount;
            } else {
                employeeSubtotals[employeeName] = payAmount;
            }
        }
    }

    // Update Grand Total Display
    document.getElementById('grandTotalAmount').textContent = `₹${grandTotal.toLocaleString('en-IN')}`;

    // Update Subtotal Table Display
    const subTotalTableBody = document.querySelector('#subTotalTable tbody');
    subTotalTableBody.innerHTML = ''; 

    for (const name in employeeSubtotals) {
        const subTotal = employeeSubtotals[name];
        const newRow = subTotalTableBody.insertRow();
        
        newRow.insertCell().textContent = name;
        newRow.insertCell().textContent = `₹${subTotal.toLocaleString('en-IN')}`;
    }
}

// Function to remove a row
function removeRow(button) {
    const row = button.closest('tr');
    row.remove();
    updateTotals();
}

// FEATURE: Comprehensive Edit functionality
function editRow(button) {
    const row = button.closest('tr');
    const periodTimeCell = row.cells[1];
    const hoursCell = row.cells[2];
    const basePayCell = row.cells[3];
    const extraHoursCell = row.cells[4];
    const extraPayCell = row.cells[5];
    const totalPayCell = row.cells[6];

    // 1. Enter Edit Mode
    if (button.textContent === 'Edit') {
        const currentHours = parseFloat(hoursCell.textContent);
        const currentTotalPay = extractPay(totalPayCell.textContent);
        
        // Retrieve original date/time values from data attributes
        const startDate = row.dataset.startdate || '';
        const endDate = row.dataset.enddate || '';
        const loginTime = row.dataset.logintime || '';
        const logoutTime = row.dataset.logouttime || '';
        const basePay = extractPay(basePayCell.textContent);

        // --- Period & Time Inputs ---
        const periodContainer = document.createElement('div');
        periodContainer.classList.add('editable-input-container');

        const startDateInput = document.createElement('input');
        startDateInput.type = 'date';
        startDateInput.value = startDate;
        startDateInput.classList.add('editable-input');
        
        const loginTimeInput = document.createElement('input');
        loginTimeInput.type = 'time';
        loginTimeInput.value = loginTime;
        loginTimeInput.classList.add('editable-input');

        const endDateInput = document.createElement('input');
        endDateInput.type = 'date';
        endDateInput.value = endDate;
        endDateInput.classList.add('editable-input');
        
        const logoutTimeInput = document.createElement('input');
        logoutTimeInput.type = 'time';
        logoutTimeInput.value = logoutTime;
        logoutTimeInput.classList.add('editable-input');
        
        periodContainer.append(startDateInput, loginTimeInput, endDateInput, logoutTimeInput);
        periodTimeCell.innerHTML = '';
        periodTimeCell.appendChild(periodContainer);


        // --- Total Hours Input (Editable but will be recalculated upon save) ---
        const hoursInput = document.createElement('input');
        hoursInput.type = 'number';
        hoursInput.step = '0.5';
        hoursInput.value = currentHours.toFixed(1);
        hoursInput.classList.add('editable-input');
        hoursInput.dataset.basepay = basePay; // Keep base pay link here

        hoursCell.innerHTML = '';
        hoursCell.appendChild(hoursInput);
        
        
        // --- Total Pay Input (Customizable) ---
        const payInput = document.createElement('input');
        payInput.type = 'number';
        payInput.value = currentTotalPay;
        payInput.classList.add('editable-input');
        
        totalPayCell.innerHTML = '₹';
        totalPayCell.appendChild(payInput);


        // Change button text to Save
        button.textContent = 'Save';
        
    } 
    // 2. Exit Edit Mode and Save
    else {
        // Retrieve input elements
        const periodContainer = periodTimeCell.querySelector('.editable-input-container');
        if (!periodContainer) return;
        
        const inputs = periodContainer.querySelectorAll('input');
        const [startDateInput, loginTimeInput, endDateInput, logoutTimeInput] = Array.from(inputs);
        
        const hoursInput = hoursCell.querySelector('input');
        const payInput = totalPayCell.querySelector('input');
        if (!hoursInput || !payInput) return;

        // Read new values
        const newStartDate = startDateInput.value;
        const newLoginTime = loginTimeInput.value;
        const newEndDate = endDateInput.value;
        const newLogoutTime = logoutTimeInput.value;
        const newTotalPay = parseFloat(payInput.value);
        const basePay = parseFloat(hoursInput.dataset.basepay);
        
        // Recalculate Total Hours from New Dates/Times
        const loginDateTime = new Date(`${newStartDate}T${newLoginTime}:00`);
        const logoutDateTime = new Date(`${newEndDate}T${newLogoutTime}:00`);
        const durationMs = logoutDateTime - loginDateTime;

        if (!newStartDate || !newEndDate || !newLoginTime || !newLogoutTime || durationMs < 0) {
             alert("Error: Please provide valid dates and ensure Logout is after Login.");
             return;
        }

        let totalHoursFloat = durationMs / MILLISECONDS_PER_HOUR;
        const newHours = Math.round(totalHoursFloat * 2) / 2; // New calculated hours

        if (isNaN(newHours) || newHours < 0 || isNaN(newTotalPay) || newTotalPay < 0) {
            alert("Invalid numeric value entered.");
            return;
        }


        // --- Final Pay Determination ---
        const recalculated = calculatePay(newHours, basePay);
        
        let finalTotalPay;
        let finalExtraHours;
        let finalExtraPay;

        if (newTotalPay !== recalculated.totalPay) {
            // User customized Total Pay (prioritize user input)
            finalTotalPay = newTotalPay;
            // Calculate extra pay based on the difference from base, for display purposes
            finalExtraPay = finalTotalPay - basePay;
            if (finalExtraPay < 0) finalExtraPay = 0;
            finalExtraHours = finalExtraPay / EXTENDED_RATE;
        } else {
            // Use system calculated pay
            finalTotalPay = recalculated.totalPay;
            finalExtraHours = recalculated.extraHours;
            finalExtraPay = recalculated.extraPay;
        }

        // --- Update Row Cells ---
        const periodDisplay = `${formatDate(newStartDate)} (${newLoginTime}) to ${formatDate(newEndDate)} (${newLogoutTime})`;
        periodTimeCell.textContent = periodDisplay;
        
        hoursCell.textContent = newHours.toFixed(1);
        extraHoursCell.textContent = finalExtraHours.toFixed(1);
        extraPayCell.textContent = `₹${finalExtraPay.toLocaleString('en-IN')}`;
        totalPayCell.textContent = `₹${finalTotalPay.toLocaleString('en-IN')}`;

        // Update data attributes on the row for future edits
        row.dataset.startdate = newStartDate;
        row.dataset.enddate = newEndDate;
        row.dataset.logintime = newLoginTime;
        row.dataset.logouttime = newLogoutTime;

        // Change button text back to Edit
        button.textContent = 'Edit';

        // Update all totals
        updateTotals();
    }
}


document.addEventListener('DOMContentLoaded', function() {
    updateTotals(); 
    
    // Form Submission Logic
    document.getElementById('payrollForm').addEventListener('submit', function(event) {
        event.preventDefault();

        const PAY_RATES = {
            'male-1500': 1500, 'female-1800': 1800,
            'male-1000': 1000, 'female-1000': 1000
        };

        const name = document.getElementById('employeeName').value.trim();
        const startDateValue = document.getElementById('startDate').value;
        const endDateValue = document.getElementById('endDate').value;
        const loginTimeValue = document.getElementById('loginTime').value;
        const logoutTimeValue = document.getElementById('logoutTime').value;
        const payRateKey = document.getElementById('payRate').value;

        // Validation
        if (!name || !payRateKey || !startDateValue || !endDateValue || !loginTimeValue || !logoutTimeValue) {
            document.getElementById('lastCalculatedAmount').textContent = "Input Error: Fill all fields.";
            return;
        }
        
        const loginDateTime = new Date(`${startDateValue}T${loginTimeValue}:00`);
        const logoutDateTime = new Date(`${endDateValue}T${logoutTimeValue}:00`);
        const durationMs = logoutDateTime - loginDateTime;

        if (durationMs < 0) {
            document.getElementById('lastCalculatedAmount').textContent = "Time Error: Check Dates/Times.";
            return;
        }

        // Calculate and Round Hours
        let totalHoursFloat = durationMs / MILLISECONDS_PER_HOUR;
        const totalHours = Math.round(totalHoursFloat * 2) / 2;

        // Calculate Pay
        const basePayRate = PAY_RATES[payRateKey];
        const { totalPay, extraHours, extraPay } = calculatePay(totalHours, basePayRate);
        
        // Format Dates
        const periodDisplay = `${formatDate(startDateValue)} (${loginTimeValue}) to ${formatDate(endDateValue)} (${logoutTimeValue})`;
        
        // Insert Row
        const tableBody = document.querySelector('#payrollTable tbody');
        const newRow = tableBody.insertRow(0);

        // Store original date/time values in data attributes for editing
        newRow.dataset.startdate = startDateValue;
        newRow.dataset.enddate = endDateValue;
        newRow.dataset.logintime = loginTimeValue;
        newRow.dataset.logouttime = logoutTimeValue;

        newRow.insertCell().textContent = name;
        newRow.insertCell().textContent = periodDisplay;
        newRow.insertCell().textContent = totalHours.toFixed(1);
        newRow.insertCell().textContent = `₹${basePayRate.toLocaleString('en-IN')}`;
        newRow.insertCell().textContent = extraHours.toFixed(1);
        newRow.insertCell().textContent = `₹${extraPay.toLocaleString('en-IN')}`;
        
        const totalPayCell = newRow.insertCell();
        totalPayCell.textContent = `₹${totalPay.toLocaleString('en-IN')}`; 

        // Action Buttons
        const actionCell = newRow.insertCell();
        const buttonsDiv = document.createElement('div');
        buttonsDiv.classList.add('action-buttons');
        
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-btn');
        editButton.onclick = function() { editRow(this); };
        buttonsDiv.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Remove';
        deleteButton.classList.add('delete-btn');
        deleteButton.onclick = function() { removeRow(this); };
        buttonsDiv.appendChild(deleteButton);
        
        actionCell.appendChild(buttonsDiv);

        // Update Summaries
        document.getElementById('lastCalculatedAmount').textContent = `₹${totalPay.toLocaleString('en-IN')}`;
        updateTotals();
        
        document.getElementById('payrollForm').reset();
    });
});