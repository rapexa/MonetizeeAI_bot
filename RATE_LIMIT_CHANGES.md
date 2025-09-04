# Rate Limit Changes - 3 Messages Per Minute

## Summary
All AI usage has been limited to 3 messages per minute across both the Telegram bot and Mini App, with a unified Persian error message.

## Changes Made

### 1. Rate Limit Constants
- **Bot**: `MaxChatMessagesPerMinute = 3` (was 20)
- **Mini App**: `MaxMiniAppCallsPerMinute = 3` (was 20)

### 2. Error Messages
- **Old**: "⚠️ شما بیش از حد درخواست ارسال کرده‌اید. لطفا چند دقیقه صبر کنید."
- **New**: "شما به محدودیت سه تا سوال در دقیقه رسیدید لطفا دقایق دیگر امتحان کنید"

### 3. Affected Features

#### Telegram Bot:
- ✅ Chat messages (`handleChatGPTMessage`)
- ✅ Rate limit message updated

#### Mini App:
- ✅ Chat messages (`handleChatRequest`)
- ✅ Business Builder AI (`handleBusinessBuilderRequest`)
- ✅ Sell Kit AI (`handleSellKitRequest`)
- ✅ Client Finder AI (`handleClientFinderRequest`)
- ✅ Sales Path AI (`handleSalesPathRequest`)
- ✅ All tools now show notification when rate limit exceeded

### 4. Rate Limiting Logic
All AI features now share the same rate limiting:
- **Limit**: 3 requests per minute per user
- **Window**: 1 minute rolling window
- **Reset**: Automatically resets after 1 minute
- **Message**: Consistent Persian error message

### 5. Tools Notification
When users hit the rate limit in tools:
- They see the same error message
- The error is returned as an API response
- Frontend can display this as a notification

## Files Modified

1. **handlers.go**:
   - Updated `MaxChatMessagesPerMinute` to 3
   - Updated rate limit message

2. **web_api.go**:
   - Updated `MaxMiniAppCallsPerMinute` to 3
   - Updated rate limit message
   - Added rate limiting to all AI tools
   - Updated chat request rate limit message

## Testing

To test the changes:
1. Restart the bot
2. Try sending more than 3 messages in 1 minute
3. Verify the error message appears
4. Test in both bot and Mini App
5. Test all AI tools

## User Experience

- **Clear Message**: Users know exactly what the limit is
- **Consistent**: Same limit across all AI features
- **Fair**: 3 requests per minute is reasonable for most users
- **Transparent**: Users understand they need to wait

## Rollback

If you need to increase the limit:
1. Change `MaxChatMessagesPerMinute` and `MaxMiniAppCallsPerMinute` to desired value
2. Update error messages if needed
3. Restart the bot
