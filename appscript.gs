const SHEET_NAME = 'Sheet1';
const API_ENDPOINT = 'URL';

function onOpen() {
  console.log("Before UI")
  SpreadsheetApp.getUi()
    .createMenu('Database Sync')
    .addItem('Start Real-time Sync', 'startRealTimeSync')
    .addItem('Stop Real-time Sync', 'stopRealTimeSync')
    .addItem('Full Sync', 'fullSync')
    .addToUi();

    console.log("After UI")
}

function startRealTimeSync() {
  ScriptApp.newTrigger('pollForChanges')
    .timeBased()
    .everyMinutes(1)
    .create();
  
  SpreadsheetApp.getActive().toast('Real-time sync started. Polling every minute.');
}

function stopRealTimeSync() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let trigger of triggers) {
    if (trigger.getHandlerFunction() === 'pollForChanges') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  SpreadsheetApp.getActive().toast('Real-time sync stopped.');
}

function pollForChanges() {
  const url = `${API_ENDPOINT}/api/changes`;
  try {
    const response = UrlFetchApp.fetch(url);
    const changes = JSON.parse(response.getContentText());
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    changes.forEach(change => {
      if (change.action === 'insert') {
        insertSheetRow(sheet, change.data);
      } else if (change.action === 'update') {
        updateSheetRow(sheet, change.data);
      } else if (change.action === 'delete') {
        deleteSheetRow(sheet, change.data.ID);
      }
    });
    
  } catch (error) {
    console.error('Error polling for changes:', error);
  }
}

function updateSheetRow(sheet, data) {
  const rowIndex = findRowById(sheet, data.ID);
  if (rowIndex) {
    sheet.getRange(rowIndex, 2).setValue(data.Name);
    sheet.getRange(rowIndex, 3).setValue(data.Role);
  }
}

function deleteSheetRow(sheet, id) {
  const rowIndex = findRowById(sheet, id);
  if (rowIndex) {
    sheet.deleteRow(rowIndex);
  }
}

function insertSheetRow(sheet, data) {
  sheet.appendRow([data.ID, data.Name, data.Role]);
}

function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      return i + 1;
    }
  }
  return null;
}

function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();

  if (row === 1) return; // Skip header row

  const id = sheet.getRange(row, 1).getValue();
  const name = sheet.getRange(row, 2).getValue();
  const role = sheet.getRange(row, 3).getValue();

  if (col === 2 || col === 3) {
    sendHttpRequest({
      action: 'update',
      data: { ID: id, Name: name, Role: role }
    });
  }
}

function onInsert(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  const row = e.range.getRow();
  if (row === 1) return; // Skip header row

  const name = sheet.getRange(row, 2).getValue();
  const role = sheet.getRange(row, 3).getValue();

  sendHttpRequest({
    action: 'insert',
    data: { Name: name, Role: role }
  });
}

function onDelete(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  const row = e.range.getRow();
  if (row === 1) return; // Skip header row

  const id = e.range.getValue()[0][0]; // Assuming ID is in the first column

  sendHttpRequest({
    action: 'delete',
    data: { ID: id }
  });
}

function sendHttpRequest(data) {
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(data)
  };
  
  try {
    const response = UrlFetchApp.fetch(`${API_ENDPOINT}/api`, options);
    console.log('HTTP response: ' + response.getContentText());
  } catch (error) {
    console.error('Error sending HTTP request: ' + error.toString());
  }
}


function fullSync() {
  const url = `${API_ENDPOINT}/api/sync`;
  try {
    const response = UrlFetchApp.fetch(url);
    
    const jsonData = JSON.parse(response.getContentText());

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);


    sheet.clear();
    if (Array.isArray(jsonData) && jsonData.length > 0) {
      sheet.appendRow(['ID', 'Name', 'Role']); // Add header row

      jsonData.forEach(item => {
        sheet.appendRow([item.ID, item.Name, item.Role]);
      });
    }
    
    console.log('Full sync completed successfully');
  } catch (error) {
    console.error('Error during full sync: ' + error.toString());
  }
}

function createHourlySync() {
  ScriptApp.newTrigger('fullSync')
    .timeBased()
    .everyHours(1)
    .create();
}

function setupTriggers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('onInsert')
    .forSpreadsheet(sheet)
    .onEdit()
    .create();
  ScriptApp.newTrigger('onDelete')
    .forSpreadsheet(sheet)
    .onEdit()
    .create();
}
