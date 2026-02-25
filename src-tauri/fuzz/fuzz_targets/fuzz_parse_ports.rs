#![no_main]
use libfuzzer_sys::fuzz_target;
use wsl_nexus_lib::infrastructure::docker::adapter::DockerCliAdapter;

fuzz_target!(|data: &str| {
    let ports = DockerCliAdapter::parse_ports(data);
    for p in &ports {
        assert!(p.container_port <= u16::MAX);
    }
});
