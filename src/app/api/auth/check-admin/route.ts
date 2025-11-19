import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { Client, Account } from "node-appwrite"

// Admin emails list
const ADMIN_EMAILS = [
  'admin@devegy.com',
  'admin@dav-egypt.com',
  'moabdelbaset1@gmail.com',
  'mekawy@devegy.com'
]

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Check-admin: Starting admin verification...')
    
    // Method 1: Try to get Appwrite session from request cookies
    // Appwrite stores session in cookies like a_session_{projectId}
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    console.log('🔍 Check-admin: All cookies:', allCookies.map(c => c.name))
    
    // Find Appwrite session cookie
    const appwriteSessionCookie = allCookies.find(cookie => 
      cookie.name.startsWith('a_session_') || 
      cookie.name === 'a_session_console' ||
      cookie.name === '_legacy'
    )
    
    if (!appwriteSessionCookie) {
      console.log('❌ Check-admin: No Appwrite session cookie found')
      
      // Method 2: Try our custom session cookies as fallback
      const adminSession = cookieStore.get("admin_session")
      const regularSession = cookieStore.get("session")
      
      if (!adminSession && !regularSession) {
        console.log('❌ Check-admin: No session cookies found at all')
        return NextResponse.json(
          { isAdmin: false, error: "No session found" },
          { status: 401 }
        )
      }
      
      // Use custom session cookie
      const session = adminSession || regularSession
      if (!session) {
        console.log('❌ Check-admin: Session is unexpectedly undefined')
        return NextResponse.json(
          { isAdmin: false, error: "No session found" },
          { status: 401 }
        )
      }
      let sessionData
      try {
        sessionData = JSON.parse(session.value || '{}')
      } catch (parseError) {
        console.error('❌ Check-admin: Failed to parse session:', parseError)
        return NextResponse.json(
          { isAdmin: false, error: "Invalid session format" },
          { status: 401 }
        )
      }
      
      if (!sessionData.email) {
        console.log('❌ Check-admin: No email in session')
        return NextResponse.json(
          { isAdmin: false, error: "Invalid session" },
          { status: 401 }
        )
      }
      
      const isAdmin = ADMIN_EMAILS.includes(sessionData.email.toLowerCase())
      
      if (!isAdmin) {
        console.log('❌ Check-admin: User is not admin')
        return NextResponse.json(
          { isAdmin: false, error: "Unauthorized - Admin access required" },
          { status: 403 }
        )
      }
      
      console.log('✅ Check-admin: Admin verified via custom session')
      return NextResponse.json({
        isAdmin: true,
        user: {
          name: sessionData.name || 'Admin',
          email: sessionData.email
        }
      })
    }
    
    // Method 3: Verify with Appwrite directly
    console.log('✅ Check-admin: Found Appwrite session cookie:', appwriteSessionCookie.name)
    
    try {
      // Create Appwrite client with the session
      const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      
      // Set the session from cookie
      client.setSession(appwriteSessionCookie.value)
      
      const account = new Account(client)
      const user = await account.get()
      
      console.log('✅ Check-admin: User retrieved from Appwrite:', {
        id: user.$id,
        email: user.email,
        name: user.name
      })
      
      // Check if user is admin
      const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase())
      
      if (!isAdmin) {
        console.log('❌ Check-admin: User is not admin')
        return NextResponse.json(
          { isAdmin: false, error: "Unauthorized - Admin access required" },
          { status: 403 }
        )
      }
      
      console.log('✅ Check-admin: Admin verified successfully via Appwrite')
      return NextResponse.json({
        isAdmin: true,
        user: {
          name: user.name,
          email: user.email
        }
      })
      
    } catch (appwriteError: any) {
      console.error('❌ Check-admin: Appwrite verification failed:', appwriteError)
      return NextResponse.json(
        { isAdmin: false, error: "Session verification failed" },
        { status: 401 }
      )
    }
    
  } catch (error: any) {
    console.error("❌ Check-admin: Unexpected error:", error)
    return NextResponse.json(
      { isAdmin: false, error: "Authentication failed" },
      { status: 401 }
    )
  }
}