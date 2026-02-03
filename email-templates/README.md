# Supabase Email Templates
This repository contains customized email templates for Supabase authentication emails, designed to be used for both a foosball game tracking app and a padel game tracking app. The templates include confirmation emails, magic link emails, and password recovery emails.

## Implementation Instructions

### Setting up in Supabase Dashboard

1. **Navigate to Authentication → Email Templates**
2. **For each template (Confirm signup, Magic Link, Recovery):**
   - Select the template type
   - Replace the default HTML with the code above
   - Update the subject line
   - Save the template

### Template Variables

Supabase provides these variables for email templates:
- `{{ .ConfirmationURL }}` - The confirmation/action URL
- `{{ .Token }}` - The confirmation token
- `{{ .TokenHash }}` - The token hash
- `{{ .SiteURL }}` - Your site URL
- `{{ .RedirectTo }}` - Redirect URL (if provided)

### Customization Notes

- **Colors**: Templates use a neutral blue (#3b82f6) to indigo (#6366f1) gradient that works for both apps
- **Typography**: Uses system fonts for consistency and readability
- **Mobile-friendly**: Responsive design that works on all devices
- **Accessibility**: High contrast ratios and semantic HTML
- **Security**: Clear security notes and expiration information
- **Branding**: Uses generic "Game Tracker" name that applies to both foosball and padel apps