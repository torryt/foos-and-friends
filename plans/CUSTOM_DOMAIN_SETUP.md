# Custom Domain Setup Plan
*Connect Namecheap domain to Cloudflare Pages with free SSL*

## Overview
This plan walks through connecting your Namecheap domain to your Cloudflare Pages deployment with automatic SSL certificate provisioning.

## Prerequisites
- ✅ Domain purchased from Namecheap
- ✅ Cloudflare Pages project deployed
- ✅ Cloudflare account (free tier sufficient)
- ⚠️ **Email service using same domain** (Brevo SMTP)

## Phase 1: Transfer Domain to Cloudflare DNS (Recommended)

### Why Transfer DNS to Cloudflare?
- **Free SSL certificates** (automatic provisioning and renewal)
- **Better performance** (CDN integration)
- **Advanced security features** (DDoS protection, WAF)
- **Simplified management** (domain + hosting in one place)
- **Better analytics** and caching controls

### Step 1: Add Domain to Cloudflare
1. Log into Cloudflare dashboard
2. Click **"Add a Site"**
3. Enter your domain name (e.g., `yourdomain.com`)
4. Select **Free plan**
5. Cloudflare will scan existing DNS records

⚠️ **Important**: Cloudflare will detect your existing email DNS records (MX, SPF, DKIM, DMARC) and import them automatically.

### Step 2: Update Nameservers at Namecheap
1. In Cloudflare, note the assigned nameservers (e.g., `blake.ns.cloudflare.com`)
2. Log into Namecheap account
3. Go to **Domain List** → **Manage** (your domain)
4. Navigate to **Nameservers** section
5. Select **"Custom DNS"**
6. Replace with Cloudflare nameservers:
   ```
   blake.ns.cloudflare.com
   raina.ns.cloudflare.com
   ```
7. Save changes

**⏱️ Propagation time:** 2-48 hours (usually within 2-4 hours)

### Step 3: Preserve Email DNS Records
**Critical for Brevo email delivery:**

#### Before DNS Transfer:
1. **Export current email DNS records** from Namecheap:
   ```bash
   # Check current email records
   dig MX yourdomain.com
   dig TXT yourdomain.com | grep -E "(spf|dkim|dmarc)"
   ```

2. **Document Brevo-specific records:**
   - MX records (mail routing)
   - SPF record (`v=spf1 include:smtp-relay.brevo.com ~all`)
   - DKIM records (for authentication)
   - DMARC policy record

#### After DNS Transfer to Cloudflare:
1. **Verify all email records imported correctly**
2. **Add any missing Brevo records manually:**

**Required Brevo DNS Records:**
```dns
# MX Record (if using Brevo for receiving)
MX    @    1  smtp-relay.brevo.com

# SPF Record (required for sending)
TXT   @    "v=spf1 include:smtp-relay.brevo.com ~all"

# DKIM Record (get from Brevo dashboard)
TXT   brevo._domainkey    "v=DKIM1; k=rsa; p=YOUR_DKIM_PUBLIC_KEY"

# DMARC Policy (recommended)
TXT   _dmarc    "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
```

⚠️ **Critical**: Set email DNS records to **DNS-only** (gray cloud) in Cloudflare, not proxied.

### Step 4: Verify DNS Transfer
- Use `nslookup` or online DNS checker
- Confirm nameservers point to Cloudflare
- Cloudflare dashboard will show "Active" status
- **Test email delivery** after propagation

## Phase 2: Connect Domain to Cloudflare Pages

### Step 1: Add Custom Domain in Pages
1. Go to **Cloudflare Dashboard** → **Pages**
2. Select your deployed project
3. Go to **Custom domains** tab
4. Click **"Set up a custom domain"**
5. Enter your domain: `yourdomain.com`
6. Optionally add `www.yourdomain.com` as well

### Step 2: Configure DNS Records
Cloudflare will automatically create required DNS records:
```
Type: CNAME
Name: yourdomain.com (or www)
Target: your-project.pages.dev
Proxy: ✅ Enabled (orange cloud)
```

