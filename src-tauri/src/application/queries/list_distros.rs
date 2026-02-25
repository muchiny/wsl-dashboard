use std::sync::Arc;

use crate::application::dto::responses::DistroResponse;
use crate::domain::errors::DomainError;
use crate::domain::ports::wsl_manager::WslManagerPort;

pub struct ListDistrosHandler {
    wsl_manager: Arc<dyn WslManagerPort>,
}

impl ListDistrosHandler {
    pub fn new(wsl_manager: Arc<dyn WslManagerPort>) -> Self {
        Self { wsl_manager }
    }

    pub async fn handle(&self) -> Result<Vec<DistroResponse>, DomainError> {
        let distros = self.wsl_manager.list_distros().await?;
        Ok(distros.into_iter().map(DistroResponse::from).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::distro::Distro;
    use crate::domain::ports::wsl_manager::MockWslManagerPort;
    use crate::domain::value_objects::{DistroName, DistroState, WslVersion};

    fn make_distro(name: &str) -> Distro {
        Distro::new(
            DistroName::new(name).unwrap(),
            DistroState::Running,
            WslVersion::V2,
            false,
        )
    }

    #[tokio::test]
    async fn test_handle_returns_mapped_responses() {
        let mut mock = MockWslManagerPort::new();
        mock.expect_list_distros()
            .returning(|| Ok(vec![make_distro("Ubuntu"), make_distro("Fedora")]));

        let handler = ListDistrosHandler::new(Arc::new(mock));
        let result = handler.handle().await.unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].name, "Ubuntu");
        assert_eq!(result[1].name, "Fedora");
    }

    #[tokio::test]
    async fn test_handle_empty_list() {
        let mut mock = MockWslManagerPort::new();
        mock.expect_list_distros().returning(|| Ok(vec![]));

        let handler = ListDistrosHandler::new(Arc::new(mock));
        let result = handler.handle().await.unwrap();
        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn test_handle_propagates_error() {
        let mut mock = MockWslManagerPort::new();
        mock.expect_list_distros()
            .returning(|| Err(DomainError::WslCliError("timeout".into())));

        let handler = ListDistrosHandler::new(Arc::new(mock));
        assert!(handler.handle().await.is_err());
    }
}
