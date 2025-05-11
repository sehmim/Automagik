#!/bin/bash

ENV_FILE=".env"
echo "🔄 Syncing $ENV_FILE to Firebase functions:config..."

set -a
. "$ENV_FILE"
set +a

firebase functions:config:set auth.client_id="$CLIENT_ID"
firebase functions:config:set auth.client_secret="$CLIENT_SECRET"
firebase functions:config:set auth.redirect_uri="$REDIRECT_URI"
firebase functions:config:set openai.api_key="$OPENAI_API_KEY"
