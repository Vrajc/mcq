'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminLogin from './AdminLogin'
import TestManager from './TestManager'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('mcq-admin')
    if (token === 'true') setAuthed(true)
    setChecking(false)
  }, [])

  const handleLogin = (password: string) => {
    // Client-side check using env for convenience
    // In production, this hits the API
    fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).then(r => {
      if (r.ok) {
        sessionStorage.setItem('mcq-admin', 'true')
        setAuthed(true)
      } else {
        alert('Wrong password')
      }
    })
  }

  const handleLogout = () => {
    sessionStorage.removeItem('mcq-admin')
    setAuthed(false)
  }

  if (checking) return null

  if (!authed) return <AdminLogin onLogin={handleLogin} />

  return <TestManager onLogout={handleLogout} />
}
