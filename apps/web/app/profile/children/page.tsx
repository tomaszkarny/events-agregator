'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context-v2'
import { ChildProfile } from '@/lib/types'
import { ChildProfileForm } from '@/components/child-profile-form'
import { ChildProfileCard } from '@/components/child-profile-card'
import { getChildProfiles, deleteChildProfile } from '@/lib/supabase-queries'
import { toast } from '@/lib/toast'

export default function ChildrenProfilesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profiles, setProfiles] = useState<ChildProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ChildProfile | null>(null)

  useEffect(() => {
    console.log('ChildrenProfilesPage useEffect:', { user, authLoading })
    if (!authLoading) {
      if (!user) {
        console.log('No user, redirecting to home')
        router.push('/')
        return
      } else {
        console.log('User found, loading profiles')
        console.log('User details:', {
          id: user.id,
          email: user.email,
          aud: user.aud,
          role: user.role,
          created_at: user.created_at
        })
        loadProfiles()
      }
    }
  }, [user, authLoading, router])

  async function loadProfiles() {
    console.log('Loading child profiles...')
    try {
      setLoading(true)
      const data = await getChildProfiles()
      console.log('Child profiles loaded:', data)
      setProfiles(data)
    } catch (error) {
      console.error('Error loading child profiles:', error)
      toast.error('Błąd podczas ładowania profili')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(profileId: string) {
    if (!confirm('Czy na pewno chcesz usunąć ten profil?')) {
      return
    }

    try {
      await deleteChildProfile(profileId)
      toast.success('Profil usunięty')
      loadProfiles()
    } catch (error) {
      console.error('Error deleting profile:', error)
      toast.error('Błąd podczas usuwania profilu')
    }
  }

  function handleEdit(profile: ChildProfile) {
    setEditingProfile(profile)
    setShowForm(true)
  }

  function handleFormSuccess() {
    setShowForm(false)
    setEditingProfile(null)
    loadProfiles()
  }

  function handleFormCancel() {
    setShowForm(false)
    setEditingProfile(null)
  }

  /* Removed unsafe diagnostic functions
  async function runDiagnostic() {
    console.log('=== RUNNING ULTRA COMPREHENSIVE DIAGNOSTIC ===')
    
    try {
      // Import supabase client
      const { supabase } = await import('@/lib/supabase-client')
      
      // 1. Check authentication
      console.log('1. Testing authentication...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('Auth result:', { hasUser: !!user, userId: user?.id, email: user?.email, authError })
      
      if (!user) {
        toast.error('❌ Not authenticated')
        return
      }
      
      // 2. Run deep database diagnostic via API
      console.log('2. Running deep database diagnostic...')
      try {
        const dbResponse = await fetch('/api/debug-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0]
          })
        })
        
        const dbResult = await dbResponse.json()
        console.log('🔍 Deep database diagnostic result:', dbResult)
        
        if (dbResult.tests?.profile_creation?.success) {
          console.log('✅ Profile created successfully via service role')
          toast.success('✅ Profile fixed via service role!')
        } else if (dbResult.tests?.profile_creation?.error) {
          console.error('❌ Profile creation failed:', dbResult.tests.profile_creation.error)
          toast.error(`❌ Profile creation failed: ${dbResult.tests.profile_creation.error}`)
        }
        
        if (dbResult.tests?.child_creation?.success) {
          console.log('✅ Child profile creation works!')
          toast.success('✅ Child profiles are working!')
          loadProfiles() // Reload the profiles
          return
        } else if (dbResult.tests?.child_creation?.error) {
          console.error('❌ Child creation failed:', dbResult.tests.child_creation.error)
          toast.error(`❌ Child creation failed: ${dbResult.tests.child_creation.error}`)
        }
        
      } catch (dbError) {
        console.error('Database diagnostic API failed:', dbError)
        toast.error('Database diagnostic API failed - continuing with client-side tests')
      }
      
      // 3. Client-side fallback tests
      console.log('3. Running client-side fallback tests...')
      
      // Check profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      console.log('Profile check:', { hasProfile: !!profile, profileError })
      
      if (profileError && profileError.code === 'PGRST116') {
        console.log('❌ Profile missing and client-side creation may not work due to RLS')
        toast.error('❌ Profile missing - database admin intervention needed')
        return
      }
      
      // Test child_profiles table access
      const { data: countData, error: countError } = await supabase
        .from('child_profiles')
        .select('count(*)', { count: 'exact', head: true })
      
      console.log('Table access:', { countData, countError })
      
      if (countError) {
        toast.error(`❌ Table access failed: ${countError.message}`)
        return
      }
      
      // Test actual insert
      console.log('4. Testing insert operation...')
      const testData = {
        name: 'Test Child Diagnostic',
        age: 8,
        interests: ['Test']
      }
      
      // Use the actual createChildProfile function
      const { createChildProfile } = await import('@/lib/supabase-queries')
      
      try {
        const insertResult = await createChildProfile(testData)
        console.log('✅ Insert test successful:', insertResult)
        
        // Clean up test record
        if (insertResult?.id) {
          await supabase
            .from('child_profiles')
            .delete()
            .eq('id', insertResult.id)
          console.log('Test record cleaned up')
        }
        
        toast.success('✅ All tests passed! Child profiles are working!')
        loadProfiles() // Reload the profiles
        
      } catch (insertError: any) {
        console.error('❌ Insert test failed:', insertError)
        toast.error(`❌ Insert failed: ${insertError.message}`)
      }
      
    } catch (error: any) {
      console.error('Diagnostic failed:', error)
      toast.error(`❌ Diagnostic failed: ${error.message}`)
    }
  }

  async function forceFixProfile() {
    console.log('=== FORCE FIXING PROFILE WITH SERVICE ROLE ===')
    
    try {
      const { supabase } = await import('@/lib/supabase-client')
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (!user) {
        toast.error('❌ Not authenticated')
        return
      }
      
      console.log('Force fixing profile for user:', user.id)
      toast.info('🚑 Force fixing profile...')
      
      // Call the force fix API
      const response = await fetch('/api/debug-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        })
      })
      
      const result = await response.json()
      console.log('Force fix result:', result)
      
      if (result.tests?.profile_creation?.success) {
        toast.success('✅ Profile force-created successfully!')
        
        if (result.tests?.child_creation?.success) {
          toast.success('✅ Child profiles are now working!')
        }
        
        // Reload profiles to see if it worked
        loadProfiles()
      } else {
        const error = result.tests?.profile_creation?.error || 'Unknown error'
        toast.error(`❌ Force fix failed: ${error}`)
        console.error('Force fix failed:', result)
      }
      
    } catch (error: any) {
      console.error('Force fix failed:', error)
      toast.error(`❌ Force fix failed: ${error.message}`)
    }
  }
  */

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Ładowanie profili...</p>
          <div className="mt-4 text-xs text-gray-500">
            <p>Auth loading: {authLoading ? 'true' : 'false'}</p>
            <p>Data loading: {loading ? 'true' : 'false'}</p>
            <p>User: {user ? user.email : 'null'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/profile')}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Powrót do profilu
          </button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile dzieci</h1>
              <p className="text-gray-600 mt-1">
                Dodaj profile swoich dzieci, aby łatwiej znajdować odpowiednie wydarzenia
              </p>
            </div>
            
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Dodaj dziecko
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingProfile ? 'Edytuj profil' : 'Nowy profil dziecka'}
            </h2>
            <ChildProfileForm
              profile={editingProfile || undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        )}

        {/* Profiles Grid */}
        {profiles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Brak profili dzieci
            </h3>
            <p className="text-gray-600 mb-4">
              Dodaj profile swoich dzieci, aby otrzymywać spersonalizowane rekomendacje wydarzeń.
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Dodaj pierwsze dziecko
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <ChildProfileCard
                key={profile.id}
                profile={profile}
                onEdit={() => handleEdit(profile)}
                onDelete={() => handleDelete(profile.id)}
              />
            ))}
          </div>
        )}

        {/* Info section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Dlaczego warto dodać profile dzieci?</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Otrzymuj spersonalizowane rekomendacje wydarzeń dopasowane do wieku i zainteresowań</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Łatwo filtruj wydarzenia odpowiednie dla wszystkich twoich dzieci</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Planuj aktywności rodzinne z uwzględnieniem potrzeb każdego dziecka</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}