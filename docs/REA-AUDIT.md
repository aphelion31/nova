# REA Shipped-Artifact Inspection & Release Audit (`nova` v1.0.0)

Recorded using REA MCP tools against the compiled `nova` release binary (`target/release/nova`) and built React Router 8 PWA bundle (`web/build/client`).

## 1. Release Binary Hardening (`target/release/nova`)

- **Evidence ID**: `ev_ac14ca1e879f13dc330f8a8acfcd6571e9deda2c809afa6eb6c2d82c588ad167`
- **Format / Arch**: Mach-O `arm64` (64-bit, `11,990,832` bytes / `11.44 MiB`)
- **SHA-256**: `7beaa33c3b866bbb68693858674a0665a280cd97e69d06148d3150b6259545c4`

| Property | State | Basis |
| --- | --- | --- |
| `pie` (ASLR) | `enabled` | `MH_PIE` is set |
| `allow_stack_execution` | `disabled` | `MH_ALLOW_STACK_EXECUTION` is clear |
| `no_heap_execution` | `disabled` | `MH_NO_HEAP_EXECUTION` is clear |
| `restrict_segment` | `disabled` | No `__RESTRICT` segment |
| `stack_protector` | `enabled` | Undefined symbol `___stack_chk_fail` is present |
| `code_signature_present` | `enabled` | `LC_CODE_SIGNATURE` load command is present |
| `encrypted` | `disabled` | No `LC_ENCRYPTION_INFO` command present |
| `hardened_runtime` | `unknown` | `CodeDirectory` flags belong to `inspect_signature` |

## 2. Release Exposure Audits

### Rust Binary (`target/release/nova`)
- **Evidence ID**: `ev_3aae1e9fb9feb58e4030b822193f8503b209736634c7256f6ec51cc9b264b01d`
- **Result**: `exposed: 0`, `no_exposure_observed_in_assessed_checks: true` (`not_observed: 4`, `not_applicable: 6`, `unknown: 2`, `not_assessed: 3`) — zero `.dSYM`, `.pdb`, debug companions, or embedded JS source maps.

### React Router 8 PWA Bundle (`web/build/client`)
- **Evidence ID**: `ev_bd5dddf91bd4fc57140f6077e39e2fca87acf4f0f166e588beea2bc74ad0b9c0`
- **SHA-256**: `3c36b2736bba661f4c99a1bc1d8350b00b86c046f5dd9dd1797f5baae0d15f12`
- **Result**: `exposed: 0`, `no_exposure_observed_in_assessed_checks: true` (`22` scanned text members, `0` credential markers exposed).

### Embedded Crate Metadata Probe (`inspect_rust_binary`)
- **Evidence ID**: `ev_fe0a3fc1bd790642a37d9090fc1c5e809e2a8c6117c6c1a8b14141a7b579e839`
- **Observation**: Stripped release binary (`11,990,832` bytes), zero `.dep-v0` (`cargo-auditable`) dependency list shipped inside the binary; inferred `rustc` commit `88d9e12ae178fab0fb5cc050a94da85685d449ea` at offset `8570040`.
