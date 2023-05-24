use std::collections::HashMap;

use anyhow::{anyhow, Context};
use chrono::serde::ts_seconds;
use chrono::{DateTime, Utc};
use reqwest::Url;
use serde::de::DeserializeOwned;
use serde::Deserialize;

use crate::error::Result;
use crate::AppId;

#[derive(Debug, Deserialize)]
pub enum Region {
    EU,
    NA,
    ASIA,
}

impl Region {
    fn get_endpoint_url(&self, endpoint: &str) -> Result<Url> {
        let base_url = match self {
            Region::EU => Url::parse("https://api.worldoftanks.eu"),
            Region::NA => Url::parse("https://api.worldoftanks.com"),
            Region::ASIA => Url::parse("https://api.worldoftanks.asia"),
        }
        .context("Failed to parse base URL")?;

        let endpoint_url = base_url
            .join(endpoint)
            .with_context(|| format!("Failed to construct URL for endpoint {}", endpoint))?;

        Ok(endpoint_url)
    }
}

pub struct ApiClient {
    region: Region,
    app_id: AppId,
    http_client: reqwest::Client,
}

impl ApiClient {
    pub fn new(region: Region, app_id: AppId) -> Self {
        Self {
            region,
            app_id,
            http_client: reqwest::Client::new(),
        }
    }

    pub async fn extend_access_token(&self, access_token: String) -> Result<AccessTokenDetails> {
        let url = self.region.get_endpoint_url("/wot/auth/prolongate/")?;
        let params = [
            ("application_id", self.app_id.0.as_str()),
            ("access_token", access_token.as_str()),
        ];

        let req = self.http_client.post(url).form(&params);
        let res = req
            .send()
            .await
            .context("Request to extend access token failed")?;

        let token_detail = ApiClient::get_response_data::<AccessTokenDetails>(res)
            .await
            .context("Failed to extend access token")?;

        Ok(token_detail)
    }

    pub async fn get_public_account_info(&self, account_id: u64) -> Result<AccountInfo> {
        let url = self.region.get_endpoint_url("/wot/account/info/")?;
        let params = [
            ("application_id", &self.app_id.0),
            ("account_id", &account_id.to_string()),
        ];

        let req = self.http_client.post(url).form(&params);
        let res = req
            .send()
            .await
            .context("Request to fetch account info failed")?;

        let account_info = ApiClient::get_response_data::<HashMap<String, AccountInfo>>(res)
            .await
            .context("Failed to fetch account info")?
            .remove(&account_id.to_string())
            .ok_or(anyhow!("Account not found: {}", account_id))?;

        Ok(account_info)
    }

    async fn get_response_data<T: DeserializeOwned>(response: reqwest::Response) -> Result<T> {
        let api_response = response
            .json::<ApiResponse<T>>()
            .await
            .context("Failed to decode response as JSON")?;

        let data = match api_response {
            ApiResponse::Success { data } => Ok(data),
            ApiResponse::Error { error } => Err(anyhow!("Received error response: {:?}", error)),
        }?;

        Ok(data)
    }
}

#[derive(Debug, Deserialize)]
pub struct AccessTokenDetails {
    pub access_token: String,
    pub account_id: u64,
    #[serde(with = "ts_seconds")]
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AccountInfo {
    pub account_id: u64,
    pub nickname: String,
    #[serde(with = "ts_seconds")]
    pub created_at: DateTime<Utc>,
    pub statistics: AccountStatistics,
}

#[derive(Debug, Deserialize)]
pub struct AccountStatistics {
    pub all: ModeStatistics,
}

#[derive(Debug, Deserialize)]
pub struct ModeStatistics {
    pub battles: u32,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "status")]
enum ApiResponse<T> {
    #[serde(rename = "ok")]
    Success { data: T },
    #[serde(rename = "error")]
    Error { error: ErrorDetail },
}

#[derive(Debug, Deserialize)]
pub struct ErrorDetail {
    pub message: String,
    pub code: u16,
    pub field: Option<String>,
    pub value: Option<String>,
}
