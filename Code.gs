/**
 * Google Apps Script for ESG Self-Diagnosis App
 * 
 * Instructions:
 * 1. Create a new Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code into Code.gs.
 * 4. Run the 'setupSheet' function once to initialize the header row.
 * 5. Deploy as Web App:
 *    - Click 'Deploy' > 'New deployment'.
 *    - Select type: 'Web app'.
 *    - Description: 'ESG Check Backend'.
 *    - Execute as: 'Me' (your account).
 *    - Who has access: 'Anyone'.
 *    - Click 'Deploy' and copy the 'Web App URL'.
 */

function setupSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  // Basic headers - will be dynamically extended based on submission if needed, 
  // but good to have a base.
  const headers = ['Timestamp', 'Name', 'Department', 'Total Score'];
  
  // Check if headers exist, if not append them
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Prepare the new row
    const newRow = [];
    const timestamp = new Date();
    
    // Map data to headers
    // We'll iterate through existing headers to place data in correct columns
    // If a key in data doesn't exist in headers, we'll add it to headers and the row
    
    // Always start with Timestamp
    data['Timestamp'] = timestamp;

    // First pass: Ensure all keys in data exist in headers
    const keys = Object.keys(data);
    for (const key of keys) {
      if (!headers.includes(key)) {
        headers.push(key);
        // Update headers in the sheet
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
    
    // Second pass: Build the row based on headers order
    for (const header of headers) {
      newRow.push(data[header] || '');
    }
    
    sheet.appendRow(newRow);
    
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'row': sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': e }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const action = e.parameter.action;
    
    if (action === 'getData') {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);
      
      const result = rows.map(row => {
        let obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });
      
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput("ESG Check Backend is running. Use POST to submit data or ?action=getData to retrieve.")
      .setMimeType(ContentService.MimeType.TEXT);
      
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 'error': e }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
