use async_trait::async_trait;

use crate::domain::entities::iac::{
    AnsiblePlaybook, IacToolset, K8sPod, KubernetesCluster,
};
use crate::domain::errors::DomainError;
use crate::domain::value_objects::DistroName;

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait IacProviderPort: Send + Sync {
    /// Detect which IaC tools are installed in the distro
    async fn detect_tools(&self, distro: &DistroName) -> Result<IacToolset, DomainError>;

    /// List Ansible playbooks at a given path inside the distro
    async fn list_ansible_playbooks(
        &self,
        distro: &DistroName,
        path: &str,
    ) -> Result<Vec<AnsiblePlaybook>, DomainError>;

    /// Run an Ansible playbook
    async fn run_ansible_playbook(
        &self,
        distro: &DistroName,
        playbook_path: &str,
        extra_vars: Option<String>,
    ) -> Result<String, DomainError>;

    /// Get Kubernetes cluster info
    async fn get_k8s_cluster_info(
        &self,
        distro: &DistroName,
    ) -> Result<KubernetesCluster, DomainError>;

    /// Get pods in a namespace
    async fn get_k8s_pods(
        &self,
        distro: &DistroName,
        namespace: &str,
    ) -> Result<Vec<K8sPod>, DomainError>;
}
