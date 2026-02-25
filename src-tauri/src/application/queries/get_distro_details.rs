use std::sync::Arc;

use crate::application::dto::responses::DistroDetailResponse;
use crate::domain::errors::DomainError;
use crate::domain::ports::wsl_manager::WslManagerPort;
use crate::domain::value_objects::DistroName;

pub struct GetDistroDetailsHandler {
    wsl_manager: Arc<dyn WslManagerPort>,
}

impl GetDistroDetailsHandler {
    pub fn new(wsl_manager: Arc<dyn WslManagerPort>) -> Self {
        Self { wsl_manager }
    }

    pub async fn handle(&self, name: DistroName) -> Result<DistroDetailResponse, DomainError> {
        let distro = self.wsl_manager.get_distro(&name).await?;
        let distro_config = self.wsl_manager.get_distro_config(&name).await.ok();

        Ok(DistroDetailResponse {
            name: distro.name.to_string(),
            state: distro.state.to_string(),
            wsl_version: distro.wsl_version.as_u8(),
            is_default: distro.is_default,
            base_path: distro.base_path,
            vhdx_size_bytes: distro.vhdx_size.map(|s| s.bytes()),
            distro_config,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::distro::Distro;
    use crate::domain::entities::wsl_config::WslDistroConfig;
    use crate::domain::ports::wsl_manager::MockWslManagerPort;
    use crate::domain::value_objects::{DistroState, WslVersion};

    fn make_distro() -> Distro {
        Distro::new(
            DistroName::new("Ubuntu").unwrap(),
            DistroState::Running,
            WslVersion::V2,
            true,
        )
    }

    #[tokio::test]
    async fn test_handle_returns_detail_response() {
        let mut mock = MockWslManagerPort::new();
        let distro = make_distro();
        mock.expect_get_distro()
            .returning(move |_| Ok(distro.clone()));
        mock.expect_get_distro_config()
            .returning(|_| Ok(WslDistroConfig::default()));

        let handler = GetDistroDetailsHandler::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let result = handler.handle(name).await.unwrap();

        assert_eq!(result.name, "Ubuntu");
        assert_eq!(result.state, "Running");
        assert!(result.is_default);
        assert!(result.distro_config.is_some());
    }

    #[tokio::test]
    async fn test_handle_config_error_returns_none() {
        let mut mock = MockWslManagerPort::new();
        let distro = make_distro();
        mock.expect_get_distro()
            .returning(move |_| Ok(distro.clone()));
        mock.expect_get_distro_config()
            .returning(|_| Err(DomainError::ConfigError("not found".into())));

        let handler = GetDistroDetailsHandler::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let result = handler.handle(name).await.unwrap();
        assert!(result.distro_config.is_none());
    }

    #[tokio::test]
    async fn test_handle_distro_not_found() {
        let mut mock = MockWslManagerPort::new();
        mock.expect_get_distro()
            .returning(|_| Err(DomainError::DistroNotFound("Ubuntu".into())));

        let handler = GetDistroDetailsHandler::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        assert!(handler.handle(name).await.is_err());
    }
}
