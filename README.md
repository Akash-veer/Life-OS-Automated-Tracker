# 🚀 Life OS: Automated Routine Tracker

A zero-friction, fully automated daily routine tracker built inside Google Sheets. It uses Google Apps Script to automatically sync your daily habits and focus sessions directly to your Google Calendar, completely eliminating manual scheduling.

## 🌟 Features
* **Auto-Syncing Engine:** Pushes daily routines (like Deep Work, Lunch, Workouts) to your Google Calendar automatically.
* **Smart Dashboard:** Calculates your "Expected vs. Actual" progress to show exactly how many times you've skipped a habit.
* **Phantom-Checkbox Proof:** Custom mathematical formulas that bypass standard Google Sheets array bugs.
* **Rolling 28-Day Cycles:** Automatically manages dates without requiring constant manual resets.

## 🛠️ The Tech Stack
* **Frontend:** Google Sheets (Custom UI & Dashboards)
* **Backend:** Google Apps Script (JavaScript)
* **Integrations:** Google Calendar API

## 📥 How to Install (No Coding Required)
You don't need to clone this repository to use the app. The entire system is hosted on Google Workspace.

1. **[Click Here to Make a Copy of the Life OS Engine](https://docs.google.com/spreadsheets/d/1G9MN1KsdpDjqsdqDr_XYPtgvWJEbLkDKFIMYeakjYD8/copy)**
2. Set your **Start Date** in the `Config` tab.
3. In the top menu, click **⚙️ Automation > Sync Today's Routine**. 
4. Grant the one-time Google permissions, and watch your calendar populate!

### ⚠️ A Quick Note on Google Permissions
When you click "Sync" for the first time, Google will show a warning saying **"Google hasn't verified this app."** Don't panic! This is completely normal. Because you just created a private copy of the code on your own Google Drive, Google sees you as the "developer." It shows this warning for any custom script that isn't officially published in the massive Google Workspace Marketplace. 

**To safely bypass this and run your automation:**
1. Click **Continue** on the "Authorization Required" popup.
2. Choose your Google Account.
3. On the warning screen, click **Advanced** at the bottom.
4. Click **Go to Life OS (unsafe)**.
5. Click **Allow** to give the sheet permission to talk to your Calendar. 

You will only ever have to do this once!

## 💻 For Developers
The `LifeOS_Engine.js` file in this repository contains the raw Google Apps Script backend. Feel free to fork this logic to build your own Google Workspace automations!

---
*Built with ❤️ for the organic growth community.*
## 🤝 Let's Connect & Build
I focus on building sustainable, automated systems and organic growth tools. If you found this Life OS engine helpful, I'd love to connect!

* **Let's talk tech:** Connect with me on [LinkedIn](https://www.linkedin.com/in/veer-akash-math-ai) to chat about system architecture, low-code builds, and building in public.
* **See what else I'm building:** I develop full-scale mobile applications. Check out my work on the [Google Play Store](https://play.google.com/store/apps/details?id=com.empirewealth.app).
