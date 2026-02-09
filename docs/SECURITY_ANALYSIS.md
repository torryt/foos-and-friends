# Security Best Practices: Invite Flow & Authentication

## Overview

This document outlines security best practices for the Foos & Friends invite flow and magic link authentication system, providing recommendations for secure configuration and deployment.

## Current Authentication Configuration

**Supabase Auth Redirect URLs:**
- Foosball Production: `https://foos-and-friends.pages.dev/*`
- Padel Production: `https://padel-and-friends.pages.dev/*`
- Chess Production: `https://chess-and-friends.pages.dev/*`
- Development (Foosball): `http://localhost:5173/*`
- Development (Padel): `http://localhost:5174/*`
- Development (Chess): `http://localhost:5175/*`

## Invite Flow Architecture

### Current Flow
1. User clicks invite link: `/invite?code=ABC123`
2. Unauthenticated user clicks "Sign Up & Join" → navigates to `/?code=ABC123`
3. AuthForm detects `code=ABC123` in URL and constructs redirect: `https://<app>.pages.dev/?invite=ABC123`
4. Magic link email includes the redirect URL with invite parameter
5. User clicks magic link → lands on `/?invite=ABC123` on the appropriate app domain
6. GroupContext auto-joins user to the invited group (scoped by sport type)

## Security Considerations & Best Practices

### 1. **Redirect URL Configuration** 🔒 **IMPORTANT**

**Recommendation:** Use specific redirect URL patterns instead of wildcards for better security.

**Current Configuration:**
```
https://foos-and-friends.pages.dev/*
https://padel-and-friends.pages.dev/*
https://chess-and-friends.pages.dev/*
http://localhost:5173/*
http://localhost:5174/*
http://localhost:5175/*
```

**Alternative (More Restrictive):**
```
https://foos-and-friends.pages.dev/
https://foos-and-friends.pages.dev/invite
https://foos-and-friends.pages.dev/?invite=*
https://padel-and-friends.pages.dev/
https://padel-and-friends.pages.dev/invite
https://padel-and-friends.pages.dev/?invite=*
https://chess-and-friends.pages.dev/
https://chess-and-friends.pages.dev/invite
https://chess-and-friends.pages.dev/?invite=*
http://localhost:5173/
http://localhost:5173/invite
http://localhost:5173/?invite=*
http://localhost:5174/
http://localhost:5174/invite
http://localhost:5174/?invite=*
http://localhost:5175/
http://localhost:5175/invite
http://localhost:5175/?invite=*
```

### 2. **Invite Code Security**

**Best Practices:**
- Verify Supabase uses cryptographically secure random generation
- Consider implementing time-based expiration for invite codes
- Monitor invite code usage patterns
- Provide ability for group admins to revoke invite codes

### 3. **Magic Link Security**

**Recommendations:**
- Configure short expiration times (15-30 minutes)
- Ensure single-use enforcement
- Monitor unusual geographic access patterns
- Use secure email delivery practices

### 4. **Privacy & Access Control**

**Considerations:**
- Invite links should only be shared through trusted channels
- Implement proper data isolation between groups using RLS policies
- Audit invite code usage and member additions
- Provide clear group visibility controls

## Implementation Guidelines

### 1. **Authentication Security**

- Use secure redirect URL patterns in Supabase Auth configuration
- Implement proper session management
- Monitor authentication patterns for anomalies

### 2. **Data Protection**

- Implement Row Level Security (RLS) policies for complete data isolation
- Use parameterized queries to prevent injection attacks  
- Validate all user inputs on both client and server sides

### 3. **Access Controls**

- Implement proper authorization checks for all group operations
- Use principle of least privilege for database access
- Regular review of group memberships and permissions

### 4. **Content Security**

- Consider implementing Content Security Policy (CSP) headers
- Prevent iframe embedding if not needed
- Validate and sanitize all user-generated content

## Deployment Recommendations

### Production Environment
- Use HTTPS everywhere
- Implement proper error handling without exposing system details
- Regular security updates for all dependencies
- Monitor application logs for security events

### Database Security
- Enable RLS on all tables containing user data
- Use database connection pooling with proper authentication
- Regular database backups with encryption at rest

### Email Security
- Use reputable email service providers
- Implement proper SPF/DKIM records
- Monitor email delivery rates and security metrics

## Monitoring & Maintenance

### Regular Reviews
- Quarterly security assessment of authentication flows
- Review and update redirect URL configurations as needed
- Monitor invite code usage patterns
- Update dependencies and security patches

### Incident Response
- Maintain incident response plan for security events
- Log security-relevant events for analysis
- Regular backup and recovery testing

## Conclusion

Security should be considered throughout the development lifecycle. The current implementation uses industry-standard practices with Supabase authentication and proper data isolation through RLS policies.

Regular security reviews and staying updated with best practices will help maintain a secure application as it grows.

---

**Last Updated:** February 2026  
**Review Schedule:** Quarterly security review recommended