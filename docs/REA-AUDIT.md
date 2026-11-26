# REA Shipped-Artifact Inspection & Release Audit (`nova` v0.1.0)

Recorded using REA MCP tools against the compiled `nova` release binary (`target/release/nova`) and built React Router 8 PWA bundle (`web/build/client`).

## 1. Release Binary Hardening (`target/release/nova`)

- **Evidence ID**: `ev_acf8782e55536456351a99865da4d9669ab0ccdb8f814ceffe45769def23e288`
- **Format / Arch**: Mach-O `arm64` (64-bit, `11,990,832` bytes / `11.44 MiB`)
- **SHA-256**: `a1b65972f7a6709d65020e1f3f06c3fc2923f91bf0eb083e622ecb68e3f3405e`

| Property | State | Basis |
| --- | --- | --- |
| `pie` (ASLR) | `enabled` | `MH_PIE` is set |
| `allow_stack_execution` | `disabled` | `MH_ALLOW_STACK_EXECUTION` is clear |
| `no_heap_execution` | `disabled` | `MH_NO_HEAP_EXECUTION` is clear |
| `stack_protector` | `enabled` | Undefined symbol `___stack_chk_fail` present |
| `code_signature_present` | `enabled` | `LC_CODE_SIGNATURE` load command present |
| `encrypted` | `disabled` | No `LC_ENCRYPTION_INFO` command present |

## 2. Release Exposure Audits

### Rust Binary (`target/release/nova`)
- **Evidence ID**: `ev_422a71e0ddb4a5127abc44e7ddbfb2a46ae89acebb4bac8b3b9b7aa700e67c65`
- **Result**: `exposed: 0`, `no_exposure_observed_in_assessed_checks: true` (`not_observed: 4`, `not_applicable: 6`, `unknown: 2`, `not_assessed: 3`) — zero `.dSYM`, `.pdb`, debug companions, or embedded JS source maps.

### React Router 8 PWA Bundle (`web/build/client`)
- **Evidence ID**: `ev_509b69b4ab7e9ec504edfcb09b30ff1682f9b7823bce16657180e44577c7c445`
- **SHA-256**: `003067e38db0d53bc3d4eff17f5998edb71e4adc7258f92a9545d39aed0b57fa`
- **Result**: `exposed: 0`, `no_exposure_observed_in_assessed_checks: true` (`22` members scanned, `0` credential markers exposed).

### Embedded Crate Metadata Probe (`inspect_rust_binary`)
- **Evidence IDs**: `ev_3581b562dd2fd1041b4784506b4c25348ad8da65e6b60bdc970c6d668fb103b2` / view `ev_9ff8a13c76efe3e0be246ec9010b78db2306e30d982ddb5926b0099c6a38853b`
- **Observation**: Stripped release binary (`11,990,832` bytes), zero `.dep-v0` (`cargo-auditable`) dependency list shipped inside the binary.
