/**
 * Globe RSC Network Delta Engine - Backend API
 * Google Apps Script backend with Google Sheets integration
 */

// --- CONFIGURATION ---
const CONFIG = {
  SPREADSHEET_ID: '1_Xx16PoEfU2fzrzlyhAQZERdTzGKaDFE96AIJx0eIBg', // ← Replace this with your Sheet ID
  DATA_SHEET_NAME: 'UploadedData',
  USERS_SHEET_NAME: 'Users',
  LAST_MODIFIED_SHEET_NAME: 'LastModified'
};

// --- OAUTH & AUTHENTICATION ---
function formatDisplayName(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function buildUserProfile() {
  const user = Session.getActiveUser();
  const email = String(user.getEmail() || '').trim();
  const loginId = String(user.getUserLoginId() || '').trim();
  const localPart = email ? email.split('@')[0] : '';
  const baseName = loginId || localPart || 'Unknown User';

  return {
    email: email,
    name: baseName,
    displayName: formatDisplayName(baseName) || email || 'Unknown User',
    isAuthenticated: Boolean(email)
  };
}

function getUserInfo() {
  try {
    return {
      success: true,
      data: buildUserProfile()
    };
  } catch (error) {
    return {
      success: false,
      error: 'Authentication failed: ' + error.message
    };
  }
}

// --- GOOGLE SHEETS DATABASE FUNCTIONS ---

/**
 * Initialize the spreadsheet with required sheets
 */
function initializeSpreadsheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    // Create data sheet if it doesn't exist
    let dataSheet = spreadsheet.getSheetByName(CONFIG.DATA_SHEET_NAME);
    if (!dataSheet) {
      dataSheet = spreadsheet.insertSheet(CONFIG.DATA_SHEET_NAME);
    }
    ensureHeaderRow(dataSheet, [
      'id', 'userEmail', 'uploadDate', 'fileName', 'dataType',
      'rawData', 'processedData', 'metadata'
    ]);

    // Create users sheet if it doesn't exist
    let usersSheet = spreadsheet.getSheetByName(CONFIG.USERS_SHEET_NAME);
    if (!usersSheet) {
      usersSheet = spreadsheet.insertSheet(CONFIG.USERS_SHEET_NAME);
    }
    ensureHeaderRow(usersSheet, ['email', 'name', 'displayName', 'lastAccess', 'uploadCount']);

    // Create last modified sheet if it doesn't exist
    let lastModifiedSheet = spreadsheet.getSheetByName(CONFIG.LAST_MODIFIED_SHEET_NAME);
    if (!lastModifiedSheet) {
      lastModifiedSheet = spreadsheet.insertSheet(CONFIG.LAST_MODIFIED_SHEET_NAME);
    }
    ensureHeaderRow(lastModifiedSheet, ['timestamp', 'userEmail', 'userName', 'userDisplayName', 'action', 'fileName', 'dataType', 'details']);

    return { success: true, message: 'Spreadsheet initialized successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Store uploaded data in Google Sheets
 */
function storeUploadedData(fileName, dataType, rawData, processedData, metadata) {
  try {
    initializeSpreadsheet();

    const userInfo = getUserInfo();
    if (!userInfo.success) {
      return userInfo;
    }

    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.DATA_SHEET_NAME);

    const id = Utilities.getUuid();
    const uploadDate = new Date().toISOString();

    // Prepare data for storage
    const rowData = [
      id,
      userInfo.data.email,
      uploadDate,
      fileName,
      dataType,
      JSON.stringify(rawData),
      JSON.stringify(processedData || {}),
      JSON.stringify(metadata || {})
    ];

    sheet.appendRow(rowData);

    // Update user stats
    updateUserStats(userInfo.data.email, userInfo.data.name, userInfo.data.displayName);

    // Update last modified info
    const processedCount = Array.isArray(processedData) ? processedData.length : 0;
    const rawCount = Array.isArray(rawData) ? rawData.length : 0;
    const recordCount = processedCount || rawCount;
    updateLastModified(
      userInfo.data.email,
      userInfo.data.name,
      userInfo.data.displayName,
      fileName,
      dataType,
      'upload',
      `Processed ${recordCount} records`
    );

    return {
      success: true,
      data: {
        id: id,
        message: 'Data stored successfully'
      }
    };
  } catch (error) {
    return { success: false, error: 'Failed to store data: ' + error.message };
  }
}

/**
 * Retrieve user's uploaded data
 */
function getUserUploadedData(limit = 50, dataType = '') {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.success) {
      return userInfo;
    }

    const userRows = getUserDataRows(userInfo.data.email, dataType);
    if (userRows.length === 0) {
      return { success: true, data: [] };
    }

    const userData = userRows
      .slice(0, limit)
      .map(row => ({
        id: row[0],
        userEmail: row[1],
        uploadDate: row[2],
        fileName: row[3],
        dataType: row[4],
        rawData: safeJsonParse(row[5], []),
        processedData: safeJsonParse(row[6], []),
        metadata: safeJsonParse(row[7], {})
      }));

    return { success: true, data: userData };
  } catch (error) {
    return { success: false, error: 'Failed to retrieve data: ' + error.message };
  }
}

