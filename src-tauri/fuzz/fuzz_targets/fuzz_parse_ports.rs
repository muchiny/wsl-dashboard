#![no_main]
use libfuzzer_sys::fuzz_target;
use wsl_nexus_lib::infrastructure::port_forwarding::adapter::parse_ss_output;

fuzz_target!(|data: &str| {
    // Must not panic on arbitrary `ss -tlnp` output.
    let ports = parse_ss_output(data);
    for p in &ports {
        // Exercise every parsed field (port is u16 by construction).
        let _ = (&p.protocol, &p.process, p.pid, p.port);
    }
});
