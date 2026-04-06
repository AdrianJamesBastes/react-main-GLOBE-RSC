/**
 * Globe RSC Network Delta Engine - Backend API
 * Google Apps Script backend with Google Sheets & Drive integration
 * Version: Optimized Blob Storage (Pointer Architecture)
 */

// --- CONFIGURATION ---
// --- CONFIGURATION ---
const CONFIG = {
  DATA_SHEET_NAME: 'UploadedData',
  USERS_SHEET_NAME: 'Users',
  LAST_MODIFIED_SHEET_NAME: 'LastModified',
  DRIVE_FOLDER_NAME: 'GLOBE RSC',
  ALLOW_DOMAIN_LINK_SHARING: false
};

// --- DRIVE STORAGE HELPERS (THE FIX) ---

function getOrCreateDataFolder() {
  const folders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
}

function saveJsonToDrive(fileName, dataObj) {
  if (!dataObj || (Array.isArray(dataObj) && dataObj.length === 0)) return "";
  
  const folder = getOrCreateDataFolder();
  const file = folder.createFile(fileName, JSON.stringify(dataObj), MimeType.PLAIN_TEXT);

  if (CONFIG.ALLOW_DOMAIN_LINK_SHARING) {
    try {
      file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      Logger.log('Domain link sharing not applied: ' + e.message);
    }
  }

  return file.getId(); // Return only the ID for the spreadsheet
}

function getJsonFromDriveOrCell(cellValue, fallback = []) {
  if (!cellValue) return fallback;
  
  // If it doesn't look like JSON (no brackets), it's a Drive File ID
  if (typeof cellValue === 'string' && !cellValue.startsWith('[') && !cellValue.startsWith('{')) {
    try {
      const file = DriveApp.getFileById(cellValue);
      return JSON.parse(file.getBlob().getDataAsString());
    } catch(e) {
      Logger.log("Failed to fetch Drive file: " + e.message);
      return fallback;
    }
  }
  // Fallback for your legacy data already saved in cells
  return safeJsonParse(cellValue, fallback);
}

function deleteFileFromDrive(fileId) {
  if (fileId && typeof fileId === 'string' && !fileId.startsWith('[') && !fileId.startsWith('{')) {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch(e) {
      Logger.log("Failed to trash file: " + e.message);
    }
  }
}

