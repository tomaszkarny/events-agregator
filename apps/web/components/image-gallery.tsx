'use client'

import { useState, useEffect } from 'react'

interface ImageGalleryProps {
  images: string[]
  title: string
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-64 md:h-96 bg-gray-200 flex items-center justify-center rounded-lg">
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p>Brak zdjęć</p>
        </div>
      </div>
    )
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToImage = (index: number) => {
    setCurrentIndex(index)
  }

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return
      
      if (e.key === 'Escape') {
        setIsModalOpen(false)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevImage()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextImage()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isModalOpen])

  return (
    <>
      {/* Main Gallery */}
      <div className="relative group">
        {/* Main Image */}
        <div 
          className="relative w-full h-64 md:h-96 overflow-hidden rounded-lg cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          <img 
            src={images[currentIndex]} 
            alt={`${title} - zdjęcie ${currentIndex + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="200" y="150" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="16">Nie można załadować zdjęcia</text></svg>'
            }}
          />
          
          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* Expand icon */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>

        {/* Navigation arrows - only show if more than 1 image */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-80"
              aria-label="Poprzednie zdjęcie"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-80"
              aria-label="Następne zdjęcie"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Thumbnail navigation - only show if more than 1 image */}
        {images.length > 1 && (
          <div className="flex justify-center mt-4 space-x-2 overflow-x-auto pb-2">
            {images.slice(0, 6).map((image, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`flex-shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 transition-all ${
                  index === currentIndex ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <img 
                  src={image} 
                  alt={`Miniatura ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            {images.length > 6 && (
              <div className="flex-shrink-0 w-16 h-12 rounded-md bg-gray-100 border-2 border-gray-300 flex items-center justify-center text-gray-600 text-xs">
                +{images.length - 6}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-screen Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-w-7xl max-h-full p-4" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-60 p-2 rounded-full hover:bg-opacity-80 z-10"
              aria-label="Zamknij galerię"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Image */}
            <img 
              src={images[currentIndex]} 
              alt={`${title} - pełny rozmiar`}
              className="max-w-full max-h-full object-contain"
            />

            {/* Modal Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-60 p-3 rounded-full hover:bg-opacity-80"
                  aria-label="Poprzednie zdjęcie"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-60 p-3 rounded-full hover:bg-opacity-80"
                  aria-label="Następne zdjęcie"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Modal counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-full">
              {currentIndex + 1} z {images.length}
            </div>
          </div>
        </div>
      )}
    </>
  )
}