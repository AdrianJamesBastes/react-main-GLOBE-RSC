/**
 * Globe RSC Network Delta Engine - Backend API
 * Google Apps Script backend with Google Sheets integration
 */

// --- CONFIGURATION ---
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_ACTUAL_GOOGLE_SHEET_ID_HERE', // ← Replace this with your Sheet ID
  DATA_SHEET_NAME: 'UploadedData',
  USERS_SHEET_NAME: 'Users',
  LAST_MODIFIED_SHEET_NAME: 'LastModified'
};

// --- OAUTH & AUTHENTICATION ---
function getUserInfo() {
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    return {
      success: true,
      data: {
        email: email,
        name: user.getUserLoginId(),
        isAuthenticated: true
      }
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
      // Add headers
      dataSheet.appendRow([
        'id', 'userEmail', 'uploadDate', 'fileName', 'dataType',
        'rawData', 'processedData', 'metadata'
      ]);
    }

    // Create users sheet if it doesn't exist
    let usersSheet = spreadsheet.getSheetByName(CONFIG.USERS_SHEET_NAME);
    if (!usersSheet) {
      usersSheet = spreadsheet.insertSheet(CONFIG.USERS_SHEET_NAME);
      usersSheet.appendRow(['email', 'name', 'lastAccess', 'uploadCount']);
    }

    // Create last modified sheet if it doesn't exist
    let lastModifiedSheet = spreadsheet.getSheetByName(CONFIG.LAST_MODIFIED_SHEET_NAME);
    if (!lastModifiedSheet) {
      lastModifiedSheet = spreadsheet.insertSheet(CONFIG.LAST_MODIFIED_SHEET_NAME);
      lastModifiedSheet.appendRow(['timestamp', 'userEmail', 'userName', 'action', 'fileName', 'dataType', 'details']);
    }

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
    updateUserStats(userInfo.data.email, userInfo.data.name);

    // Update last modified info
    updateLastModified(userInfo.data.email, userInfo.data.name, fileName, dataType, 'upload', `Processed ${rawData.length} records`);

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
function getUserUploadedData(limit = 50) {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.success) {
      return userInfo;
    }

    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.DATA_SHEET_NAME);

    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [] };
    }

    // Filter by user email and sort by upload date (newest first)
    const userData = data.slice(1)
      .filter(row => row[1] === userInfo.data.email) // email column
      .sort((a, b) => new Date(b[2]) - new Date(a[2])) // upload date column
      .slice(0, limit)
      .map(row => ({
        id: row[0],
        userEmail: row[1],
        uploadDate: row[2],
        fileName: row[3],
        dataType: row[4],
        rawData: JSON.parse(row[5] || '[]'),
        processedData: JSON.parse(row[6] || '{}'),
        metadata: JSON.parse(row[7] || '{}')
      }));

    return { success: true, data: userData };
  } catch (error) {
    return { success: false, error: 'Failed to retrieve data: ' + error.message };
  }
}

/**
 * Update user statistics
 */
function updateUserStats(email, name) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.USERS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    let userRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        userRowIndex = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }

    const now = new Date().toISOString();

    if (userRowIndex === -1) {
      // New user
      sheet.appendRow([email, name, now, 1]);
    } else {
      // Existing user - update last access and increment count
      const currentCount = data[userRowIndex - 1][3] || 0;
      sheet.getRange(userRowIndex, 3).setValue(now); // last access
      sheet.getRange(userRowIndex, 4).setValue(currentCount + 1); // upload count
    }
  } catch (error) {
    Logger.log('Failed to update user stats: ' + error.message);
  }
}

/**
 * Update last modified tracking
 */
function updateLastModified(email, name, fileName, dataType, action = 'upload', details = '') {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.LAST_MODIFIED_SHEET_NAME);

    const timestamp = new Date().toISOString();
    const rowData = [
      timestamp,
      email,
      name,
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
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.LAST_MODIFIED_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: null };
    }

    // Get the most recent entry
    const lastEntry = data[data.length - 1];
    return {
      success: true,
      data: {
        timestamp: lastEntry[0],
        userEmail: lastEntry[1],
        userName: lastEntry[2],
        action: lastEntry[3],
        fileName: lastEntry[4],
        dataType: lastEntry[5],
        details: lastEntry[6]
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
          .createTextOutput(JSON.stringify(getUserUploadedData(data.limit)))
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