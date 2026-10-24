/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import React, { useEffect, useState } from 'react'
import { useFormFields } from '@payloadcms/ui'

interface MediaDoc {
  id: string | number
  url: string
  filename: string
  mimeType: string
  alt?: string
}

export const FilePreviews: React.FC = () => {
  // Retrieve the value of relationship fields from the form state
  const highSchoolDocVal = useFormFields(([fields]) => fields.highSchoolDocument?.value) as string | number | undefined
  const idDocVal = useFormFields(([fields]) => fields.idDocument?.value) as string | number | undefined
  const personalPhotoVal = useFormFields(([fields]) => fields.personalPhoto?.value) as string | number | undefined

  const [highSchoolDoc, setHighSchoolDoc] = useState<MediaDoc | null>(null)
  const [idDoc, setIdDoc] = useState<MediaDoc | null>(null)
  const [personalPhoto, setPersonalPhoto] = useState<MediaDoc | null>(null)

  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const fetchMedia = async (id: string | number, type: string, setter: (doc: MediaDoc | null) => void) => {
    if (!id) {
      setter(null)
      return
    }

    setLoading((prev) => ({ ...prev, [type]: true }))
    try {
      const res = await fetch(`/api/media/${id}`)
      if (res.ok) {
        const doc = await res.json()
        setter(doc)
      } else {
        setter(null)
      }
    } catch (err) {
      console.error(`Failed to fetch media for field ${type} and id ${id}`, err)
      setter(null)
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }))
    }
  }

  useEffect(() => {
    if (highSchoolDocVal) {
      fetchMedia(highSchoolDocVal, 'highSchoolDocument', setHighSchoolDoc)
    } else {
      setHighSchoolDoc(null)
    }
  }, [highSchoolDocVal])

  useEffect(() => {
    if (idDocVal) {
      fetchMedia(idDocVal, 'idDocument', setIdDoc)
    } else {
      setIdDoc(null)
    }
  }, [idDocVal])

  useEffect(() => {
    if (personalPhotoVal) {
      fetchMedia(personalPhotoVal, 'personalPhoto', setPersonalPhoto)
    } else {
      setPersonalPhoto(null)
    }
  }, [personalPhotoVal])

  const renderPreview = (doc: MediaDoc | null, fieldName: string, label: string) => {
    const isLoad = loading[fieldName]

    if (isLoad) {
      return (
        <div style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '8px', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
          <span>Loading preview...</span>
        </div>
      )
    }

    if (!doc) {
      return (
        <div style={{ padding: '16px', border: '1px dashed #ccc', borderRadius: '8px', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
          <span>No document uploaded</span>
        </div>
      )
    }

    const isImage = doc.mimeType?.startsWith('image/')
    const isPdf = doc.mimeType === 'application/pdf'

    return (
      <div style={{ border: '1px solid #e0e0e0', borderRadius: '12px', background: 'var(--theme-bg, #fff)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
        {/* Header bar */}
        <div style={{ padding: '10px 14px', background: '#f5f5f5', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>{label}</span>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#d4af37',
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #d4af37',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#d4af37'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#d4af37'
            }}
          >
            Open File ↗
          </a>
        </div>

        {/* Body preview area */}
        <div style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '160px', background: '#fafafa' }}>
          {isImage ? (
            <img
              src={doc.url}
              alt={doc.alt || label}
              style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            />
          ) : isPdf ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <iframe
                src={`${doc.url}#toolbar=0`}
                style={{ width: '100%', height: '240px', border: 'none', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              />
              <span style={{ fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }}>
                📄 {doc.filename}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '32px' }}>📁</span>
              <span style={{ fontSize: '12px', color: '#555' }}>{doc.filename}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ margin: '24px 0 32px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{ width: '4px', height: '18px', background: '#d4af37', borderRadius: '2px' }} />
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
          معاينة المستندات المرفقة (Admission Documents Preview)
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {renderPreview(personalPhoto, 'personalPhoto', 'الصورة الشخصية (Personal Photo)')}
        {renderPreview(idDoc, 'idDocument', 'صورة الهوية (ID Document)')}
        {renderPreview(highSchoolDoc, 'highSchoolDocument', 'شهادة الثانوية العامة (High School Certificate)')}
      </div>
    </div>
  )
}
