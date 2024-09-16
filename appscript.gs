const SHEET_NAME = 'Sheet1';
const LOG_SHEET_NAME = 'Log';
const API_ENDPOINT = 'https://wet-suits-rule.loca.lt';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Database Sync')
    .addItem('Start Real-time Sync', 'startRealTimeSync')
    .addItem('Stop Real-time Sync', 'stopRealTimeSync')
    .addItem('Full Sync', 'fullSync')
    .addToUi();
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
    Logger.log('Error polling for changes:', error);
  }
}

function updateSheetRow(sheet, data) {
  const rowIndex = findRowById(sheet, data.ID);
  if (rowIndex) {
    Logger.log(`Updating row at index ${rowIndex} with ID ${data.ID}`);
    sheet.getRange(rowIndex, 1, 1, 3).setValues([[data.ID, data.Name, data.Role]]);
  } else {
    Logger.log(`Row with ID ${data.ID} not found`);
  }
}

function deleteSheetRow(sheet, id) {
  const rowIndex = findRowById(sheet, id);
  if (rowIndex) {
    Logger.log(`Deleting row at index ${rowIndex} with ID ${id}`);
    sheet.deleteRow(rowIndex);
  } else {
    Logger.log(`Row with ID ${id} not found`);
  }
}

function insertSheetRow(sheet, data) {
  Logger.log(`Inserting row with ID ${data.ID}`);
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

function onChange(e) {
  const sheet = e.source.getSheetByName(SHEET_NAME);
  const logSheet = e.source.getSheetByName(LOG_SHEET_NAME);

  Logger.log('Change event: ' + JSON.stringify(e));

  if (!sheet || !logSheet) {
    Logger.log('Sheet or logSheet not found');
    return;
  }

  const range = e.range;
  const changeType = e.changeType || 'UNKNOWN';
  
  Logger.log('Change Type: ' + changeType);
  
  if (changeType === 'INSERT_ROW' || changeType === 'REMOVE_ROW') {
    logSheet.appendRow([new Date(), changeType, range.getRow(), '']);
  } else if (changeType === 'EDIT') {
    const row = range.getRow();
    const id = sheet.getRange(row, 1).getValue();
    const name = sheet.getRange(row, 2).getValue();
    const role = sheet.getRange(row, 3).getValue();
    
    logSheet.appendRow([new Date(), 'UPDATE', row, JSON.stringify({ ID: id, Name: name, Role: role })]);
  }
  
  processLogs();
}

function processLogs() {
  const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LOG_SHEET_NAME);
  const data = logSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const [timestamp, action, rowNum, details] = data[i];
    if (action === 'UPDATE') {
      const data = JSON.parse(details);
      sendHttpRequest({ action: 'update', data });
    } else if (action === 'INSERT_ROW') {
      // Handle new rows if needed
    } else if (action === 'REMOVE_ROW') {
      // Handle row deletions if needed
    }
    
    logSheet.deleteRow(i + 1);
    i--;
  }
}

function sendHttpRequest(data) {
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(data)
  };
  
  try {
    const response = UrlFetchApp.fetch(`${API_ENDPOINT}/api`, options);
    Logger.log('HTTP response: ' + response.getContentText());
  } catch (error) {
    Logger.log('Error sending HTTP request: ' + error.toString());
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
      sheet.appendRow(['ID', 'Name', 'Role']);
      jsonData.forEach(item => {
        sheet.appendRow([item.ID, item.Name, item.Role]);
      });
    }
    
    Logger.log('Full sync completed successfully');
  } catch (error) {
    Logger.log('Error during full sync: ' + error.toString());
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
  ScriptApp.newTrigger('onChange')
    .forSpreadsheet(sheet)
    .onChange()
    .create();
}


