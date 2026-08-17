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

// Queried as itself (customer_id === login_customer_id) so its `customer_client` rows list
// every account in the MCC hierarchy, not just accounts directly under it.
export function getGoogleAdsMccCustomer() {
  const client = getGoogleAdsClient();
  const mccId = requireEnv("GOOGLE_ADS_LOGIN_CUSTOMER_ID");
  return client.Customer({
    customer_id: mccId,
    login_customer_id: mccId,
    refresh_token: requireEnv("GOOGLE_ADS_REFRESH_TOKEN"),
  });
}

export function getGoogleAdsChildCustomer(customerId: string) {
  const client = getGoogleAdsClient();
  return client.Customer({
    customer_id: customerId,
    login_customer_id: requireEnv("GOOGLE_ADS_LOGIN_CUSTOMER_ID"),
    refresh_token: requireEnv("GOOGLE_ADS_REFRESH_TOKEN"),
  });
}

export const KEYWORD_PLAN_NETWORK = enums.KeywordPlanNetwork;
export const KEYWORD_PLAN_COMPETITION_LEVEL = enums.KeywordPlanCompetitionLevel;
export const KEYWORD_MATCH_TYPE = enums.KeywordMatchType;
