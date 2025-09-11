# Hosting & SMTP Plan for Foosball App

**Date**: January 2025  
**Status**: Approved  
**Focus**: EU-hosted, simple, cheap, no custom domain needed

## Executive Summary

Two-phase approach: Start completely free with static hosting, then add service layer when needed. EU-focused providers prioritized for GDPR compliance and performance.

## Requirements Analysis

- **Current**: React + Vite static build with Supabase backend
- **Future**: Potential custom service layer (APIs, background jobs)
- **Geography**: EU hosting preferred
- **Budget**: Minimize costs, start free
- **Domain**: No custom domain required initially
- **Email**: SMTP for Supabase magic link authentication

## Research Findings

### Hosting Options Evaluated

| Platform | EU Coverage | Static Free | Service Layer | Monthly Cost |
|----------|-------------|-------------|---------------|--------------|
| Cloudflare Pages | Excellent | ✅ Unlimited | ❌ (Workers only) | €0 |
| Vercel | Good | ✅ 100GB | ✅ Functions | €0 → €20+ |
| Netlify | Good | ✅ 100GB | ✅ Functions | €0 → €19+ |
| Railway | Working on EU | ❌ ($5 credit) | ✅ Full stack | €5/month |
| Render | ✅ EU regions | ✅ Static free | ✅ Services | €7/month |
| Fly.io | ✅ Multiple EU | ✅ $5 credit | ✅ Global edge | €5/month |

### SMTP Options Evaluated

| Provider | EU Focus | Free Tier | Monthly Cost | Notes |
|----------|----------|-----------|--------------|-------|
| Brevo | ✅ Popular in EU | 300/day | €0 | GDPR compliant |
| Mailtrap | Good EU support | 3,500/month | €0 | Dev + production |
| Mailgun | Global | 100/day | €0 | Developer-focused |
| SendGrid | Global | 100/day | €0 → €20 | High paid tier threshold |

## Recommended Solution

### Phase 1: Free Static Hosting (Current)

```yaml
Architecture:
  Frontend: Cloudflare Pages (Free)
  Backend: Supabase (Existing)
  Email: Brevo SMTP (Free, EU-focused)
  
Monthly Cost: €0

Benefits:
  - Start immediately with zero costs
  - Excellent EU performance via Cloudflare's network
  - GDPR-compliant email provider popular with EU businesses
  - Scales to significant traffic on free tiers
```

### Phase 2: Add Service Layer (Future)

**Option A: Railway (Best Developer Experience)**
```yaml
Architecture:
  Frontend: Cloudflare Pages (Continue free)
  Services: Railway ($5/month)
  Backend: Supabase (Continue)
  Email: Brevo (Continue free)
  
Monthly Cost: €5
EU Status: EU regions planned, currently US-based
```

**Option B: Render (EU Regions Available)**
```yaml
Architecture:
  Frontend: Cloudflare Pages (Continue free)  
  Services: Render ($7/month)
  Backend: Supabase (Continue)
  Email: Brevo (Continue free)
  
Monthly Cost: €7
EU Status: EU regions available now
```

**Option C: Fly.io (Best EU Coverage)**
```yaml
Architecture:
  Frontend: Cloudflare Pages (Continue free)
  Services: Fly.io ($5/month credit)
  Backend: Supabase (Continue)
  Email: Brevo (Continue free)
  
Monthly Cost: €5
EU Status: Multiple EU regions (Frankfurt, Amsterdam)
```

## Implementation Roadmap

### Phase 1 Implementation (Immediate)

1. **Week 1**: Deploy to Cloudflare Pages
   - Connect GitHub repository
   - Configure build settings (npm run build → dist)
   - Add Supabase environment variables
   - Test production deployment

2. **Week 1**: Configure Brevo SMTP
   - Create Brevo account (free tier)
   - Generate SMTP credentials
   - Configure Supabase Auth with Brevo SMTP
   - Test magic link emails

3. **Week 1**: Validation
   - Test full user authentication flow
   - Verify EU performance and latency
   - Monitor email deliverability

### Phase 2 Planning (Future)

**Trigger Conditions for Phase 2:**
- Need for custom API endpoints beyond Supabase
- Background job processing requirements
- Advanced rate limiting or middleware
- Custom authentication flows

**Migration Strategy:**
- Keep Cloudflare Pages for frontend (zero downtime)
- Deploy service layer to chosen platform
- Update frontend to call new API endpoints
- Gradual migration of logic from client to server

## Risk Assessment

### Low Risks
- **Vendor Lock-in**: Minimal due to standard technologies (React, Node.js, SQL)
- **Scalability**: All recommended platforms handle significant scale
- **EU Compliance**: Brevo and EU-region providers address data residency

### Medium Risks  
- **Railway EU Availability**: Currently US-based, EU regions planned
- **Free Tier Limitations**: May hit limits with growth, but predictable upgrade paths
- **SMTP Deliverability**: Free tiers may have reputation challenges at scale

### Mitigation Strategies
- **Multi-provider Strategy**: Start with Cloudflare + Brevo, easy to switch service layers
- **Monitoring**: Set up alerts for approaching free tier limits
- **Email Strategy**: Brevo has good reputation, can upgrade to paid tier or switch providers

## Success Metrics

### Phase 1 Success Criteria
- [ ] App deployed and accessible via HTTPS
- [ ] Email authentication working reliably
- [ ] EU users experience < 500ms initial load time
- [ ] Zero monthly hosting costs maintained

### Phase 2 Success Criteria  
- [ ] Service layer deployed with < 5 minute setup time
- [ ] API endpoints responding with < 200ms latency from EU
- [ ] Monthly costs remain under €10
- [ ] Zero downtime migration from Phase 1

## Alternative Scenarios

### High Traffic Scenario
If the app gains significant traction:
- **Cloudflare Pages**: Scales automatically, remains free
- **Brevo**: Upgrade to paid tier (reasonable pricing)
- **Service Layer**: All recommended options scale well

### EU Regulation Changes
If stricter EU data residency required:
- **Render**: Already has EU regions
- **Fly.io**: Multiple EU locations
- **Railway**: Switch when EU regions available

### Budget Constraints
If costs become a concern:
- **Hybrid Cloud**: Use EU providers only for EU users
- **Self-hosted**: Migrate to VPS (DigitalOcean, Hetzner)
- **Open Source**: Consider alternatives like Appwrite

## Decision Log

**2025-01-XX**: Approved two-phase approach prioritizing free start with upgrade path  
**Reasoning**: Minimize initial investment while maintaining flexibility for growth

**2025-01-XX**: Selected Brevo over other SMTP providers  
**Reasoning**: EU focus, GDPR compliance, generous free tier, good reputation

**2025-01-XX**: Selected Cloudflare Pages for Phase 1  
**Reasoning**: Best free tier, excellent EU performance, unlimited bandwidth

## Next Steps

1. **Immediate**: Implement Phase 1 deployment
2. **Monitor**: Track usage against free tier limits  
3. **Evaluate**: Assess Phase 2 trigger conditions monthly
4. **Review**: Revisit plan quarterly as EU region availability changes

---

*This plan prioritizes cost efficiency, EU compliance, and smooth scaling path while maintaining technical flexibility.*