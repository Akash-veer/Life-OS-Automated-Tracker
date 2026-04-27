// ==========================================
// LIFE OS — DAILY ROUTINE TRACKER
// Public Release v1.0 | Google Apps Script
// Fixed & production-ready for all users
// ==========================================

// Cycle is intentionally fixed at 28 days (7 days × 4 weeks)
// Dashboard, archive, and weekly scoring all depend on this structure
// Do NOT change this value — explained in the PDF guide
var CYCLE_LENGTH = 28;

// The exact name of your main tracker tab
// Must match your sheet tab name exactly
var MAIN_SHEET_NAME = "Executive Routine Tracker V4";

// ==========================================
// MENU — appears when sheet opens
// ==========================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ Automation')
    .addItem('▶ Sync Today\'s Routine to Calendar', 'runDailyCalendarSync')
    .addItem('📋 Check My Current Day', 'showCurrentDay')
    .addItem('🔄 Reset & Start New Cycle Manually', 'manualArchiveAndReset')
    .addToUi();
}

// ==========================================
// MAIN FUNCTION — runs daily at midnight via trigger
// Also callable manually from the menu
// ==========================================
function runDailyCalendarSync(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName("Config");

  // Safety check — Config sheet must exist
  if (!configSheet) {
    Logger.log("ERROR: Config sheet not found. Please do not rename or delete it.");
    return;
  }

  // Target main sheet by name, fall back to first sheet if renamed
  var mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  if (!mainSheet) {
    mainSheet = ss.getSheets()[0];
    Logger.log("WARNING: Main sheet '" + MAIN_SHEET_NAME + "' not found. Using first sheet as fallback.");
  }

  var cal = CalendarApp.getDefaultCalendar();

  // ---- STEP 1: Calculate which Day in the 28-day cycle ----
  var startDateValue = configSheet.getRange("E2").getValue();

  // Auto-onboarding: if start date is blank, stamp today
  if (!startDateValue) {
    var todayStamp = new Date();
    todayStamp.setHours(0, 0, 0, 0);
    configSheet.getRange("E2").setValue(todayStamp);
    startDateValue = todayStamp;
    Logger.log("Auto-onboarding: Start date set to " + todayStamp);
  }

  var startDate = new Date(startDateValue);
  startDate.setHours(0, 0, 0, 0);
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var diffTime = today.getTime() - startDate.getTime();
  var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Guard against negative diffDays (start date set in the future accidentally)
  if (diffDays < 0) {
    Logger.log("WARNING: Start date is in the future. Resetting to today.");
    configSheet.getRange("E2").setValue(today);
    diffDays = 0;
  }

  // ---- STEP 2: Auto-archive at the end of each 28-day cycle ----
  if (diffDays > 0 && diffDays % CYCLE_LENGTH === 0) {
    archiveAndReset(ss, mainSheet);
    Logger.log("Auto-archive triggered on day " + diffDays);
  }

  var cycleDay = (diffDays % CYCLE_LENGTH) + 1;
  var dayString = "Day " + cycleDay;

  // ---- STEP 3: Delete today's existing "Life OS" events to prevent duplicates ----
  var startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  var endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  try {
    var existingEvents = cal.getEvents(startOfDay, endOfDay, { search: "Life OS" });
    for (var ev = 0; ev < existingEvents.length; ev++) {
      existingEvents[ev].deleteEvent();
    }
    Logger.log("Cleared " + existingEvents.length + " existing Life OS events for today.");
  } catch (calErr) {
    Logger.log("ERROR clearing calendar events: " + calErr);
    return;
  }

  // ---- STEP 4: Read ALL categories and times from Config dynamically ----
  // Uses getLastRow() so adding new meal categories just works automatically
  var configLastRow = configSheet.getLastRow();
  if (configLastRow < 2) {
    Logger.log("ERROR: Config sheet has no data rows.");
    return;
  }

  var configData = configSheet.getRange("A2:B" + configLastRow).getDisplayValues();
  var timeMap = {};

  for (var i = 0; i < configData.length; i++) {
    var category = configData[i][0].toString().trim();
    var timeStr = configData[i][1].toString().trim();
    if (category && timeStr) {
      timeMap[category] = timeStr;
    }
  }

  if (Object.keys(timeMap).length === 0) {
    Logger.log("ERROR: No category/time mappings found in Config sheet.");
    return;
  }

  // ---- STEP 5: Find today's rows and push events to Calendar ----
  var lastDataRow = mainSheet.getLastRow();
  if (lastDataRow < 2) {
    Logger.log("ERROR: Main tracker sheet has no data.");
    return;
  }

  var trackerData = mainSheet.getRange(2, 1, lastDataRow - 1, 3).getValues();
  var eventsCreated = 0;
  var skippedCategories = [];

  for (var r = 0; r < trackerData.length; r++) {
    var rowDay = trackerData[r][0].toString().trim();

    if (rowDay === dayString) {
      var rawCategory = trackerData[r][1].toString().trim();
      var targetAction = trackerData[r][2].toString().trim();

      // Strip time suffix like " (8:30 am)" from category name if present
      var baseCategory = rawCategory.split(" (")[0].trim();

      if (!targetAction) {
        Logger.log("Skipping empty action for category: " + baseCategory);
        continue;
      }

      if (timeMap[baseCategory]) {
        var timeParts = parseTimeSafely(timeMap[baseCategory]);

        if (timeParts) {
          var eventStart = new Date();
          eventStart.setHours(timeParts.hours, timeParts.mins, 0, 0);
          var eventEnd = new Date(eventStart.getTime() + (30 * 60000)); // 30 min default

          var eventTitle = "Life OS: " + baseCategory;
          var eventDesc =
            "🎯 Target: " + targetAction +
            "\n\n📅 Cycle: " + dayString + " of " + CYCLE_LENGTH +
            "\n\n✅ Log completion in your Dashboard:\n" + ss.getUrl();

          try {
            cal.createEvent(eventTitle, eventStart, eventEnd, { description: eventDesc });
            eventsCreated++;
            Logger.log("Created event: " + eventTitle + " at " + timeMap[baseCategory]);
          } catch (createErr) {
            Logger.log("ERROR creating event for " + baseCategory + ": " + createErr);
          }

        } else {
          Logger.log("WARNING: Could not parse time '" + timeMap[baseCategory] + "' for category: " + baseCategory);
          skippedCategories.push(baseCategory);
        }

      } else {
        Logger.log("WARNING: No time mapping found for category: " + baseCategory);
        skippedCategories.push(baseCategory);
      }
    }
  }

  // ---- STEP 6: Safe UI alert — only when run manually from the menu ----
  if (!e) {
    var message = "✅ Success!\n\n";
    message += "📅 Today is " + dayString + " of your 28-day cycle.\n";
    message += "📆 " + eventsCreated + " events pushed to your Google Calendar.\n";

    if (skippedCategories.length > 0) {
      message += "\n⚠️ Skipped (no time mapped): " + skippedCategories.join(", ");
    }

    try {
      SpreadsheetApp.getUi().alert("Life OS — Daily Sync", message, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (uiErr) {
      Logger.log("UI alert skipped (background run): " + uiErr);
    }
  }

  Logger.log("Sync complete. Day: " + dayString + " | Events created: " + eventsCreated);
}

// ==========================================
// TIME PARSER — converts "6:30 AM" to hours + minutes
// Returns null safely if format is unreadable
// ==========================================
function parseTimeSafely(timeStr) {
  if (!timeStr) return null;

  var match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) {
    Logger.log("parseTimeSafely: Could not parse '" + timeStr + "'");
    return null;
  }

  var hours = parseInt(match[1], 10);
  var mins = parseInt(match[2], 10);
  var isPM = match[3].toUpperCase() === "PM";

  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  // Sanity check on parsed values
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) {
    Logger.log("parseTimeSafely: Out-of-range values — hours:" + hours + " mins:" + mins);
    return null;
  }

  return { hours: hours, mins: mins };
}