// --- OAUTH & AUTHENTICATION ---
function formatDisplayName(value) {
  if (!value) return '';
  return String(value)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function buildUserProfile() {
  const user = Session.getActiveUser();
  const email = String(user.getEmail() || '').trim();
  const userId = email || 'unknown-user';

  // 🚀 2. SMART NAME EXTRACTION
  let baseName = 'Workspace User';
  
  if (email && email.includes('@')) {
    // Splits "adrian.bastes@globe.com.ph" -> "adrian.bastes" -> "adrian bastes"
    baseName = email.split('@')[0].replace(/[._0-9]/g, ' '); 
  }

  return {
    userId: userId, // React now receives the exact email here!
    name: baseName,
    displayName: formatDisplayName(baseName) || 'Unknown User', // Capitalizes it!
    isAuthenticated: Boolean(email)
  };
}

function getUserInfo() {
  try {
    return { success: true, data: buildUserProfile() };
  } catch (error) {
    return { success: false, error: 'Authentication failed: ' + error.message };
  }
}

// --- GOOGLE SHEETS DATABASE FUNCTIONS ---

function initializeSpreadsheet() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    let dataSheet = spreadsheet.getSheetByName(CONFIG.DATA_SHEET_NAME);
    if (!dataSheet) dataSheet = spreadsheet.insertSheet(CONFIG.DATA_SHEET_NAME);
    ensureHeaderRow(dataSheet, ['id', 'userId', 'uploadDate', 'fileName', 'dataType', 'rawDataId', 'processedDataId', 'metadata']);

    let usersSheet = spreadsheet.getSheetByName(CONFIG.USERS_SHEET_NAME);
    if (!usersSheet) usersSheet = spreadsheet.insertSheet(CONFIG.USERS_SHEET_NAME);
    ensureHeaderRow(usersSheet, ['userId', 'name', 'displayName', 'lastAccess', 'uploadCount']);

    let lastModifiedSheet = spreadsheet.getSheetByName(CONFIG.LAST_MODIFIED_SHEET_NAME);
    if (!lastModifiedSheet) lastModifiedSheet = spreadsheet.insertSheet(CONFIG.LAST_MODIFIED_SHEET_NAME);
    ensureHeaderRow(lastModifiedSheet, ['timestamp', 'userId', 'userName', 'userDisplayName', 'action', 'fileName', 'dataType', 'details']);

    return { success: true, message: 'Spreadsheet initialized successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Store uploaded data using Pointer Architecture
 */
/**
 * Store uploaded data using Pointer Architecture (Google Drive)
 */
function storeUploadedData(fileName, dataType, rawData, processedData, metadata) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  
  try {
    lockAcquired = lock.tryLock(15000);
    if (!lockAcquired) {
      return { success: false, error: 'Database is currently busy serving another user. Please try saving again in a few seconds.' };
    }

    initializeSpreadsheet();

    const userInfo = getUserInfo();
    if (!userInfo.success) return userInfo;

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.DATA_SHEET_NAME);

    const id = Utilities.getUuid();
    const uploadDate = new Date().toISOString();

    // ZERO TRUST SECURITY: Ignore frontend names, force the secure Google identity
    const actualName = userInfo.data.name;
    const actualDisplayName = userInfo.data.displayName;
    
    // Optional: Overwrite the metadata so the exact secure name is saved in the history log too
    if (metadata) {
      metadata.engineerName = actualDisplayName;
    }

    // FILE NAMING SYSTEM
    // 1. Clean the engineer's name (e.g., "Adrian Bastes" becomes "Adrian_Bastes")
    const safeName = actualDisplayName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

    // 2. Get the exact time in Philippine Standard Time (PHT)
    // Format will look like: 2026-04-04_183633 (Year-Month-Day_HourMinSec)
    const timestampStr = Utilities.formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd_HHmmss");

    // 3. Construct the clean, auditable filenames
    const rawFileName = `RAW_${safeName}_${timestampStr}.json`;
    const processedFileName = `PROCESSED_${safeName}_${timestampStr}.json`;

    // 4. Save to Drive (Returns the short 33-character file IDs)
    const rawFileId = saveJsonToDrive(rawFileName, rawData);
    const processedFileId = saveJsonToDrive(processedFileName, processedData);

    const rowData = [
      id,
      userInfo.data.userId,
      uploadDate,
      fileName,
      dataType,
      rawFileId,          // 🚀 Now storing a tiny 33-char ID!
      processedFileId,    // 🚀 Now storing a tiny 33-char ID!
      JSON.stringify(metadata || {}) // Metadata stays in sheet (it's small)
    ];

    sheet.appendRow(rowData);

    updateUserStats(userInfo.data.userId, actualName, actualDisplayName, spreadsheet);
    
    const processedCount = Array.isArray(processedData) ? processedData.length : 0;
    const rawCount = Array.isArray(rawData) ? rawData.length : 0;
    updateLastModified(userInfo.data.userId, actualName, actualDisplayName, fileName, dataType, 'upload', `Processed ${processedCount || rawCount} records`, spreadsheet);

    cleanUpOldData(dataType, 15, spreadsheet);

    return { success: true, data: { id: id, message: 'Data stored successfully' } };
  } catch (error) {
    return { success: false, error: 'Failed to store data: ' + error.message };
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

function getUserUploadedData(limit = 50, dataType = '') {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.success) return userInfo;

    const userRows = getUserDataRows(userInfo.data.userId, dataType);
    if (userRows.length === 0) return { success: true, data: [] };

    const userData = userRows.slice(0, limit).map(row => ({
      id: row[0], userId: row[1], uploadDate: row[2], fileName: row[3], dataType: row[4],
      rawData: getJsonFromDriveOrCell(row[5], []), //Fetch from Drive
      processedData: getJsonFromDriveOrCell(row[6], []), //Fetch from Drive
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
    if (!userInfo.success) return userInfo;

    const userRows = getUserDataRows(userInfo.data.userId, dataType);
    return { success: true, data: userRows.slice(0, limit).map(buildStoredDataSummary) };
  } catch (error) {
    return { success: false, error: 'Failed to retrieve data summary: ' + error.message };
  }
}

function getUploadedDataSummary(limit = 50, dataType = '', includeAll = false) {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.success) return userInfo;

    const userRows = includeAll
      ? getUserDataRows(null, dataType, { includeAll: true })
      : getUserDataRows(userInfo.data.userId, dataType);
    return { success: true, data: userRows.slice(0, limit).map(buildStoredDataSummary) };
  } catch (error) {
    return { success: false, error: 'Failed to retrieve data summary: ' + error.message };
  }
}

function getUploadedDataById(dataId) {
  try {
    const userInfo = getUserInfo();
    if (!userInfo.success) return userInfo;

    const userRows = getUserDataRows(userInfo.data.userId);
    const row = userRows.find(item => item[0] === dataId);
    if (!row) return { success: false, error: 'Stored data not found or access denied' };

    return {
      success: true,
      data: {
        id: row[0], userId: row[1], uploadDate: row[2], fileName: row[3], dataType: row[4],
        rawData: getJsonFromDriveOrCell(row[5], []), //Fetch from Drive
        processedData: getJsonFromDriveOrCell(row[6], []), //Fetch from Drive
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
    if (!userInfo.success) return userInfo;

    const userRows = getUserDataRows(userInfo.data.userId, dataType);
    if (userRows.length === 0) return { success: true, data: null };

    return getUploadedDataById(userRows[0][0]);
  } catch (error) {
    return { success: false, error: 'Failed to retrieve latest stored data: ' + error.message };
  }
}

function updateUserStats(userId, name, displayName, spreadsheet) {
  try {
    const sheet = spreadsheet.getSheetByName(CONFIG.USERS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0] || [];
    
    let userRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf('userId')] === userId) {
        userRowIndex = i + 1; break;
      }
    }

    const now = new Date().toISOString();
    if (userRowIndex === -1) {
      sheet.appendRow([userId, name, displayName, now, 1]);
    } else {
      const currentCount = Number(data[userRowIndex - 1][headers.indexOf('uploadCount')] || 0);
      sheet.getRange(userRowIndex, headers.indexOf('name') + 1).setValue(name);
      sheet.getRange(userRowIndex, headers.indexOf('displayName') + 1).setValue(displayName);
      sheet.getRange(userRowIndex, headers.indexOf('lastAccess') + 1).setValue(now);
      sheet.getRange(userRowIndex, headers.indexOf('uploadCount') + 1).setValue(currentCount + 1);
    }
  } catch (error) { Logger.log('Failed to update stats: ' + error.message); }
}