function getUserUploadedDataSummary(limit = 50, dataType = '') {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.success) {
      return userInfo;
    }

    const userRows = getUserDataRows(userInfo.data.email, dataType);
    return {
      success: true,
      data: userRows.slice(0, limit).map(buildStoredDataSummary)
    };
  } catch (error) {
    return { success: false, error: 'Failed to retrieve data summary: ' + error.message };
  }
}

function getUploadedDataById(dataId) {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.success) {
      return userInfo;
    }

    const userRows = getUserDataRows(userInfo.data.email);
    const row = userRows.find(item => item[0] === dataId);
    if (!row) {
      return { success: false, error: 'Stored data not found or access denied' };
    }

    return {
      success: true,
      data: {
        id: row[0],
        userEmail: row[1],
        uploadDate: row[2],
        fileName: row[3],
        dataType: row[4],
        rawData: safeJsonParse(row[5], []),
        processedData: safeJsonParse(row[6], []),
        metadata: safeJsonParse(row[7], {})
      }
    };
  } catch (error) {
    return { success: false, error: 'Failed to retrieve stored data: ' + error.message };
  }
}

function getLatestUserUploadedData(dataType = '') {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.success) {
      return userInfo;
    }

    const userRows = getUserDataRows(userInfo.data.email, dataType);
    if (userRows.length === 0) {
      return { success: true, data: null };
    }

    return getUploadedDataById(userRows[0][0]);
  } catch (error) {
    return { success: false, error: 'Failed to retrieve latest stored data: ' + error.message };
  }
}

/**
 * Update user statistics
 */
function updateUserStats(email, name, displayName) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.USERS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0] || [];
    const emailColumn = headers.indexOf('email');
    const nameColumn = headers.indexOf('name');
    const displayNameColumn = headers.indexOf('displayName');
    const lastAccessColumn = headers.indexOf('lastAccess');
    const uploadCountColumn = headers.indexOf('uploadCount');

    let userRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailColumn] === email) {
        userRowIndex = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }

    const now = new Date().toISOString();

    if (userRowIndex === -1) {
      // New user
      sheet.appendRow([email, name, displayName, now, 1]);
    } else {
      // Existing user - update last access and increment count
      const currentCount = Number(data[userRowIndex - 1][uploadCountColumn] || 0);
      sheet.getRange(userRowIndex, nameColumn + 1).setValue(name);
      sheet.getRange(userRowIndex, displayNameColumn + 1).setValue(displayName);
      sheet.getRange(userRowIndex, lastAccessColumn + 1).setValue(now);
      sheet.getRange(userRowIndex, uploadCountColumn + 1).setValue(currentCount + 1);
    }
  } catch (error) {
    Logger.log('Failed to update user stats: ' + error.message);
  }
}

/**
 * Update last modified tracking
 */
function updateLastModified(email, name, displayName, fileName, dataType, action = 'upload', details = '') {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.LAST_MODIFIED_SHEET_NAME);

    const timestamp = new Date().toISOString();
    const rowData = [
      timestamp,
      email,
      name,
      displayName,
      action,
      fileName,
      dataType,
      details
    ];

    sheet.appendRow(rowData);
  } catch (error) {
    Logger.log('Failed to update last modified: ' + error.message);
  }
}

/**
 * Get last modified information
 */
