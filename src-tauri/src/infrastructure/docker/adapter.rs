use async_trait::async_trait;
use std::sync::Arc;

use crate::domain::entities::docker::{Container, ContainerState, DockerImage, PortMapping};
use crate::domain::errors::DomainError;
use crate::domain::ports::docker_provider::DockerProviderPort;
use crate::domain::ports::wsl_manager::WslManagerPort;
use crate::domain::value_objects::{DistroName, MemorySize};

/// Docker CLI adapter - runs docker commands inside WSL distros.
pub struct DockerCliAdapter {
    wsl_manager: Arc<dyn WslManagerPort>,
}

impl DockerCliAdapter {
    pub fn new(wsl_manager: Arc<dyn WslManagerPort>) -> Self {
        Self { wsl_manager }
    }

    pub fn parse_container_state(state: &str) -> ContainerState {
        match state.to_lowercase().as_str() {
            "running" => ContainerState::Running,
            "paused" => ContainerState::Paused,
            "exited" => ContainerState::Exited,
            "created" => ContainerState::Created,
            "restarting" => ContainerState::Restarting,
            "dead" => ContainerState::Dead,
            _ => ContainerState::Exited,
        }
    }

    pub fn parse_ports(ports_str: &str) -> Vec<PortMapping> {
        if ports_str.is_empty() {
            return Vec::new();
        }
        ports_str
            .split(',')
            .filter_map(|mapping| {
                let mapping = mapping.trim();
                // Format: "0.0.0.0:8080->80/tcp" or "80/tcp"
                if let Some(arrow_pos) = mapping.find("->") {
                    let host_part = &mapping[..arrow_pos];
                    let container_part = &mapping[arrow_pos + 2..];
                    let host_port = host_part
                        .rsplit(':')
                        .next()
                        .and_then(|p| p.parse::<u16>().ok());
                    let (port_str, proto) = container_part
                        .split_once('/')
                        .unwrap_or((container_part, "tcp"));
                    let container_port = port_str.parse::<u16>().ok()?;
                    Some(PortMapping {
                        host_port,
                        container_port,
                        protocol: proto.to_string(),
                    })
                } else {
                    let (port_str, proto) =
                        mapping.split_once('/').unwrap_or((mapping, "tcp"));
                    let container_port = port_str.parse::<u16>().ok()?;
                    Some(PortMapping {
                        host_port: None,
                        container_port,
                        protocol: proto.to_string(),
                    })
                }
            })
            .collect()
    }

    pub fn parse_docker_size(size_str: &str) -> u64 {
        let s = size_str.trim();
        let (num_str, unit) = s
            .find(|c: char| !c.is_ascii_digit() && c != '.')
            .map(|i| s.split_at(i))
            .unwrap_or((s, "B"));
        let num: f64 = num_str.parse().unwrap_or(0.0);
        match unit.trim().to_uppercase().as_str() {
            "KB" => (num * 1024.0) as u64,
            "MB" => (num * 1024.0 * 1024.0) as u64,
            "GB" => (num * 1024.0 * 1024.0 * 1024.0) as u64,
            _ => num as u64,
        }
    }
}

#[async_trait]
impl DockerProviderPort for DockerCliAdapter {
    async fn is_available(&self, distro: &DistroName) -> Result<bool, DomainError> {
        match self
            .wsl_manager
            .exec_in_distro(distro, "docker info --format '{{.ServerVersion}}' 2>/dev/null")
            .await
        {
            Ok(output) => Ok(!output.trim().is_empty()),
            Err(_) => Ok(false),
        }
    }

    async fn list_containers(
        &self,
        distro: &DistroName,
        all: bool,
    ) -> Result<Vec<Container>, DomainError> {
        let all_flag = if all { "--all " } else { "" };
        let output = self
            .wsl_manager
            .exec_in_distro(
                distro,
                &format!(
                    "docker ps {all_flag}--format '{{{{.ID}}}}\\t{{{{.Names}}}}\\t{{{{.Image}}}}\\t{{{{.State}}}}\\t{{{{.Status}}}}\\t{{{{.Ports}}}}\\t{{{{.CreatedAt}}}}' 2>/dev/null"
                ),
            )
            .await?;

        let mut containers = Vec::new();
        for line in output.lines() {
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 7 {
                let created_at = chrono::DateTime::parse_from_str(
                    parts.get(6).unwrap_or(&""),
                    "%Y-%m-%d %H:%M:%S %z",
                )
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .unwrap_or_else(|_| chrono::Utc::now());

                containers.push(Container {
                    id: parts.first().unwrap_or(&"").to_string(),
                    name: parts.get(1).unwrap_or(&"").to_string(),
                    image: parts.get(2).unwrap_or(&"").to_string(),
                    state: Self::parse_container_state(parts.get(3).unwrap_or(&"")),
                    status: parts.get(4).unwrap_or(&"").to_string(),
                    ports: Self::parse_ports(parts.get(5).unwrap_or(&"")),
                    created_at,
                });
            }
        }

        Ok(containers)
    }

