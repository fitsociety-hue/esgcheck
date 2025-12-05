# ESG Self-Diagnosis App Setup Guide

## 1. Google Sheets & Backend Setup
Since this is a static site (GitHub Pages), we need a backend to save the data. We use Google Apps Script for this.

1.  **Create a Google Sheet**:
    -   Go to [Google Sheets](https://sheets.google.com) and create a new sheet.
    -   Name it "ESG Diagnosis Data".

2.  **Add the Script**:
    -   In the Google Sheet, go to `Extensions` > `Apps Script`.
    -   Delete any existing code in `Code.gs`.
    -   Copy the content from the file `Code.gs` in this project and paste it there.
    -   Save the project (Ctrl+S).

3.  **Deploy the Web App**:
    -   Click the blue **Deploy** button > **New deployment**.
    -   Click the gear icon next to "Select type" > **Web app**.
    -   **Description**: "ESG Backend".
    -   **Execute as**: "Me" (your email).
    -   **Who has access**: **Anyone** (This is crucial so the app can send data without login).
    -   Click **Deploy**.
    -   **Authorize Access**: You will be asked to authorize the script. Click "Review permissions" > Choose account > Advanced > Go to (Project Name) (unsafe) > Allow.
    -   **Copy the Web App URL**.

4.  **Configure the Frontend**:
    -   Open `js/config.js` in this project.
    -   Replace `REPLACE_WITH_YOUR_DEPLOYED_APPS_SCRIPT_URL` with the URL you just copied.

## 2. Admin Dashboard Setup
1.  **Redeploy GAS**: If you updated the `Code.gs` file, you must redeploy the Web App.
    -   Click **Deploy** > **Manage deployments**.
    -   Click the **pencil icon** (Edit) next to your active deployment.
    -   **Version**: Select **New version**.
    -   Click **Deploy**.
2.  **Access Admin Page**: Go to `[Your GitHub Pages URL]/admin.html`.
3.  **Password**: The default password is `admin`. You can change this in `js/admin.js`.

## 3. GitHub Pages Deployment
1.  Push this code to your GitHub repository.
2.  Go to the repository **Settings** > **Pages**.
3.  Under **Build and deployment** > **Source**, select **Deploy from a branch**.
4.  Select the `main` (or `master`) branch and `/ (root)` folder.
5.  Click **Save**.
6.  Wait a few minutes, and your site will be live!

## 3. Updating Questions
To change the questions or categories, edit the `js/data.js` file. The structure is self-explanatory.