function updateLastModified(userId, name, displayName, fileName, dataType, action = 'upload', details = '', spreadsheet) {
  try {
    const sheet = spreadsheet.getSheetByName(CONFIG.LAST_MODIFIED_SHEET_NAME);
    sheet.appendRow([new Date().toISOString(), userId, name, displayName, action, fileName, dataType, details]);
  } catch (error) { Logger.log('Failed to update last modified: ' + error.message); }
}

function getLastModifiedInfo(dataType = '') {
  try {
    initializeSpreadsheet();
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.LAST_MODIFIED_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return { success: true, data: null };

    const headers = data[0] || [];
    const dataTypeColumn = headers.indexOf('dataType');

    let lastEntry = null;
    for (let i = data.length - 1; i >= 1; i--) {
      if (!dataType || data[i][dataTypeColumn] === dataType) {
        lastEntry = data[i]; break;
      }
    }

    if (!lastEntry) return { success: true, data: null };

    return {
      success: true,
      data: {
        timestamp: lastEntry[headers.indexOf('timestamp')], userId: lastEntry[headers.indexOf('userId')],
        userName: lastEntry[headers.indexOf('userName')], userDisplayName: lastEntry[headers.indexOf('userDisplayName')],
        action: lastEntry[headers.indexOf('action')], fileName: lastEntry[headers.indexOf('fileName')],
        dataType: lastEntry[headers.indexOf('dataType')], details: lastEntry[headers.indexOf('details')]
      }
    };
  } catch (error) { return { success: false, error: 'Failed to get last modified info: ' + error.message }; }
}

function deleteUploadedData(dataId) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lockAcquired = lock.tryLock(10000);
    if (!lockAcquired) return { success: false, error: 'Database busy.' };

    const userInfo = getUserInfo();
    if (!userInfo.success) return userInfo;

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.DATA_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === dataId && data[i][1] === userInfo.data.userId) {
        //Delete from Drive first
        deleteFileFromDrive(data[i][5]);
        deleteFileFromDrive(data[i][6]);
        
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data deleted successfully' };
      }
    }
    return { success: false, error: 'Data not found' };
  } catch (error) { return { success: false, error: 'Failed to delete data: ' + error.message }; }
  finally { if (lockAcquired) lock.releaseLock(); }
}

