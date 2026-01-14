import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'esn57'
const SESSION_DURATION = 60 * 60 * 24 // 24 hours in seconds

export async function POST(request: Request) {
    try {
        const { password } = await request.json()

        if (password === ADMIN_PASSWORD) {
            // Create a simple session token (in production, use proper JWT)
            const sessionToken = Buffer.from(
                `admin:${Date.now()}:${Math.random()}`
            ).toString('base64')

            // Set HTTP-only cookie
            const cookieStore = await cookies()
            cookieStore.set('admin_session', sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: SESSION_DURATION,
                path: '/',
            })

            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json(
                { error: 'Incorrect password' },
                { status: 401 }
            )
        }
    } catch (error) {
        return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400 }
        )
    }
}

export async function DELETE() {
    // Logout endpoint
    try {
        const cookieStore = await cookies()
        cookieStore.delete('admin_session')
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to logout' },
            { status: 500 }
        )
    }
}

export async function GET() {
    // Check if user is authenticated
    try {
        const cookieStore = await cookies()
        const session = cookieStore.get('admin_session')

        if (session?.value) {
            return NextResponse.json({ authenticated: true })
        } else {
            return NextResponse.json({ authenticated: false })
        }
    } catch (error) {
        return NextResponse.json({ authenticated: false })
    }
}
