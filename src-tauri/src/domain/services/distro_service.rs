use std::sync::Arc;

use crate::domain::errors::DomainError;
use crate::domain::ports::wsl_manager::WslManagerPort;
use crate::domain::value_objects::{DistroName, DistroState};

/// Domain service for distro operations with business rule validation.
pub struct DistroService {
    wsl_manager: Arc<dyn WslManagerPort>,
}

impl DistroService {
    pub fn new(wsl_manager: Arc<dyn WslManagerPort>) -> Self {
        Self { wsl_manager }
    }

    /// Start a distribution. Validates it exists and is not already running.
    pub async fn start(&self, name: &DistroName) -> Result<(), DomainError> {
        let distro = self.wsl_manager.get_distro(name).await?;
        if distro.state == DistroState::Running {
            return Err(DomainError::DistroAlreadyRunning(name.to_string()));
        }
        self.wsl_manager.start_distro(name).await
    }

    /// Stop (terminate) a distribution. Validates it is running.
    pub async fn stop(&self, name: &DistroName) -> Result<(), DomainError> {
        let distro = self.wsl_manager.get_distro(name).await?;
        if !distro.state.is_running() {
            return Err(DomainError::DistroNotRunning(name.to_string()));
        }
        self.wsl_manager.terminate_distro(name).await
    }

    /// Restart a distribution. Stops then starts.
    pub async fn restart(&self, name: &DistroName) -> Result<(), DomainError> {
        let distro = self.wsl_manager.get_distro(name).await?;
        if distro.state.is_running() {
            self.wsl_manager.terminate_distro(name).await?;
        }
        self.wsl_manager.start_distro(name).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::distro::Distro;
    use crate::domain::ports::wsl_manager::MockWslManagerPort;
    use crate::domain::value_objects::WslVersion;

    fn make_distro(name: &str, state: DistroState) -> Distro {
        Distro::new(DistroName::new(name).unwrap(), state, WslVersion::V2, false)
    }

    #[tokio::test]
    async fn test_start_stopped_distro_succeeds() {
        let mut mock = MockWslManagerPort::new();
        let distro = make_distro("Ubuntu", DistroState::Stopped);

        mock.expect_get_distro()
            .returning(move |_| Ok(distro.clone()));
        mock.expect_start_distro().returning(|_| Ok(()));

        let service = DistroService::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        assert!(service.start(&name).await.is_ok());
    }

    #[tokio::test]
    async fn test_start_running_distro_fails() {
        let mut mock = MockWslManagerPort::new();
        let distro = make_distro("Ubuntu", DistroState::Running);

        mock.expect_get_distro()
            .returning(move |_| Ok(distro.clone()));

        let service = DistroService::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let result = service.start(&name).await;
        assert!(matches!(result, Err(DomainError::DistroAlreadyRunning(_))));
    }

    #[tokio::test]
    async fn test_stop_running_distro_succeeds() {
        let mut mock = MockWslManagerPort::new();
        let distro = make_distro("Ubuntu", DistroState::Running);

        mock.expect_get_distro()
            .returning(move |_| Ok(distro.clone()));
        mock.expect_terminate_distro().returning(|_| Ok(()));

        let service = DistroService::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        assert!(service.stop(&name).await.is_ok());
    }

    #[tokio::test]
    async fn test_stop_stopped_distro_fails() {
        let mut mock = MockWslManagerPort::new();
        let distro = make_distro("Ubuntu", DistroState::Stopped);

        mock.expect_get_distro()
            .returning(move |_| Ok(distro.clone()));

        let service = DistroService::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let result = service.stop(&name).await;
        assert!(matches!(result, Err(DomainError::DistroNotRunning(_))));
    }
}
