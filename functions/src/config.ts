import * as functions from 'firebase-functions';

const config = functions.config();

export const CLIENT_ID = process.env.CLIENT_ID || config.google?.client_id;
export const CLIENT_SECRET = process.env.CLIENT_SECRET || config.google?.client_secret;
export const REDIRECT_URI = process.env.REDIRECT_URI || config.google?.redirect_uri || 'http://localhost:8080/oauth2callback';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || config.openai?.api_key;
export const OPEN_ROUTER_APIKEY = process.env.OPEN_ROUTER_APIKEY || config.openrouter?.apikey;
