# Security Policy — DevFlow AI

DevFlow AI is built to handle sensitive enterprise codebases, automated AI patch generation, and multi-tenant engineering workloads. Security is a primary design constraint across all architectural tiers.

---

## 1. Supported Versions

| Version | Supported | Security Patches |
| :--- | :--- | :--- |
| **1.0.x (Current Release)** | :white_check_mark: | Active Continuous Updates |
| **< 1.0.0 (Beta / Preview)** | :x: | End of Life (Upgrade to 1.0.x) |

---

## 2. Reporting a Vulnerability

We take the security of our platform seriously. If you discover a security vulnerability in DevFlow AI, **please do not open a public GitHub issue**.

### Responsible Disclosure Protocol:
1. Email your findings directly to our Security Team at:  
   **`security@devflow.ai`**
2. Include the following details in your report:
   - Vulnerability classification (e.g., SSRF, SQL Injection, Auth Bypass, Privilege Escalation, Sandbox Escape).
   - Component affected (`apps/api`, `apps/web`, `apps/ai-service`, `infrastructure`).
   - Detailed step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
   - Potential impact on tenant isolation, data confidentiality, or execution integrity.
3. Our security team will acknowledge receipt of your report within **24 hours** and provide a timeline for remediation.

---

## 3. Platform Security Architecture & Guardrails

DevFlow AI implements layered defense-in-depth security:

### A. Authentication & Multi-Tenant Isolation
* **Multi-Tenant Scoping**: All database queries strictly enforce `workspace_id` tenant isolation at the repository layer.
* **Role-Based Access Control (RBAC)**: Strict permissions enforced across `ADMIN`, `DEVELOPER`, and `VIEWER` roles.
* **Cryptographic Token Rotation**: Short-lived JWT access tokens (15m) paired with single-use rotating refresh tokens (7d) stored with SHA-256 hashes.

### B. Autonomous Agent & Code Sandbox Safety
* **Zero Arbitrary Shell Execution**: Arbitrary commands (`rm -rf`, `curl`, `bash -i`, `powershell`) are strictly prohibited and blocked by AST validators.
* **Virtual Sandbox Isolation**: Test and linter executions run inside isolated containers with strict CPU limits (1.0 Core), memory quotas (512MB), timeouts (15s), and network egress restrictions.
* **Execution Guardrails**: Hard limits on maximum ReAct iterations (20 steps) and total execution time (300s).

### C. SSRF & Network Defenses
* Outbound webhook and repository integration URLs are validated by `SsrfProtectionService`.
* Blocks loopbacks (`127.0.0.1`, `localhost`), cloud metadata services (`169.254.169.254`, `metadata.google.internal`), private subnets (RFC 1918), and unsafe schemes (`file://`, `gopher://`).

### D. Secret Sanitization & Zero Plaintext Secrets
* `SecretSanitizerInterceptor` recursively scrubs private keys, API keys (`sk-***`, `ghp_***`), and tokens from all outbound REST responses.
* `.env` and credential files are strictly git-ignored. All production secrets are managed via AWS Secrets Manager or KMS.

---

## 4. Automated Security Scanning in CI/CD

Every commit and pull request undergoes automated security scanning:
* **Gitleaks**: Scans commit history for hardcoded secrets and private keys.
* **Trivy**: Scans container images and filesystems for CVE vulnerabilities.
* **CodeQL**: Static Application Security Testing (SAST) for semantic vulnerability patterns.
* **pip-audit & npm audit**: Continuous software supply-chain dependency auditing.