function getLastModifiedInfo() {
  try {
    initializeSpreadsheet();

    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.LAST_MODIFIED_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: null };
    }

    // Get the most recent entry
    const headers = data[0] || [];
    const lastEntry = data[data.length - 1];
    return {
      success: true,
      data: {
        timestamp: lastEntry[headers.indexOf('timestamp')],
        userEmail: lastEntry[headers.indexOf('userEmail')],
        userName: lastEntry[headers.indexOf('userName')],
        userDisplayName: lastEntry[headers.indexOf('userDisplayName')],
        action: lastEntry[headers.indexOf('action')],
        fileName: lastEntry[headers.indexOf('fileName')],
        dataType: lastEntry[headers.indexOf('dataType')],
        details: lastEntry[headers.indexOf('details')]
      }
    };
  } catch (error) {
    return { success: false, error: 'Failed to get last modified info: ' + error.message };
  }
}

/**
 * Delete specific uploaded data
 */
function deleteUploadedData(dataId) {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.success) {
      return userInfo;
    }

    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.DATA_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === dataId && data[i][1] === userInfo.data.email) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data deleted successfully' };
      }
    }

    return { success: false, error: 'Data not found or access denied' };
  } catch (error) {
    return { success: false, error: 'Failed to delete data: ' + error.message };
  }
}

// --- WEB APP ENDPOINTS ---

/**
 * Main web app entry point
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Globe RSC Data Manager')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Handle POST requests for API calls
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch (action) {
      case 'storeData':
        return ContentService
          .createTextOutput(JSON.stringify(storeUploadedData(
            data.fileName,
            data.dataType,
            data.rawData,
            data.processedData,
            data.metadata
          )))
          .setMimeType(ContentService.MimeType.JSON);

      case 'getData':
        return ContentService
          .createTextOutput(JSON.stringify(getUserUploadedData(data.limit, data.dataType)))
          .setMimeType(ContentService.MimeType.JSON);

      case 'getDataSummary':
        return ContentService
          .createTextOutput(JSON.stringify(getUserUploadedDataSummary(data.limit, data.dataType)))
          .setMimeType(ContentService.MimeType.JSON);

      case 'getDataById':
        return ContentService
          .createTextOutput(JSON.stringify(getUploadedDataById(data.dataId)))
          .setMimeType(ContentService.MimeType.JSON);

      case 'getLatestData':
        return ContentService
          .createTextOutput(JSON.stringify(getLatestUserUploadedData(data.dataType)))
          .setMimeType(ContentService.MimeType.JSON);

      case 'deleteData':
        return ContentService
          .createTextOutput(JSON.stringify(deleteUploadedData(data.dataId)))
          .setMimeType(ContentService.MimeType.JSON);

      case 'getUserInfo':
        return ContentService
          .createTextOutput(JSON.stringify(getUserInfo()))
          .setMimeType(ContentService.MimeType.JSON);

      case 'initialize':
        return ContentService
          .createTextOutput(JSON.stringify(initializeSpreadsheet()))
          .setMimeType(ContentService.MimeType.JSON);

      case 'getLastModified':
        return ContentService
          .createTextOutput(JSON.stringify(getLastModifiedInfo()))
          .setMimeType(ContentService.MimeType.JSON);

      default:
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: 'Unknown action: ' + action
          }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'Request processing failed: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- UTILITY FUNCTIONS ---

/**
 * Test function for development
 */
function testConnection() {
  return {
    success: true,
    message: 'Google Apps Script backend is connected',
    timestamp: new Date().toISOString(),
    spreadsheetId: CONFIG.SPREADSHEET_ID
  };
}

function ensureHeaderRow(sheet, headers) {
  const currentMaxColumns = sheet.getMaxColumns();
  if (currentMaxColumns < headers.length) {
    sheet.insertColumnsAfter(currentMaxColumns, headers.length - currentMaxColumns);
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
}

function getUserDataRows(email, dataType = '') {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(CONFIG.DATA_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  return data.slice(1)
    .filter(row => row[1] === email)
    .filter(row => !dataType || row[4] === dataType)
    .sort((a, b) => new Date(b[2]) - new Date(a[2]));
}

function buildStoredDataSummary(row) {
  const metadata = safeJsonParse(row[7], {});
  const processedCount = typeof metadata.processedRecords === 'number'
    ? metadata.processedRecords
    : null;

  return {
    id: row[0],
    userEmail: row[1],
    uploadDate: row[2],
    fileName: row[3],
    dataType: row[4],
    metadata: metadata,
    processedCount: processedCount
  };
}
