#!/bin/bash

# ======= CONFIG ==========
PROJECT_ID="automagic-949df"
REGION="us-central1"
EMAIL="sehmim2010@gmail.com"
SERVICE_ACCOUNT="scheduler-caller@${PROJECT_ID}.iam.gserviceaccount.com"
FUNCTION_NAME="renewGmailWatch"
JOB_NAME="refresh-gmail-watch"
SCHEDULER_REGION="us-central1"  # 💡 This is the key addition
# ==========================

echo "📅 Creating Cloud Scheduler job: $JOB_NAME"

gcloud scheduler jobs create http "$JOB_NAME" \
  --schedule "0 9 */6 * *" \
  --time-zone "America/New_York" \
  --http-method GET \
  --uri "https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}?email=${EMAIL}" \
  --oidc-service-account-email "$SERVICE_ACCOUNT" \
  --oidc-token-audience "https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}" \
  --project "$PROJECT_ID" \
  --location "$SCHEDULER_REGION"

echo "✅ Scheduler job created successfully."
