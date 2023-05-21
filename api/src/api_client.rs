use chrono::serde::ts_seconds;
use chrono::{DateTime, Utc};
use reqwest::Url;
use serde::de::DeserializeOwned;
use serde::Deserialize;
use std::collections::HashMap;
use thiserror::Error;

pub type Result<T> = core::result::Result<T, ApiClientError>;

#[derive(Error, Debug)]
pub enum ApiClientError {
    #[error("Invalid access token.")]
    InvalidAccessToken,
    #[error("Account with ID {0} not found.")]
    AccountNotFound(u64),
    #[error("Error response: {0:?}")]
    ErrorResponse(ErrorDetail),
    #[error(transparent)]
    UrlParse(#[from] url::ParseError),
    #[error(transparent)]
    Reqwest(#[from] reqwest::Error),
}

#[derive(Debug, Clone)]
pub struct AppId(String);

impl AppId {
    pub fn new(key: String) -> Self {
        Self(key)
    }
}

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
        }?;
        let endpoint_url = base_url.join(endpoint)?;
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

        let res = self.http_client.post(url).form(&params).send().await?;

        ApiClient::get_response_data::<AccessTokenDetails>(res).await
    }

    pub async fn get_public_account_info(&self, account_id: u64) -> Result<AccountInfo> {
        let url = self.region.get_endpoint_url("/wot/account/info/")?;
        let params = [
            ("application_id", &self.app_id.0),
            ("account_id", &account_id.to_string()),
        ];

        let res = self.http_client.post(url).form(&params).send().await?;

        ApiClient::get_response_data::<HashMap<String, AccountInfo>>(res)
            .await?
            .remove(&account_id.to_string())
            .ok_or(ApiClientError::AccountNotFound(account_id))
    }

    async fn get_response_data<T: DeserializeOwned>(response: reqwest::Response) -> Result<T> {
        let api_response = response.json::<ApiResponse<T>>().await?;
        match api_response {
            ApiResponse::Success { data } => Ok(data),
            ApiResponse::Error { error } if error.message == "INVALID_ACCESS_TOKEN" => {
                Err(ApiClientError::InvalidAccessToken)
            }
            ApiResponse::Error { error } => Err(ApiClientError::ErrorResponse(error)),
        }
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
