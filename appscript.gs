const SHEET_NAME = 'Sheet1';
const LOG_SHEET_NAME = 'Log';
const API_ENDPOINT = 'https://all-foxes-stop.loca.lt'; // Update with your API endpoint

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
    
    processChanges(changes, sheet);
    
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
      return i + 1; // Return the 1-based row index
    }
  }
  return null; // Return null if not found
}

function processChanges(changes, sheet) {
  changes.forEach(change => {
    const response = sendHttpRequest({
      action: change.action,
      data: change.data,
      changeId: change.changeId
    });

    if (response.alreadyProcessed) {
      // If the change was already processed, we don't need to apply it to the sheet
      return;
    }

    if (response.synced) {
      if (change.action === 'insert') {
        insertSheetRow(sheet, change.data);
      } else if (change.action === 'update') {
        updateSheetRow(sheet, change.data);
      } else if (change.action === 'delete') {
        deleteSheetRow(sheet, change.data.ID);
      }
    } else {
      console.log(`Change not synced: ${JSON.stringify(change)}`);
    }
  });
}

function sendHttpRequest(payload) {
  const url = `${API_ENDPOINT}/api`;
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload)
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = JSON.parse(response.getContentText());
    
    if (responseCode === 200) {
      console.log(`Request successful: ${JSON.stringify(responseBody)}`);
      return responseBody;
    } else {
      console.error(`Request failed with code ${responseCode}: ${responseBody}`);
      return { synced: false, alreadyProcessed: false };
    }
  } catch (error) {
    console.error(`Error sending request: ${error}`);
    return { synced: false, alreadyProcessed: false };
  }
}

function onChange(e) {
  const sheet = e.source.getActiveSheet();
  const logSheet = e.source.getSheetByName(LOG_SHEET_NAME);

  // Ensure we're working with the correct sheet
  if (sheet.getName() !== SHEET_NAME || !logSheet) {
    console.log('Wrong sheet or logSheet not found');
    return;
  }

  const range = e.range;
  const row = range.getRow();
  const numColumns = range.getNumColumns();

  // Check if entire row was affected
  if (numColumns === sheet.getLastColumn()) {
    if (e.changeType === 'INSERT_ROW') {
      onInsert(e);
    } else if (e.changeType === 'REMOVE_ROW') {
      onDelete(e, row);
    }
  } else {
    // Assume it's an edit if not a full row insert/delete
    const id = sheet.getRange(row, 1).getValue();
    const name = sheet.getRange(row, 2).getValue();
    const role = sheet.getRange(row, 3).getValue();
    
    const data = { ID: id, Name: name, Role: role };
    const response = sendHttpRequest({ action: 'update', data });
    
    if (!response.synced) {
      console.log(`Failed to sync update for row ${row}`);
    }
  }
}

function onInsert(e) {
  const sheet = e.source.getActiveSheet();

  // Get the actual row number from the event object
  const row = e.range.getRow();

  console.log(`Inserting row at position: ${row}`);

  // Wait for a short time to ensure the new row data is available
  Utilities.sleep(1000);

  const id = sheet.getRange(row, 1).getValue();
  const name = sheet.getRange(row, 2).getValue();
  const role = sheet.getRange(row, 3).getValue();
  
  const data = {
    ID: id,
    Name: name,
    Role: role
  };

  console.log(`Inserted row data: ${JSON.stringify(data)}`);
  const response = sendHttpRequest({ action: 'insert', data });
  
  if (!response.synced) {
    console.log(`Failed to sync insert for row ${row}`);
  }
}

function onDelete(e, deletedRow) {
  console.log(`Deleting row at position: ${deletedRow}`);

  // Get the ID of the deleted row from the previous state
  const id = e.oldValue[0][0];  // Assuming ID is in the first column

  if (id) {
    const response = sendHttpRequest({ action: 'delete', data: { ID: id } });
    if (!response.synced) {
      console.log(`Failed to sync delete for row ${deletedRow}`);
    }
  } else {
    console.log('Unable to determine ID of deleted row');
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