// --- WEB APP ENDPOINTS ---

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Globe RSC Data Manager')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch (action) {
      case 'storeData': return ContentService.createTextOutput(JSON.stringify(storeUploadedData(data.fileName, data.dataType, data.rawData, data.processedData, data.metadata))).setMimeType(ContentService.MimeType.JSON);
      case 'getData': return ContentService.createTextOutput(JSON.stringify(getUserUploadedData(data.limit, data.dataType))).setMimeType(ContentService.MimeType.JSON);
      case 'getDataSummary': return ContentService.createTextOutput(JSON.stringify(getUploadedDataSummary(data.limit, data.dataType, parseBoolean(data.includeAll)))).setMimeType(ContentService.MimeType.JSON);
      case 'getDataById': return ContentService.createTextOutput(JSON.stringify(getUploadedDataById(data.dataId))).setMimeType(ContentService.MimeType.JSON);
      case 'getLatestData': return ContentService.createTextOutput(JSON.stringify(getLatestUserUploadedData(data.dataType))).setMimeType(ContentService.MimeType.JSON);
      case 'deleteData': return ContentService.createTextOutput(JSON.stringify(deleteUploadedData(data.dataId))).setMimeType(ContentService.MimeType.JSON);
      case 'getUserInfo': return ContentService.createTextOutput(JSON.stringify(getUserInfo())).setMimeType(ContentService.MimeType.JSON);
      case 'initialize': return ContentService.createTextOutput(JSON.stringify(initializeSpreadsheet())).setMimeType(ContentService.MimeType.JSON);
      case 'getLastModified': return ContentService.createTextOutput(JSON.stringify(getLastModifiedInfo(data.dataType))).setMimeType(ContentService.MimeType.JSON);
      default: return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action: ' + action })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Request processing failed: ' + error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- UTILITY FUNCTIONS ---

function ensureHeaderRow(sheet, headers) {
  const currentMaxColumns = sheet.getMaxColumns();
  if (currentMaxColumns < headers.length) sheet.insertColumnsAfter(currentMaxColumns, headers.length - currentMaxColumns);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function safeJsonParse(value, fallback) {
  try { return JSON.parse(value || JSON.stringify(fallback)); } catch (error) { return fallback; }
}

function parseBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function getUserDataRows(userId, dataType = '', options = {}) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CONFIG.DATA_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return [];
  const includeAll = Boolean(options.includeAll);

  return data.slice(1)
    .filter(row => (includeAll || row[1] === userId) && (!dataType || row[4] === dataType))
    .sort((a, b) => new Date(b[2]) - new Date(a[2]));
}

function buildStoredDataSummary(row) {
  const metadata = safeJsonParse(row[7], {});
  return {
    id: row[0], userId: row[1], uploadDate: row[2], fileName: row[3], dataType: row[4],
    metadata: metadata, processedCount: typeof metadata.processedRecords === 'number' ? metadata.processedRecords : null
  };
}

function cleanUpOldData(dataType, maxKeep = 15, spreadsheet) {
  try {
    const sheet = spreadsheet.getSheetByName(CONFIG.DATA_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    if (data.length <= maxKeep + 1) return; 

    let typeRows = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][4] === dataType) typeRows.push({ rowIndex: i + 1, timestamp: new Date(data[i][2]).getTime(), rawFileId: data[i][5], processedFileId: data[i][6] });
    }

    typeRows.sort((a, b) => b.timestamp - a.timestamp);

    if (typeRows.length > maxKeep) {
      const rowsToDelete = typeRows.slice(maxKeep).sort((a, b) => b.rowIndex - a.rowIndex);
      rowsToDelete.forEach(row => {
        // 🚀 Delete Drive files when cleaning up old records
        deleteFileFromDrive(row.rawFileId);
        deleteFileFromDrive(row.processedFileId);
        sheet.deleteRow(row.rowIndex);
      });
    }
  } catch (error) { Logger.log('Cleanup failed: ' + error.message); }
}