    async fn list_images(&self, distro: &DistroName) -> Result<Vec<DockerImage>, DomainError> {
        let output = self
            .wsl_manager
            .exec_in_distro(
                distro,
                "docker images --format '{{.ID}}\\t{{.Repository}}\\t{{.Tag}}\\t{{.Size}}\\t{{.CreatedAt}}' 2>/dev/null",
            )
            .await?;

        let mut images = Vec::new();
        for line in output.lines() {
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 5 {
                let created_at = chrono::DateTime::parse_from_str(
                    parts.get(4).unwrap_or(&""),
                    "%Y-%m-%d %H:%M:%S %z",
                )
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .unwrap_or_else(|_| chrono::Utc::now());

                images.push(DockerImage {
                    id: parts.first().unwrap_or(&"").to_string(),
                    repository: parts.get(1).unwrap_or(&"").to_string(),
                    tag: parts.get(2).unwrap_or(&"").to_string(),
                    size: MemorySize::from_bytes(Self::parse_docker_size(
                        parts.get(3).unwrap_or(&"0"),
                    )),
                    created_at,
                });
            }
        }

        Ok(images)
    }

    async fn start_container(
        &self,
        distro: &DistroName,
        container_id: &str,
    ) -> Result<(), DomainError> {
        self.wsl_manager
            .exec_in_distro(distro, &format!("docker start {}", container_id))
            .await?;
        Ok(())
    }

    async fn stop_container(
        &self,
        distro: &DistroName,
        container_id: &str,
    ) -> Result<(), DomainError> {
        self.wsl_manager
            .exec_in_distro(distro, &format!("docker stop {}", container_id))
            .await?;
        Ok(())
    }

