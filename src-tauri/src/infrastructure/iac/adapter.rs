use async_trait::async_trait;
use std::sync::Arc;

use crate::domain::entities::iac::{
    AnsiblePlaybook, IacToolset, K8sNode, K8sPod, KubernetesCluster,
};
use crate::domain::errors::DomainError;
use crate::domain::ports::iac_provider::IacProviderPort;
use crate::domain::ports::wsl_manager::WslManagerPort;
use crate::domain::value_objects::DistroName;

/// Parse `kubectl get pods --no-headers` output into a list of K8sPod.
pub fn parse_k8s_pods(text: &str, namespace: &str) -> Vec<K8sPod> {
    text.lines()
        .filter(|l| !l.is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            K8sPod {
                name: parts.first().unwrap_or(&"").to_string(),
                namespace: namespace.to_string(),
                ready: parts.get(1).unwrap_or(&"").to_string(),
                status: parts.get(2).unwrap_or(&"").to_string(),
                restarts: parts.get(3).and_then(|s| s.parse().ok()).unwrap_or(0),
            }
        })
        .collect()
}

/// Parse `kubectl get nodes --no-headers` output into a list of K8sNode.
pub fn parse_k8s_nodes(text: &str) -> Vec<K8sNode> {
    text.lines()
        .filter(|l| !l.is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            K8sNode {
                name: parts.first().unwrap_or(&"").to_string(),
                status: parts.get(1).unwrap_or(&"").to_string(),
                roles: parts
                    .get(2)
                    .unwrap_or(&"")
                    .split(',')
                    .map(|s| s.to_string())
                    .collect(),
            }
        })
        .collect()
}

/// IaC adapter - detects and runs IaC tools inside WSL distros.
pub struct IacCliAdapter {
    wsl_manager: Arc<dyn WslManagerPort>,
}

impl IacCliAdapter {
    pub fn new(wsl_manager: Arc<dyn WslManagerPort>) -> Self {
        Self { wsl_manager }
    }

    async fn get_tool_version(&self, distro: &DistroName, cmd: &str) -> Option<String> {
        self.wsl_manager
            .exec_in_distro(distro, &format!("{cmd} --version 2>/dev/null | head -1"))
            .await
            .ok()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    }
}

#[async_trait]
impl IacProviderPort for IacCliAdapter {
    async fn detect_tools(&self, distro: &DistroName) -> Result<IacToolset, DomainError> {
        Ok(IacToolset {
            ansible_version: self.get_tool_version(distro, "ansible").await,
            kubectl_version: self
                .get_tool_version(distro, "kubectl version --client --short")
                .await,
            terraform_version: self.get_tool_version(distro, "terraform").await,
            helm_version: self.get_tool_version(distro, "helm").await,
        })
    }

    async fn list_ansible_playbooks(
        &self,
        distro: &DistroName,
        path: &str,
    ) -> Result<Vec<AnsiblePlaybook>, DomainError> {
        let output = self
            .wsl_manager
            .exec_in_distro(
                distro,
                &format!("find {path} -maxdepth 2 -name '*.yml' -o -name '*.yaml' 2>/dev/null"),
            )
            .await?;

        Ok(output
            .lines()
            .filter(|l| !l.is_empty())
            .map(|path| AnsiblePlaybook {
                name: std::path::Path::new(path)
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default(),
                path: path.to_string(),
                description: None,
            })
            .collect())
    }

    async fn run_ansible_playbook(
        &self,
        distro: &DistroName,
        playbook_path: &str,
        extra_vars: Option<String>,
    ) -> Result<String, DomainError> {
        let extra = extra_vars
            .as_deref()
            .map(|v| format!(" --extra-vars '{v}'"))
            .unwrap_or_default();
        self.wsl_manager
            .exec_in_distro(distro, &format!("ansible-playbook {playbook_path}{extra}"))
            .await
    }

    async fn get_k8s_cluster_info(
        &self,
        distro: &DistroName,
    ) -> Result<KubernetesCluster, DomainError> {
        let cluster_output = self
            .wsl_manager
            .exec_in_distro(distro, "kubectl cluster-info 2>/dev/null | head -2")
            .await
            .unwrap_or_default();

        let server = cluster_output
            .lines()
            .next()
            .and_then(|l| l.split("is running at ").nth(1))
            .unwrap_or("")
            .trim()
            .to_string();

        let context = self
            .wsl_manager
            .exec_in_distro(distro, "kubectl config current-context 2>/dev/null")
            .await
            .unwrap_or_default()
            .trim()
            .to_string();

        let nodes_output = self
            .wsl_manager
            .exec_in_distro(distro, "kubectl get nodes --no-headers 2>/dev/null")
            .await
            .unwrap_or_default();

        let nodes = parse_k8s_nodes(&nodes_output);

        let pod_count_str = self
            .wsl_manager
            .exec_in_distro(
                distro,
                "kubectl get pods --all-namespaces --no-headers 2>/dev/null | wc -l",
            )
            .await
            .unwrap_or_default();
        let pod_count: u32 = pod_count_str.trim().parse().unwrap_or(0);

        Ok(KubernetesCluster {
            context,
            server,
            nodes,
            pod_count,
        })
    }

