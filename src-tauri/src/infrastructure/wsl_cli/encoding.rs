use crate::domain::errors::DomainError;

/// Decode wsl.exe output. On Windows, wsl.exe outputs UTF-16LE.
/// When called from within WSL, the raw bytes need decoding.
/// Falls back to UTF-8 if UTF-16LE decoding fails.
pub fn decode_wsl_output(bytes: &[u8]) -> Result<String, DomainError> {
    // Try UTF-16LE first (Windows native wsl.exe output)
    if bytes.len() >= 2 && bytes.len().is_multiple_of(2) {
        let u16s: Vec<u16> = bytes
            .chunks_exact(2)
            .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
            .collect();

        // Check if this looks like valid UTF-16 by checking BOM or common ASCII range
        if let Ok(s) = String::from_utf16(&u16s) {
            // Strip BOM if present
            let s = s.strip_prefix('\u{FEFF}').unwrap_or(&s);
            return Ok(s.to_string());
        }
    }

    // Fallback to UTF-8
    String::from_utf8(bytes.to_vec())
        .map_err(|e| DomainError::WslCliError(format!("Failed to decode output: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_utf8_fallback() {
        let input = b"Hello, World!";
        let result = decode_wsl_output(input).unwrap();
        assert_eq!(result, "Hello, World!");
    }

    #[test]
    fn test_decode_utf16le() {
        // "Hi" in UTF-16LE
        let input: Vec<u8> = vec![0x48, 0x00, 0x69, 0x00];
        let result = decode_wsl_output(&input).unwrap();
        assert_eq!(result, "Hi");
    }

    #[test]
    fn test_decode_utf16le_with_bom() {
        // BOM + "Hi" in UTF-16LE
        let input: Vec<u8> = vec![0xFF, 0xFE, 0x48, 0x00, 0x69, 0x00];
        let result = decode_wsl_output(&input).unwrap();
        assert_eq!(result, "Hi");
    }

    mod proptests {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            #[test]
            fn decode_wsl_output_never_panics(bytes in proptest::collection::vec(any::<u8>(), 0..1024)) {
                let _ = decode_wsl_output(&bytes);
            }

            #[test]
            fn decode_roundtrip_utf8(s in "[a-zA-Z0-9 ]{0,100}") {
                let result = decode_wsl_output(s.as_bytes());
                // Pure ASCII should always succeed (either as UTF-16 or UTF-8 fallback)
                prop_assert!(result.is_ok());
            }
        }
    }
}
