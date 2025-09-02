# Mini App User Unblock Guide

This guide explains how to unblock users who have been blocked by the Mini App security system.

## Problem

Users can get blocked from the Mini App chat feature due to:
- Suspicious activity detection
- Rate limiting violations
- Invalid input patterns

When blocked, users see the error: "🚫 دسترسی شما به چت مسدود شده است. لطفا با پشتیبانی تماس بگیرید."

## Solutions

### Method 1: Using Admin Commands (Recommended)

If you have admin access to the Telegram bot:

1. Open the Telegram bot
2. Click on "🔒 امنیت مینی اپ" button
3. Use the following commands:

```
/miniapp_security list                    # List all blocked users
/miniapp_security unblock 76599340        # Unblock specific user
/miniapp_security clear 76599340          # Clear suspicious activity
```

### Method 2: Using the Unblock Script

If you have access to the server or API:

#### For Windows:
```bash
unblock_user.bat 76599340
```

#### For Linux/Mac:
```bash
python3 unblock_user.py 76599340
```

### Method 3: Using API Directly

You can also use the API endpoints directly:

#### List blocked users:
```bash
curl "https://sianmarketing.com/api/api/v1/security?action=list_blocked"
```

#### Unblock a user:
```bash
curl -X POST "https://sianmarketing.com/api/api/v1/security?action=unblock" \
     -d "telegram_id=76599340"
```

#### Clear suspicious activity:
```bash
curl -X POST "https://sianmarketing.com/api/api/v1/security?action=clear_activity" \
     -d "telegram_id=76599340"
```

## What Gets Cleared

When you unblock a user, the following data is cleared:
- User removed from blocked users list
- Suspicious activity count reset to 0
- Rate limiting data cleared
- Call count data cleared

## Prevention

To prevent users from getting blocked:
- Avoid sending messages with suspicious patterns
- Don't exceed rate limits (40 calls per minute)
- Keep messages under 500 characters
- Avoid special characters and system commands

## Troubleshooting

If the unblock doesn't work:
1. Check if the user ID is correct
2. Verify the API is accessible
3. Check server logs for errors
4. Try clearing suspicious activity first, then unblocking

## Security Notes

- Only admins should have access to unblock functionality
- All unblock actions are logged
- Users are automatically blocked after 3 suspicious activities
- Rate limiting is enforced to prevent abuse
