use std::sync::Arc;

use crate::domain::errors::DomainError;
use crate::domain::ports::audit_logger::AuditLoggerPort;
use crate::domain::services::distro_service::DistroService;
use crate::domain::value_objects::DistroName;

pub struct StartDistroCommand {
    pub distro_name: DistroName,
}

pub struct StartDistroHandler {
    distro_service: DistroService,
    audit_logger: Arc<dyn AuditLoggerPort>,
}

impl StartDistroHandler {
    pub fn new(distro_service: DistroService, audit_logger: Arc<dyn AuditLoggerPort>) -> Self {
        Self {
            distro_service,
            audit_logger,
        }
    }

    pub async fn handle(&self, cmd: StartDistroCommand) -> Result<(), DomainError> {
        self.distro_service.start(&cmd.distro_name).await?;
        self.audit_logger
            .log("distro.start", cmd.distro_name.as_ref())
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::distro::Distro;
    use crate::domain::ports::audit_logger::MockAuditLoggerPort;
    use crate::domain::ports::wsl_manager::MockWslManagerPort;
    use crate::domain::value_objects::{DistroState, WslVersion};

    fn make_distro(state: DistroState) -> Distro {
        Distro::new(
            DistroName::new("Ubuntu").unwrap(),
            state,
            WslVersion::V2,
            false,
        )
    }

    #[tokio::test]
    async fn test_start_calls_service_and_logs_audit() {
        let mut wsl_mock = MockWslManagerPort::new();
        let distro = make_distro(DistroState::Stopped);
        wsl_mock
            .expect_get_distro()
            .returning(move |_| Ok(distro.clone()));
        wsl_mock.expect_start_distro().returning(|_| Ok(()));

        let mut audit_mock = MockAuditLoggerPort::new();
        audit_mock.expect_log().returning(|_, _| Ok(()));

        let service = DistroService::new(Arc::new(wsl_mock));
        let handler = StartDistroHandler::new(service, Arc::new(audit_mock));
        let result = handler
            .handle(StartDistroCommand {
                distro_name: DistroName::new("Ubuntu").unwrap(),
            })
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_start_already_running_returns_err() {
        let mut wsl_mock = MockWslManagerPort::new();
        let distro = make_distro(DistroState::Running);
        wsl_mock
            .expect_get_distro()
            .returning(move |_| Ok(distro.clone()));

        let audit_mock = MockAuditLoggerPort::new();
        let service = DistroService::new(Arc::new(wsl_mock));
        let handler = StartDistroHandler::new(service, Arc::new(audit_mock));
        let result = handler
            .handle(StartDistroCommand {
                distro_name: DistroName::new("Ubuntu").unwrap(),
            })
            .await;
        assert!(matches!(result, Err(DomainError::DistroAlreadyRunning(_))));
    }
}
