# 🛡️ Payroll Insight Pro — Production Deployment & DDoS Defense Guide

Comprehensive architecture and deployment guide to protect the **Payroll Insight Pro** API against **DDoS attacks**, **brute force attempts**, **over-requests**, and **multi-device session hijacking**.

---

## 🏛️ 4-Layer Defense-in-Depth Architecture

```
Internet Traffic
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Edge / CDN Layer (Cloudflare WAF / AWS Shield)           │
│    - Absorbs Layer 3/4 volumetric floods (SYN/UDP floods)   │
│    - Web Application Firewall (WAF) & Bot Fight Mode        │
│    - Geographic IP filtering & Cloudflare Turnstile CAPTCHA │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Reverse Proxy Layer (Nginx on Port 443)                  │
│    - Mitigates Slowloris (limit_conn max 20 connections/IP) │
│    - Enforces 30 MB maximum payload ceiling                │
│    - Leaky-bucket rate limiter: 2r/s (general), 20r/m (auth)│
│    - Drops slow headers/bodies (client_body_timeout 10s)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Host Firewall & Automated Banning (Fail2ban + iptables)  │
│    - Monitors /var/log/nginx/access.log                     │
│    - Automatically bans IPs with 10+ 429/401s for 1 hour    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Ktor Application Layer (Port 8080)                       │
│    - Ktor 3.0 RateLimit plugin:                             │
│      * Auth: 10 requests / 30 seconds per IP                │
│      * Excel Uploads: 10 uploads / 60 seconds per IP        │
│      * General API: 120 requests / 60 seconds per IP        │
│    - Single Active Session per user (logs out other devices)│
│    - Bounded pagination (default: 10 items/page)            │
│    - 30 MB max upload validator                             │
│    - HikariCP pool isolation & query timeouts               │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Cloudflare WAF Setup (Edge Layer)

1. **DNS & Proxying:**
   - Point your domain's `A` record (e.g. `api.payroll.institution.gov`) to your VPS IP address and set the proxy status to **Proxied (Orange Cloud)**.
2. **WAF Rate Limiting Rule:**
   - Go to **Security > WAF > Rate Limiting Rules**.
   - Create rule:
     - URL matches `*/api/auth/login*`
     - Rate: Exceeds 10 requests per 1 minute
     - Action: **Block** for 10 minutes or **Managed Challenge**.
3. **Bot Fight Mode:**
   - Enable **Bot Fight Mode** to drop automated scrapers and headless browsers automatically.
4. **Geographic Filtering:**
   - If the platform is strictly for government / institutional staff in a specific country (e.g. Iraq), add a WAF Custom Rule:
     - If `ip.geoip.country ne "IQ" and not (ip.src in $institutional_vpn_ips)` ➔ Action: **Block**.

---

## 2. Nginx Deployment (Reverse Proxy Layer)

1. Copy [`nginx/payroll_api.conf`](file:///c:/Users/Ahmed/.gemini/antigravity-ide/scratch/payroll-insight-pro/nginx/payroll_api.conf) to `/etc/nginx/sites-available/payroll_api.conf`.
2. Symlink to sites-enabled:
   ```bash
   sudo ln -s /etc/nginx/sites-available/payroll_api.conf /etc/nginx/sites-enabled/
   ```
3. Test and reload:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 3. Fail2ban Setup (Automated Host Firewall)

1. Copy the jail configuration:
   - Copy [`fail2ban/jail.d/payroll-api.conf`](file:///c:/Users/Ahmed/.gemini/antigravity-ide/scratch/payroll-insight-pro/fail2ban/jail.d/payroll-api.conf) to `/etc/fail2ban/jail.d/payroll-api.conf`.
2. Copy the filter configuration:
   - Copy [`fail2ban/filter.d/payroll-api.conf`](file:///c:/Users/Ahmed/.gemini/antigravity-ide/scratch/payroll-insight-pro/fail2ban/filter.d/payroll-api.conf) to `/etc/fail2ban/filter.d/payroll-api.conf`.
3. Reload Fail2ban:
   ```bash
   sudo fail2ban-client reload
   sudo fail2ban-client status payroll-api
   ```

---

## 4. Single Active Session (Multi-Device Logout)

The platform enforces **strict single-session concurrency**:
- When User `A` logs in on Device 2:
  1. A new unique session ID (`newSessionId`) is generated.
  2. All existing refresh tokens for User `A` are immediately marked `is_revoked = true` in PostgreSQL.
  3. `SessionManager` and `UsersTable.active_session_id` are updated with the new session ID.
  4. Any subsequent API request made by Device 1 (using the old access token or refresh token) is rejected with **`HTTP 401 Unauthorized`**:
     ```json
     {
       "success": false,
       "message": "Access denied. Authentication required, session expired, or your account was logged in from another device."
     }
     ```
  5. Only Device 2 remains active.

---

## 5. Rate Limiting Reference Table

| Target Endpoints | Limit | Window | Action on Exceeded |
|---|---|---|---|
| **`/api/auth/login`**, **`/api/auth/refresh`** | **10 requests** | **30 seconds** | HTTP 429 Too Many Requests (`Retry-After: 30`) |
| **`/api/employees/upload-excel`** | **10 requests** | **60 seconds** | HTTP 429 Too Many Requests (`Retry-After: 60`) |
| **All Other `/api/*` Routes** | **120 requests** | **60 seconds** | HTTP 429 Too Many Requests (`Retry-After: 60`) |
| **File Upload Size** | **30 MB** | Per Request | HTTP 413 Payload Too Large |