    async fn get_k8s_pods(
        &self,
        distro: &DistroName,
        namespace: &str,
    ) -> Result<Vec<K8sPod>, DomainError> {
        let output = self
            .wsl_manager
            .exec_in_distro(
                distro,
                &format!("kubectl get pods -n {namespace} --no-headers 2>/dev/null"),
            )
            .await?;

        Ok(parse_k8s_pods(&output, namespace))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::ports::wsl_manager::MockWslManagerPort;
    use std::sync::atomic::{AtomicU32, Ordering};

    #[tokio::test]
    async fn test_detect_tools_all_present() {
        let mut mock = MockWslManagerPort::new();
        let call_count = Arc::new(AtomicU32::new(0));
        let cc = call_count.clone();
        mock.expect_exec_in_distro().returning(move |_, cmd| {
            cc.fetch_add(1, Ordering::SeqCst);
            if cmd.contains("ansible") {
                Ok("ansible 2.15.0\n".to_string())
            } else if cmd.contains("kubectl") {
                Ok("Client Version: v1.28.0\n".to_string())
            } else if cmd.contains("terraform") {
                Ok("Terraform v1.6.0\n".to_string())
            } else if cmd.contains("helm") {
                Ok("v3.13.0\n".to_string())
            } else {
                Ok(String::new())
            }
        });

        let adapter = IacCliAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let tools = adapter.detect_tools(&name).await.unwrap();

        assert!(tools.ansible_version.is_some());
        assert!(tools.kubectl_version.is_some());
        assert!(tools.terraform_version.is_some());
        assert!(tools.helm_version.is_some());
    }

    #[tokio::test]
    async fn test_detect_tools_none_present() {
        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(|_, _| Err(DomainError::WslCliError("not found".into())));

        let adapter = IacCliAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let tools = adapter.detect_tools(&name).await.unwrap();

        assert!(tools.ansible_version.is_none());
        assert!(tools.kubectl_version.is_none());
        assert!(tools.terraform_version.is_none());
        assert!(tools.helm_version.is_none());
    }

    #[tokio::test]
    async fn test_list_ansible_playbooks() {
        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro().returning(|_, _| {
            Ok("/home/user/playbooks/setup.yml\n/home/user/playbooks/deploy.yaml\n".to_string())
        });

        let adapter = IacCliAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let playbooks = adapter
            .list_ansible_playbooks(&name, "/home/user/playbooks")
            .await
            .unwrap();

        assert_eq!(playbooks.len(), 2);
        assert_eq!(playbooks[0].name, "setup");
        assert_eq!(playbooks[0].path, "/home/user/playbooks/setup.yml");
        assert_eq!(playbooks[1].name, "deploy");
    }

    #[tokio::test]
    async fn test_get_k8s_pods_parses_output() {
        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(|_, _| Ok("nginx-pod-abc   1/1   Running   3   5d\nredis-pod-xyz   1/1   CrashLoopBackOff   10   2d\n".to_string()));

        let adapter = IacCliAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let pods = adapter.get_k8s_pods(&name, "default").await.unwrap();

        assert_eq!(pods.len(), 2);
        assert_eq!(pods[0].name, "nginx-pod-abc");
        assert_eq!(pods[0].status, "Running");
        assert_eq!(pods[0].restarts, 3);
        assert_eq!(pods[0].namespace, "default");
        assert_eq!(pods[1].name, "redis-pod-xyz");
        assert_eq!(pods[1].restarts, 10);
    }

    #[tokio::test]
    async fn test_get_k8s_pods_empty() {
        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro()
            .returning(|_, _| Ok(String::new()));

        let adapter = IacCliAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let pods = adapter.get_k8s_pods(&name, "default").await.unwrap();
        assert!(pods.is_empty());
    }

    #[tokio::test]
    async fn test_get_k8s_cluster_info_parses() {
        let mut mock = MockWslManagerPort::new();
        mock.expect_exec_in_distro().returning(|_, cmd| {
            if cmd.contains("cluster-info") {
                Ok("Kubernetes control plane is running at https://127.0.0.1:6443\n".to_string())
            } else if cmd.contains("current-context") {
                Ok("minikube\n".to_string())
            } else if cmd.contains("get nodes") {
                Ok("minikube   Ready   control-plane,master\n".to_string())
            } else if cmd.contains("wc -l") {
                Ok("15\n".to_string())
            } else {
                Ok(String::new())
            }
        });

        let adapter = IacCliAdapter::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let cluster = adapter.get_k8s_cluster_info(&name).await.unwrap();

        assert_eq!(cluster.context, "minikube");
        assert!(cluster.server.contains("https://127.0.0.1:6443"));
        assert_eq!(cluster.nodes.len(), 1);
        assert_eq!(cluster.nodes[0].name, "minikube");
        assert_eq!(cluster.nodes[0].status, "Ready");
        assert_eq!(cluster.pod_count, 15);
    }
}
