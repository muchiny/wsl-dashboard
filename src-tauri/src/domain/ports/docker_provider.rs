use async_trait::async_trait;

use crate::domain::entities::docker::{Container, DockerImage};
use crate::domain::errors::DomainError;
use crate::domain::value_objects::DistroName;

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait DockerProviderPort: Send + Sync {
    /// Check if Docker is available in the distro
    async fn is_available(&self, distro: &DistroName) -> Result<bool, DomainError>;

    /// List containers (optionally including stopped ones)
    async fn list_containers(
        &self,
        distro: &DistroName,
        all: bool,
    ) -> Result<Vec<Container>, DomainError>;

    /// List Docker images
    async fn list_images(&self, distro: &DistroName) -> Result<Vec<DockerImage>, DomainError>;

    /// Start a container
    async fn start_container(
        &self,
        distro: &DistroName,
        container_id: &str,
    ) -> Result<(), DomainError>;

    /// Stop a container
    async fn stop_container(
        &self,
        distro: &DistroName,
        container_id: &str,
    ) -> Result<(), DomainError>;

    /// Pull a Docker image
    async fn pull_image(&self, distro: &DistroName, image: &str) -> Result<(), DomainError>;
}