// ==========================================
// AUTO-ARCHIVE ENGINE
// Runs automatically on Day 29 (start of new cycle)
// Saves score snapshot + resets checkboxes
// ==========================================
function archiveAndReset(ss, mainSheet) {
  Logger.log("archiveAndReset: Starting archive process...");

  // Get or create the Historical Archive sheet
  var historySheet = ss.getSheetByName("Historical Archive");
  if (!historySheet) {
    historySheet = ss.insertSheet("Historical Archive");
    historySheet.appendRow(["Archive Date", "28-Day Consistency Score", "Notes"]);
    historySheet.getRange("A1:C1")
      .setFontWeight("bold")
      .setBackground("#121212")
      .setFontColor("#00E5FF");
    Logger.log("archiveAndReset: Created new Historical Archive sheet.");
  }

  // Read consistency score safely using Named Range
  // In your sheet: Data → Named ranges → name cell "ConsistencyScore"
  var finalScore = "N/A";
  try {
    var namedRange = ss.getRangeByName("ConsistencyScore");
    if (namedRange) {
      finalScore = namedRange.getValue();
    } else {
      // Fallback: read from Dashboard A3 if Named Range not set up
      var dashboard = ss.getSheetByName("Dashboard");
      if (dashboard) {
        finalScore = dashboard.getRange("A3").getValue();
        Logger.log("archiveAndReset: Named range 'ConsistencyScore' not found, used A3 as fallback.");
      }
    }
  } catch (scoreErr) {
    Logger.log("archiveAndReset: Could not read score — " + scoreErr);
  }

  // Save snapshot to archive
  historySheet.appendRow([
    new Date(),
    finalScore,
    "Auto-archived at end of 28-day cycle"
  ]);

  // Reset all checkboxes in column D of the main tracker
  var lastRow = mainSheet.getLastRow();
  if (lastRow > 1) {
    mainSheet.getRange(2, 4, lastRow - 1, 1).uncheck();
    Logger.log("archiveAndReset: Reset " + (lastRow - 1) + " checkboxes.");
  }

  Logger.log("archiveAndReset: Complete. Score archived: " + finalScore);
}

