# Frontend Error Handling - Rate Limit Messages

## Summary
Updated all frontend components to properly display rate limit error messages to users in both AI Coach and all AI tools.

## Changes Made

### 1. API Service (`miniApp/src/services/api.ts`)
- **Added**: Specific handling for HTTP 429 (rate limit) errors
- **Behavior**: Returns proper error message instead of throwing exception
- **Message**: "شما به محدودیت سه تا سوال در دقیقه رسیدید لطفا دقایق دیگر امتحان کنید"

### 2. AI Coach (`miniApp/src/pages/AICoach.tsx`)
- **Updated**: Error handling in `handleSendMessage`
- **Behavior**: Detects rate limit errors and shows specific message
- **Display**: Shows rate limit message with ⚠️ icon in chat

### 3. Chat Modal (`miniApp/src/components/ChatModal.tsx`)
- **Updated**: Error handling in `handleSendMessage`
- **Behavior**: Detects rate limit errors and shows specific message
- **Display**: Shows rate limit message with ⚠️ icon in chat

### 4. Dashboard Chat (`miniApp/src/pages/Dashboard.tsx`)
- **Updated**: Error handling in `handleSendMessage`
- **Behavior**: Detects rate limit errors and shows specific message
- **Display**: Shows rate limit message with ⚠️ icon in chat

### 5. AI Tools
All AI tools now properly display rate limit errors:

#### Business Builder AI (`miniApp/src/pages/BusinessBuilderAI.tsx`)
- **Updated**: Error handling in `generateBusinessPlan`
- **Display**: Alert with rate limit message

#### Sell Kit AI (`miniApp/src/pages/SellKitAI.tsx`)
- **Updated**: Error handling in `generateSellKit`
- **Display**: Alert with rate limit message

#### Client Finder AI (`miniApp/src/pages/ClientFinderAI.tsx`)
- **Updated**: Error handling in `generateClientFinder`
- **Display**: Alert with rate limit message

#### Sales Path AI (`miniApp/src/pages/SalesPathAI.tsx`)
- **Updated**: Error handling in `generateSalesPath`
- **Display**: Alert with rate limit message

## Error Message Flow

1. **Backend**: Returns HTTP 429 with Persian error message
2. **API Service**: Catches 429 status and returns proper error object
3. **Frontend**: Detects rate limit error and displays specific message
4. **User**: Sees clear message about 3 questions per minute limit

## Error Detection Logic

```typescript
// Check if it's a rate limit error
let errorMessage = 'Default error message';
if (error.message.includes('محدودیت سه تا سوال') || error.message.includes('rate limit')) {
  errorMessage = '⚠️ ' + error.message;
}
```

## User Experience

### Chat Components (AI Coach, ChatModal, Dashboard)
- **Rate Limit**: Shows message in chat with ⚠️ icon
- **Other Errors**: Shows generic error message
- **Behavior**: User can see the specific limit message

### AI Tools
- **Rate Limit**: Shows alert with ⚠️ icon and specific message
- **Other Errors**: Shows generic error message
- **Behavior**: User understands they need to wait

## Testing

To test the error handling:
1. Send 4 messages quickly in AI Coach
2. Try to generate business plan 4 times quickly
3. Verify rate limit message appears
4. Check that message is in Persian and clear

## Files Modified

1. `miniApp/src/services/api.ts` - API error handling
2. `miniApp/src/pages/AICoach.tsx` - AI Coach error display
3. `miniApp/src/components/ChatModal.tsx` - Chat modal error display
4. `miniApp/src/pages/Dashboard.tsx` - Dashboard chat error display
5. `miniApp/src/pages/BusinessBuilderAI.tsx` - Business builder error display
6. `miniApp/src/pages/SellKitAI.tsx` - Sell kit error display
7. `miniApp/src/pages/ClientFinderAI.tsx` - Client finder error display
8. `miniApp/src/pages/SalesPathAI.tsx` - Sales path error display

## Result

Users now see clear, specific error messages when they hit the rate limit:
- **Message**: "شما به محدودیت سه تا سوال در دقیقه رسیدید لطفا دقایق دیگر امتحان کنید"
- **Icon**: ⚠️ warning icon
- **Context**: Clear understanding of the 3 questions per minute limit
