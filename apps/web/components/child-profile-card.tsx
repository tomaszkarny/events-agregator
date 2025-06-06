'use client'

import { ChildProfile } from '@/lib/types'

interface ChildProfileCardProps {
  profile: ChildProfile
  onEdit: () => void
  onDelete: () => void
}

export function ChildProfileCard({ profile, onEdit, onDelete }: ChildProfileCardProps) {
  // Generate avatar with initials
  const initials = profile.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Get background color based on name (consistent color for same name)
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-purple-500',
    'bg-indigo-500'
  ]
  const colorIndex = profile.name.charCodeAt(0) % colors.length
  const bgColor = colors[colorIndex]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className={`w-16 h-16 ${bgColor} rounded-full flex items-center justify-center text-white text-xl font-semibold`}>
            {initials}
          </div>
          
          {/* Profile Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{profile.name}</h3>
            <p className="text-sm text-gray-600">{profile.age} lat</p>
            
            {/* Interests */}
            {profile.interests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Edytuj profil"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Usuń profil"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Additional info */}
      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <p>Profil utworzony: {new Date(profile.createdAt).toLocaleDateString('pl-PL')}</p>
      </div>
    </div>
  )
}