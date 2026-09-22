# UIDAI / Aadhaar Authentication Architecture

## 1. Compliance Principles
According to the Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016 and UIDAI Authentication API v2.5 Specifications:

1. **Explicit Informed Consent**: An informed consent dialogue must be presented to the resident in English and scheduled vernacular languages prior to capturing Aadhaar or requesting OTP.
2. **Data Minimization & Redaction**:
   - Raw 12-digit Aadhaar numbers must **NEVER** be persisted in databases or written to application logs.
   - Only masked representation (`XXXXXXXX1234`) or irreversible salted SHA-256 hashes are logged for correlation.
   - OTP values are strictly ephemeral in memory (< 10 min), never written to disks or logs.
3. **No Fabrication Rule**:
   - The platform never fabricates fake Aadhaar authentication success responses.
   - If AUA/KUA credentials, ASA leased line, or SSL client certificates are unconfigured, the system explicitly returns:
     `"UIDAI authentication integration is not configured or authorized in this environment."`

## 2. AUA / KUA / ASA Network Topology

```
Resident Client (Voter)
        │
        ▼ (TLS 1.3 / HTTPS)
National E-Voting Backend (AUA - Authentication User Agency)
        │
        │ Signs payload using AUA Private Key (XML-DSig / PKCS#7)
        ▼ (Dedicated VPN / Leased Line)
Authentication Service Agency (ASA)
        │
        ▼ (UIDAI CIDR Gateway)
UIDAI Central Identities Data Repository (CIDR)
        │
        ├── Generates SMS/Email OTP to Resident's registered mobile
        └── Verifies Auth Token & Digital Signature
```

## 3. Configuration Parameters (.env)
```env
UIDAI_ENVIRONMENT=sandbox # Options: 'unconfigured' | 'sandbox' | 'production'
UIDAI_ENABLE=false
UIDAI_AUTH_URL=https://developer.uidai.gov.in/auth/2.5
UIDAI_OTP_URL=https://developer.uidai.gov.in/otp/2.5
UIDAI_AUA_CODE=AUA_DEMO_001
UIDAI_SUB_AUA_CODE=SUB_AUA_001
UIDAI_LICENSE_KEY=TEST_LICENSE_KEY_HEX
UIDAI_CERTIFICATE_PATH=/etc/ssl/uidai/uidai_auth.cer
UIDAI_PRIVATE_KEY_PATH=/etc/ssl/uidai/aua_private.pem
```
