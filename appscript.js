const SHEET_NAME = 'Superjoin';
const API_ENDPOINT = 'API_URL';

function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  const range = e.range;
  const row = range.getRow();
  const numColumns = sheet.getLastColumn();

  if (row === 1) return;

  const rowData = sheet.getRange(row, 1, 1, numColumns).getValues()[0];
  const headers = sheet.getRange(1, 1, 1, numColumns).getValues()[0];
  const changedData = createObject(headers, rowData);

  if (e.value) {
    updateMariaDB(changedData, row);
  } else if (e.oldValue) {
    deleteFromMariaDB(row);
  }
}

function createObject(headers, values) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    if (values[i] !== "") {
      obj[headers[i]] = values[i];
    }
  }
  return obj;
}

function updateMariaDB(data, row) {
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({ action: 'update', data: data, row: row })
  };

  try {
    const response = UrlFetchApp.fetch(API_ENDPOINT, options);
    Logger.log('Update response: ' + response.getContentText());
  } catch (error) {
    Logger.log('Error updating MariaDB: ' + error.toString());
  }
}

function deleteFromMariaDB(row) {
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({ action: 'delete', row: row })
  };

  try {
    const response = UrlFetchApp.fetch(API_ENDPOINT, options);
    Logger.log('Delete response: ' + response.getContentText());
  } catch (error) {
    Logger.log('Error deleting from MariaDB: ' + error.toString());
  }
}

function syncFromMariaDB() {
  const url = `${API_ENDPOINT}/sync`;
  const response = UrlFetchApp.fetch(url);
  const jsonData = JSON.parse(response.getContentText());

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.clear();

  if (Array.isArray(jsonData) && jsonData.length > 0) {
    const headers = Object.keys(jsonData[0]);
    sheet.appendRow(headers);

    jsonData.forEach(item => {
      const row = headers.map(header => item[header]);
      sheet.appendRow(row);
    });
  }
}

function createTimeDrivenTrigger() {
  ScriptApp.newTrigger('syncFromMariaDB')
    .timeBased()
    .everyHours(1)
    .create();
}

function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

