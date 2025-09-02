#!/usr/bin/env python3
"""
Simple script to unblock a user from Mini App security system
Usage: python unblock_user.py <telegram_id>
"""

import requests
import sys
import os

def unblock_user(telegram_id, api_base_url="https://sianmarketing.com/api"):
    """
    Unblock a user from the Mini App security system
    """
    try:
        # First, list blocked users to see if the user is actually blocked
        print(f"🔍 Checking if user {telegram_id} is blocked...")
        
        list_url = f"{api_base_url}/api/v1/security?action=list_blocked"
        response = requests.get(list_url)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                blocked_users = data.get('data', {}).get('blocked_users', [])
                user_found = any(user['telegram_id'] == int(telegram_id) for user in blocked_users)
                
                if not user_found:
                    print(f"✅ User {telegram_id} is not currently blocked.")
                    return True
                else:
                    print(f"🚫 User {telegram_id} is blocked. Attempting to unblock...")
            else:
                print(f"❌ Error checking blocked users: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Failed to check blocked users. Status: {response.status_code}")
            return False
        
        # Unblock the user
        unblock_url = f"{api_base_url}/api/v1/security?action=unblock"
        unblock_data = {"telegram_id": str(telegram_id)}
        
        response = requests.post(unblock_url, data=unblock_data)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"✅ Successfully unblocked user {telegram_id}")
                
                # Also clear their suspicious activity
                clear_url = f"{api_base_url}/api/v1/security?action=clear_activity"
                clear_data = {"telegram_id": str(telegram_id)}
                
                clear_response = requests.post(clear_url, data=clear_data)
                if clear_response.status_code == 200:
                    clear_data = clear_response.json()
                    if clear_data.get('success'):
                        print(f"✅ Also cleared suspicious activity for user {telegram_id}")
                    else:
                        print(f"⚠️ User unblocked but failed to clear activity: {clear_data.get('error')}")
                else:
                    print(f"⚠️ User unblocked but failed to clear activity. Status: {clear_response.status_code}")
                
                return True
            else:
                print(f"❌ Failed to unblock user: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Failed to unblock user. Status: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python unblock_user.py <telegram_id>")
        print("Example: python unblock_user.py 76599340")
        sys.exit(1)
    
    telegram_id = sys.argv[1]
    
    # Validate telegram_id is numeric
    try:
        int(telegram_id)
    except ValueError:
        print("❌ Error: Telegram ID must be a number")
        sys.exit(1)
    
    print(f"🚀 Starting unblock process for user {telegram_id}...")
    
    # Allow custom API URL via environment variable
    api_base_url = os.getenv('API_BASE_URL', 'https://sianmarketing.com/api')
    
    success = unblock_user(telegram_id, api_base_url)
    
    if success:
        print(f"🎉 User {telegram_id} has been successfully unblocked!")
        print("The user should now be able to use the chat feature again.")
    else:
        print(f"💥 Failed to unblock user {telegram_id}")
        print("Please check the logs or contact support.")
        sys.exit(1)

if __name__ == "__main__":
    main()