// ==========================================
// HELPER — Show current day from menu
// Useful for users to verify they're on the right day
// ==========================================
function showCurrentDay() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName("Config");

  if (!configSheet) {
    SpreadsheetApp.getUi().alert("Config sheet not found.");
    return;
  }

  var startDateValue = configSheet.getRange("E2").getValue();
  if (!startDateValue) {
    SpreadsheetApp.getUi().alert("No start date found. Run 'Sync Today's Routine' first to auto-set it.");
    return;
  }

  var startDate = new Date(startDateValue);
  startDate.setHours(0, 0, 0, 0);
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  var cycleDay = (diffDays % CYCLE_LENGTH) + 1;
  var cycleNumber = Math.floor(diffDays / CYCLE_LENGTH) + 1;

  SpreadsheetApp.getUi().alert(
    "Life OS — Current Status",
    "📅 Today is Day " + cycleDay + " of 28\n" +
    "🔄 You are on Cycle #" + cycleNumber + "\n" +
    "🗓️ Started: " + startDate.toDateString() + "\n" +
    "📆 Today: " + today.toDateString(),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ==========================================
// HELPER — Manual archive trigger from menu
// For users who want to reset cycle early
// ==========================================
function manualArchiveAndReset() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  var confirm = ui.alert(
    "Reset Cycle",
    "⚠️ This will archive your current score and reset all checkboxes.\n\nAre you sure?",
    ui.ButtonSet.YES_NO
  );

  if (confirm === ui.Button.YES) {
    var mainSheet = ss.getSheetByName(MAIN_SHEET_NAME) || ss.getSheets()[0];
    archiveAndReset(ss, mainSheet);

    // Reset start date to today so cycle begins fresh
    var configSheet = ss.getSheetByName("Config");
    if (configSheet) {
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      configSheet.getRange("E2").setValue(today);
    }

    ui.alert("✅ Done! Your cycle has been reset. Today is your new Day 1.");
  }
}