### Step 3: SSL Certificate Provisioning
- **Automatic**: Cloudflare provisions SSL certificates within 15 minutes
- **Type**: Universal SSL (covers both apex and www)
- **Renewal**: Automatic (90-day Let's Encrypt certificates)
- **Validation**: HTTP-01 challenge (handled automatically)

## Phase 3: Optimization & Security

### Step 1: SSL/TLS Settings
1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **"Full (strict)"**
3. Enable **"Always Use HTTPS"**
4. Enable **"HTTP Strict Transport Security (HSTS)"**

### Step 2: Performance Optimization
```
Speed → Optimization:
✅ Auto Minify (HTML, CSS, JS)
✅ Brotli compression
✅ Early Hints

Caching → Configuration:
✅ Browser Cache TTL: 4 hours
✅ Always Online: On
```

### Step 3: Security Headers
Add security rules in **Rules** → **Transform Rules**:
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## Phase 4: Domain Configuration Best Practices

### Root Domain vs WWW
**Recommended setup:**
- Primary: `yourdomain.com` (apex domain)
- Redirect: `www.yourdomain.com` → `yourdomain.com`

**Configuration:**
1. Add both domains to Pages custom domains
2. Set up 301 redirect rule:
   ```
   If: hostname equals "www.yourdomain.com"
   Then: redirect to "https://yourdomain.com"
   ```

### DNS Record Verification
Final DNS setup should look like:
```
A     @     192.0.2.1     (Cloudflare proxy IP)
CNAME www   yourdomain.com
```

## Phase 5: Testing & Validation

### Email Delivery Testing (Critical!)
```bash
# Test email DNS records
dig MX yourdomain.com
dig TXT yourdomain.com | grep spf
dig TXT brevo._domainkey.yourdomain.com

# Test email deliverability
# Send test email through Brevo API/dashboard
```

**Email Testing Checklist:**
- [ ] Send test email from Brevo dashboard
- [ ] Check email reaches inbox (not spam)
- [ ] Verify SPF, DKIM, DMARC pass
- [ ] Test from your application's email functionality
- [ ] Monitor Brevo logs for delivery issues

**Tools for Email Validation:**
- **Mail-tester.com** - Complete email deliverability test
- **MXToolbox.com** - DNS and blacklist checking
- **DMARC Analyzer** - DMARC policy validation

### SSL Certificate Verification
```bash
# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Verify SSL grade
# Visit: https://www.ssllabs.com/ssltest/
```

### Performance Testing
```bash
# Test loading speed
curl -w "@curl-format.txt" -o /dev/null -s "https://yourdomain.com"

# Check PageSpeed Insights
# Visit: https://pagespeed.web.dev/
```

### DNS Propagation Check
```bash
# Check DNS propagation globally
dig yourdomain.com @8.8.8.8
dig yourdomain.com @1.1.1.1

# Online tool: https://dnschecker.org/
```

## Troubleshooting Guide

### Common Issues

#### 1. "SSL Certificate Not Valid"
**Symptoms:** Browser shows "Not Secure"
**Solution:**
- Wait 15-30 minutes for certificate provisioning
- Check SSL/TLS settings in Cloudflare
- Verify domain is proxied (orange cloud)

#### 2. "DNS Resolution Failed"
**Symptoms:** Domain doesn't resolve
**Solutions:**
- Confirm nameserver propagation (24-48h)
- Check DNS records in Cloudflare
- Flush local DNS cache: `ipconfig /flushdns`

#### 3. "Redirect Loop"
**Symptoms:** Too many redirects error
**Solutions:**
- Set SSL mode to "Full (strict)"
- Disable conflicting redirect rules
- Check origin server SSL configuration

#### 4. "Domain Not Found"
**Symptoms:** 404 error on custom domain
**Solutions:**
- Verify Pages custom domain configuration
- Check CNAME record points to `*.pages.dev`
- Ensure domain is added in Pages dashboard

#### 5. "Email Delivery Issues"
**Symptoms:** Emails not sending or going to spam
**Solutions:**
- Verify SPF record includes Brevo: `include:smtp-relay.brevo.com`
- Check DKIM record is correctly configured
- Ensure MX records are DNS-only (gray cloud)
- Test email authentication at mail-tester.com
- Monitor Brevo dashboard for bounce/spam reports

#### 6. "DKIM Authentication Failed"
**Symptoms:** Email authentication failures
**Solutions:**
- Get correct DKIM public key from Brevo dashboard
- Ensure DKIM TXT record name is exact: `brevo._domainkey`
- Wait for DNS propagation (up to 48 hours)
- Test DKIM with `dig TXT brevo._domainkey.yourdomain.com`

### Support Resources
- **Cloudflare Community:** https://community.cloudflare.com/
- **Cloudflare Docs:** https://developers.cloudflare.com/pages/
- **DNS Propagation Checker:** https://dnschecker.org/
- **SSL Test:** https://www.ssllabs.com/ssltest/

## Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Namecheap Domain | $8-15/year | Varies by TLD |
| Cloudflare Pages | **FREE** | Unlimited bandwidth |
| SSL Certificate | **FREE** | Auto-provisioned |
| DNS Hosting | **FREE** | Cloudflare DNS |
| CDN & Security | **FREE** | Global CDN included |
| **Total** | **$8-15/year** | Just domain renewal cost |

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| DNS Transfer | 2-48 hours | Nameserver propagation |
| Domain Connection | 5-15 minutes | DNS active in Cloudflare |
| SSL Provisioning | 15-30 minutes | Domain validation |
| Optimization | 30 minutes | Manual configuration |
| **Total Setup Time** | **1-2 hours** | Plus propagation wait |

## Security Benefits

✅ **Free SSL/TLS certificates** (Let's Encrypt)  
✅ **DDoS protection** (10+ Tbps capacity)  
✅ **Web Application Firewall** (WAF)  
✅ **Bot protection** and rate limiting  
✅ **DNSSEC** for DNS security  
✅ **Always HTTPS** redirects  

## Next Steps After Setup

1. **Set up analytics** (Cloudflare Web Analytics)
2. **Configure caching rules** for optimal performance
3. **Set up monitoring** (uptime alerts)
4. **Add security rules** (country blocking, rate limiting)
5. **Optimize images** (Cloudflare Image Optimization - paid)

## Alternative: DNS-Only Setup (Not Recommended)

If you prefer to keep Namecheap DNS:

### Limitations
- ❌ No free SSL from Cloudflare
- ❌ No CDN benefits
- ❌ Manual SSL certificate management required
- ❌ Reduced security features

### Steps (Not Recommended)
1. Keep Namecheap nameservers
2. Add CNAME record: `www IN CNAME your-project.pages.dev`
3. Add A record for apex domain (requires paid Cloudflare plan)
4. Purchase SSL certificate separately ($10-50/year)

**💡 Recommendation:** Use Phase 1 approach for free SSL and better performance.

---

## Quick Start Checklist

### Domain & DNS Setup
- [ ] **Document existing email DNS records** (MX, SPF, DKIM)
- [ ] Add domain to Cloudflare
- [ ] **Verify email records imported correctly**
- [ ] **Add missing Brevo email records if needed**
- [ ] Update nameservers at Namecheap  
- [ ] **Ensure email DNS records are DNS-only (gray cloud)**
- [ ] Wait for DNS propagation (2-24 hours)

### Website Setup  
- [ ] Add custom domain in Cloudflare Pages
- [ ] Verify SSL certificate provisioning
- [ ] Set SSL mode to "Full (strict)"
- [ ] Enable "Always Use HTTPS"
- [ ] Test domain resolution and SSL

### Email Verification (Critical!)
- [ ] **Send test email from Brevo dashboard**
- [ ] **Verify email delivery and authentication**
- [ ] **Test application email functionality**
- [ ] **Check spam score at mail-tester.com**

### Optimization
- [ ] Set up performance optimizations
- [ ] Configure security headers

**🎉 Result:** Professional domain with free SSL, CDN, enterprise-grade security, AND working email delivery!