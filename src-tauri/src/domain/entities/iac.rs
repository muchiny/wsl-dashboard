use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct IacToolset {
    pub ansible_version: Option<String>,
    pub kubectl_version: Option<String>,
    pub terraform_version: Option<String>,
    pub helm_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnsiblePlaybook {
    pub name: String,
    pub path: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KubernetesCluster {
    pub context: String,
    pub server: String,
    pub nodes: Vec<K8sNode>,
    pub pod_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct K8sNode {
    pub name: String,
    pub status: String,
    pub roles: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct K8sPod {
    pub name: String,
    pub namespace: String,
    pub status: String,
    pub ready: String,
    pub restarts: u32,
}
