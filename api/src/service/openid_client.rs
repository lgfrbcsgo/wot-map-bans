use std::collections::HashMap;

use anyhow::Context;
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use url::Url;
use validator::Validate;

use crate::error::Result;
use crate::service::region::OpenIDEndpoint;

pub struct OpenIDClient {
    http_client: reqwest::Client,
}

impl OpenIDClient {
    pub fn new() -> Self {
        Self {
            http_client: reqwest::Client::new(),
        }
    }

    pub async fn verify_id(&self, mut id_res: OpenIDParams) -> Result<Option<VerifiedAccount>> {
        id_res.mode = "check_authentication".into();

        let req = self.http_client.post(id_res.endpoint.url()).form(&id_res);
        let res = req.send().await.context("Request to verify ID failed.")?;

        let body = res
            .text()
            .await
            .context("Failed to read check_authentication response.")?;

        match body.as_str() {
            "is_valid:true\nns:http://specs.openid.net/auth/2.0\n" => {
                let account = Self::parse_identity(id_res.identity)?;
                Ok(Some(account))
            }
            _ => Ok(None),
        }
    }

    fn parse_identity(identity: Url) -> Result<VerifiedAccount> {
        lazy_static! {
            static ref ACCOUNT_RE: Regex = Regex::new("/id/(\\d+)-(.+)/").unwrap();
        }

        let cap = ACCOUNT_RE
            .captures(identity.path())
            .with_context(|| format!("Failed to parse id and nick from identity: {}", identity))?;

        let account_id = cap[1]
            .parse::<u64>()
            .with_context(|| format!("Failed to parse account ID as u64: {}", &cap[1]))?;
        let nickname = cap[2].into();

        Ok(VerifiedAccount {
            account_id,
            nickname,
        })
    }
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct OpenIDParams {
    #[serde(rename = "openid.mode")]
    pub mode: String,
    #[serde(rename = "openid.op_endpoint")]
    pub endpoint: OpenIDEndpoint,
    #[serde(rename = "openid.identity")]
    pub identity: Url,
    #[serde(flatten)]
    pub other: HashMap<String, String>,
}

#[derive(Debug)]
pub struct VerifiedAccount {
    pub account_id: u64,
    pub nickname: String,
}
