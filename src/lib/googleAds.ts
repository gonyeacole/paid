import { GoogleAdsApi, enums } from "google-ads-api";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getGoogleAdsClient() {
  return new GoogleAdsApi({
    client_id: requireEnv("GOOGLE_ADS_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_ADS_CLIENT_SECRET"),
    developer_token: requireEnv("GOOGLE_ADS_DEVELOPER_TOKEN"),
  });
}

export function getGoogleAdsCustomer() {
  const client = getGoogleAdsClient();
  return client.Customer({
    customer_id: requireEnv("GOOGLE_ADS_CUSTOMER_ID"),
    refresh_token: requireEnv("GOOGLE_ADS_REFRESH_TOKEN"),
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
  });
}

export const KEYWORD_PLAN_NETWORK = enums.KeywordPlanNetwork;
export const KEYWORD_PLAN_COMPETITION_LEVEL = enums.KeywordPlanCompetitionLevel;
