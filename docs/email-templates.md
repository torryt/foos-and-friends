# Supabase Email Templates

## Magic Link Email Template

**Subject:** Sign in to Foos & Friends

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in to Foos & Friends</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
            padding: 32px 24px;
            text-align: center;
        }
        .logo {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: white;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin: 0;
        }
        .content {
            padding: 32px 24px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #111827;
        }
        .message {
            margin-bottom: 32px;
            color: #6b7280;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 24px;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-1px);
        }
        .alternative-link {
            background-color: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            margin-top: 24px;
            font-size: 14px;
            color: #6b7280;
            word-break: break-all;
        }
        .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #9ca3af;
        }
        .security-note {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px;
            margin-top: 24px;
            font-size: 14px;
            color: #92400e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
                </svg>
                Foos & Friends
            </div>
            <p class="tagline">Play. Compete. Connect.</p>
        </div>
        
        <div class="content">
            <div class="greeting">Ready to play?</div>
            
            <div class="message">
                <p>Click the button below to sign in to your Foos & Friends account and start tracking your foosball victories!</p>
            </div>
            
            <a href="{{ .ConfirmationURL }}" class="cta-button">
                Sign In to Foos & Friends
            </a>
            
            <div class="alternative-link">
                <p><strong>Button not working?</strong> Copy and paste this link into your browser:</p>
                <p>{{ .ConfirmationURL }}</p>
            </div>
            
            <div class="security-note">
                <p><strong>Security tip:</strong> This link will expire in 24 hours and can only be used once. If you didn't request this email, you can safely ignore it.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This email was sent because you requested to sign in to Foos & Friends.</p>
            <p>If you have any questions, feel free to reply to this email.</p>
        </div>
    </div>
</body>
</html>
```

## Password Reset Email Template

**Subject:** Reset your Foos & Friends password

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset your password</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
            padding: 32px 24px;
            text-align: center;
        }
        .logo {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: white;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin: 0;
        }
        .content {
            padding: 32px 24px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #111827;
        }
        .message {
            margin-bottom: 32px;
            color: #6b7280;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 24px;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-1px);
        }
        .alternative-link {
            background-color: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            margin-top: 24px;
            font-size: 14px;
            color: #6b7280;
            word-break: break-all;
        }
        .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #9ca3af;
        }
        .security-note {
            background-color: #fef2f2;
            border: 1px solid #f87171;
            border-radius: 6px;
            padding: 12px;
            margin-top: 24px;
            font-size: 14px;
            color: #dc2626;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
                </svg>
                Foos & Friends
            </div>
            <p class="tagline">Play. Compete. Connect.</p>
        </div>
        
        <div class="content">
            <div class="greeting">Reset your password</div>
            
            <div class="message">
                <p>You've requested to reset your password for your Foos & Friends account. Click the button below to set a new password.</p>
            </div>
            
            <a href="{{ .ConfirmationURL }}" class="cta-button">
                Reset Password
            </a>
            
            <div class="alternative-link">
                <p><strong>Button not working?</strong> Copy and paste this link into your browser:</p>
                <p>{{ .ConfirmationURL }}</p>
            </div>
            
            <div class="security-note">
                <p><strong>Security notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This email was sent because you requested to reset your password.</p>
            <p>If you have any questions, feel free to reply to this email.</p>
        </div>
    </div>
</body>
</html>
```

## Email Confirmation Template

**Subject:** Confirm your email for Foos & Friends

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm your email</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
            padding: 32px 24px;
            text-align: center;
        }
        .logo {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: white;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin: 0;
        }
        .content {
            padding: 32px 24px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #111827;
        }
        .message {
            margin-bottom: 32px;
            color: #6b7280;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 24px;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-1px);
        }
        .alternative-link {
            background-color: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            margin-top: 24px;
            font-size: 14px;
            color: #6b7280;
            word-break: break-all;
        }
        .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #9ca3af;
        }
        .welcome-box {
            background-color: #f0f9ff;
            border: 1px solid #38bdf8;
            border-radius: 6px;
            padding: 16px;
            margin-top: 24px;
            font-size: 14px;
            color: #0369a1;
        }
        .security-note {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px;
            margin-top: 24px;
            font-size: 14px;
            color: #92400e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
                </svg>
                Foos & Friends
            </div>
            <p class="tagline">Play. Compete. Connect.</p>
        </div>
        
        <div class="content">
            <div class="greeting">Welcome to the team!</div>
            
            <div class="message">
                <p>Thanks for signing up for Foos & Friends! To complete your registration and start tracking your foosball matches, please confirm your email address.</p>
            </div>
            
            <a href="{{ .ConfirmationURL }}" class="cta-button">
                Confirm Email Address
            </a>
            
            <div class="welcome-box">
                <p><strong>What's next?</strong></p>
                <ul style="margin: 8px 0; padding-left: 20px;">
                    <li>Create or join a friend group</li>
                    <li>Add players to your group</li>
                    <li>Start recording matches</li>
                    <li>Watch your ELO rating climb!</li>
                </ul>
            </div>
            
            <div class="alternative-link">
                <p><strong>Button not working?</strong> Copy and paste this link into your browser:</p>
                <p>{{ .ConfirmationURL }}</p>
            </div>
            
            <div class="security-note">
                <p><strong>Security tip:</strong> This confirmation link will expire in 24 hours. If you didn't create an account with us, you can safely ignore this email.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This email was sent because someone signed up for Foos & Friends with this email address.</p>
            <p>If you have any questions, feel free to reply to this email.</p>
        </div>
    </div>
</body>
</html>
```

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

- **Colors**: Templates use the app's orange (#f97316) to red (#dc2626) gradient
- **Typography**: Uses system fonts for consistency and readability
- **Mobile-friendly**: Responsive design that works on all devices
- **Accessibility**: High contrast ratios and semantic HTML
- **Security**: Clear security notes and expiration information