    async fn pull_image(&self, distro: &DistroName, image: &str) -> Result<(), DomainError> {
        self.wsl_manager
            .exec_in_distro(distro, &format!("docker pull {}", image))
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ports_mapping() {
        let ports = DockerCliAdapter::parse_ports("0.0.0.0:8080->80/tcp, 443/tcp");
        assert_eq!(ports.len(), 2);
        assert_eq!(ports[0].host_port, Some(8080));
        assert_eq!(ports[0].container_port, 80);
        assert_eq!(ports[1].host_port, None);
        assert_eq!(ports[1].container_port, 443);
    }

    #[test]
    fn test_parse_empty_ports() {
        let ports = DockerCliAdapter::parse_ports("");
        assert!(ports.is_empty());
    }

    #[test]
    fn test_parse_docker_size() {
        assert_eq!(DockerCliAdapter::parse_docker_size("100MB"), 104857600);
        assert_eq!(DockerCliAdapter::parse_docker_size("1.5GB"), 1610612736);
    }

    #[test]
    fn test_parse_container_state() {
        assert!(matches!(
            DockerCliAdapter::parse_container_state("running"),
            ContainerState::Running
        ));
        assert!(matches!(
            DockerCliAdapter::parse_container_state("exited"),
            ContainerState::Exited
        ));
    }

    #[test]
    fn test_parse_container_state_all_variants() {
        assert!(matches!(
            DockerCliAdapter::parse_container_state("paused"),
            ContainerState::Paused
        ));
        assert!(matches!(
            DockerCliAdapter::parse_container_state("created"),
            ContainerState::Created
        ));
        assert!(matches!(
            DockerCliAdapter::parse_container_state("restarting"),
            ContainerState::Restarting
        ));
        assert!(matches!(
            DockerCliAdapter::parse_container_state("dead"),
            ContainerState::Dead
        ));
        // Unknown defaults to Exited
        assert!(matches!(
            DockerCliAdapter::parse_container_state("broken"),
            ContainerState::Exited
        ));
    }

    #[tokio::test]
    async fn test_list_containers_parses_docker_ps() {
        use crate::domain::ports::wsl_manager::MockWslManagerPort;

        let docker_output = "abc123\tmy-nginx\tnginx:latest\trunning\tUp 2 hours\t0.0.0.0:8080->80/tcp\t2025-01-15 10:00:00 +0000\n";
        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(move |_, _| Ok(docker_output.to_string()));

        let adapter = DockerCliAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let containers = adapter.list_containers(&name, true).await.unwrap();

        assert_eq!(containers.len(), 1);
        assert_eq!(containers[0].id, "abc123");
        assert_eq!(containers[0].name, "my-nginx");
        assert_eq!(containers[0].image, "nginx:latest");
        assert!(matches!(containers[0].state, ContainerState::Running));
        assert_eq!(containers[0].ports.len(), 1);
        assert_eq!(containers[0].ports[0].host_port, Some(8080));
        assert_eq!(containers[0].ports[0].container_port, 80);
    }

    #[tokio::test]
    async fn test_list_containers_empty_output() {
        use crate::domain::ports::wsl_manager::MockWslManagerPort;

        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(|_, _| Ok(String::new()));

        let adapter = DockerCliAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let containers = adapter.list_containers(&name, true).await.unwrap();
        assert!(containers.is_empty());
    }

    #[tokio::test]
    async fn test_list_images_parses_docker_images() {
        use crate::domain::ports::wsl_manager::MockWslManagerPort;

        let docker_output =
            "sha256:abc\tnginx\tlatest\t150MB\t2025-01-15 10:00:00 +0000\n";
        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(move |_, _| Ok(docker_output.to_string()));

        let adapter = DockerCliAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let images = adapter.list_images(&name).await.unwrap();

        assert_eq!(images.len(), 1);
        assert_eq!(images[0].id, "sha256:abc");
        assert_eq!(images[0].repository, "nginx");
        assert_eq!(images[0].tag, "latest");
        assert!(images[0].size.bytes() > 0);
    }

    #[tokio::test]
    async fn test_list_images_empty_output() {
        use crate::domain::ports::wsl_manager::MockWslManagerPort;

        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(|_, _| Ok(String::new()));

        let adapter = DockerCliAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let images = adapter.list_images(&name).await.unwrap();
        assert!(images.is_empty());
    }

    #[tokio::test]
    async fn test_is_available_returns_true_when_docker_present() {
        use crate::domain::ports::wsl_manager::MockWslManagerPort;

        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(|_, _| Ok("24.0.5\n".to_string()));

        let adapter = DockerCliAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        assert!(adapter.is_available(&name).await.unwrap());
    }

    #[tokio::test]
    async fn test_is_available_returns_false_when_error() {
        use crate::domain::ports::wsl_manager::MockWslManagerPort;

        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(|_, _| Err(DomainError::DockerError("not found".into())));

        let adapter = DockerCliAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        assert!(!adapter.is_available(&name).await.unwrap());
    }

    mod proptests {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            #[test]
            fn parse_ports_never_panics(s in "\\PC{0,200}") {
                let _ = DockerCliAdapter::parse_ports(&s);
            }

            #[test]
            fn parse_ports_valid_range(s in "\\PC{0,200}") {
                for p in DockerCliAdapter::parse_ports(&s) {
                    prop_assert!(p.container_port <= u16::MAX);
                }
            }

            #[test]
            fn parse_docker_size_never_panics(s in "\\PC{0,50}") {
                let _ = DockerCliAdapter::parse_docker_size(&s);
            }

            #[test]
            fn parse_container_state_never_panics(s in "\\PC{0,50}") {
                let _ = DockerCliAdapter::parse_container_state(&s);
            }

            #[test]
            fn parse_container_state_known_values(s in "(running|paused|exited|created|restarting|dead)") {
                let state = DockerCliAdapter::parse_container_state(&s);
                let state_str = format!("{:?}", state);
                prop_assert!(
                    state_str == "Running" || state_str == "Paused" ||
                    state_str == "Exited" || state_str == "Created" ||
                    state_str == "Restarting" || state_str == "Dead"
                );
            }
        }
    }
}
