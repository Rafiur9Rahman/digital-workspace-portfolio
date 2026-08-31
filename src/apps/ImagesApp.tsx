import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase, isSupabaseConfigured, IMAGES_BUCKET } from '../lib/supabase'
import { useAuth } from '../store/auth'

interface Img {
  name: string
  url: string
}

const sanitize = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)

export function ImagesApp() {
  const isAdmin = Boolean(useAuth((s) => s.user))
  const [images, setImages] = useState<Img[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    setLoading(true)
    setError(null)
    const { data, error } = await sb.storage
      .from(IMAGES_BUCKET)
      .list('', { sortBy: { column: 'created_at', order: 'desc' } })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const files = (data ?? []).filter((f) => f.id) // skip folder placeholders
    setImages(
      files.map((f) => ({
        name: f.name,
        url: sb.storage.from(IMAGES_BUCKET).getPublicUrl(f.name).data.publicUrl,
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSupabaseConfigured) void load()
  }, [load])

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length || !supabase) return
    setBusy(true)
    setError(null)
    for (const file of files) {
      const path = `${Date.now()}-${sanitize(file.name)}`
      const { error } = await supabase.storage
        .from(IMAGES_BUCKET)
        .upload(path, file, { contentType: file.type })
      if (error) setError(error.message)
    }
    setBusy(false)
    void load()
  }

  async function remove(name: string) {
    if (!supabase || !confirm(`Delete ${name}?`)) return
    setBusy(true)
    const { error } = await supabase.storage.from(IMAGES_BUCKET).remove([name])
    if (error) setError(error.message)
    setBusy(false)
    void load()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-desk-edge px-4 py-2.5">
        <span className="text-sm font-medium text-desk-text">Images</span>
        <span className="text-xs text-desk-muted">
          {images.length} {images.length === 1 ? 'item' : 'items'}
        </span>
        {isAdmin && isSupabaseConfigured && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="ml-auto rounded-lg bg-desk-accent px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Upload'}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onUpload}
        />
      </div>

      <div className="desk-scroll min-h-0 flex-1 overflow-auto p-4">
        {!isSupabaseConfigured ? (
          <p className="text-sm text-desk-muted">
            Image storage isn’t set up yet. Follow the Supabase steps in the
            README, then reload.
          </p>
        ) : loading ? (
          <p className="text-sm text-desk-muted">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : images.length === 0 ? (
          <p className="text-sm text-desk-muted">
            No images yet.{' '}
            {isAdmin
              ? 'Use Upload to add some.'
              : 'Sign in as admin to add some.'}
          </p>
        ) : (
          <div
            className="grid justify-center gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, 140px)' }}
          >
            {images.map((img, i) => (
              <div
                key={img.name}
                className="group relative aspect-square w-[140px] overflow-hidden rounded-lg border border-desk-edge bg-desk-bg"
              >
                <button
                  type="button"
                  onClick={() => setLightbox(i)}
                  aria-label={`View ${img.name}`}
                  className="block h-full w-full cursor-zoom-in"
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    loading="lazy"
                    // CORS load so it passes COEP: require-corp (Supabase
                    // Storage sends Access-Control-Allow-Origin: *).
                    crossOrigin="anonymous"
                    className="h-full w-full object-cover"
                  />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => remove(img.name)}
                    className="absolute right-1.5 top-1.5 hidden h-6 w-6 place-items-center rounded-full bg-black/70 text-xs text-white group-hover:grid hover:bg-red-500"
                    title="Delete"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox !== null &&
        images[lightbox] &&
        createPortal(
          <Lightbox
            images={images}
            index={lightbox}
            onClose={() => setLightbox(null)}
            onIndex={setLightbox}
          />,
          document.body,
        )}
    </div>
  )
}

/* View-only fullscreen viewer. Rendered via a portal to <body> so it escapes the
   window's transformed / overflow-hidden container. */
function Lightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: Img[]
  index: number
  onClose: () => void
  onIndex: (i: number) => void
}) {
  const many = images.length > 1
  const img = images[index]
  const touchX = useRef<number | null>(null)

  const go = useCallback(
    (dir: number) => onIndex((index + dir + images.length) % images.length),
    [index, images.length, onIndex],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (many && e.key === 'ArrowLeft') go(-1)
      else if (many && e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, many, onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
    >
      <img
        src={img.url}
        alt={img.name}
        crossOrigin="anonymous"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          const start = touchX.current
          touchX.current = null
          if (start == null || !many) return
          const dx = e.changedTouches[0].clientX - start
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
        }}
        className="max-h-[92vh] max-w-[92vw] select-none object-contain shadow-2xl"
      />

      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close"
        className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20"
      >
        ✕
      </button>

      {many && (
        <>
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80">
            {index + 1} / {images.length}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:left-6"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
            aria-label="Next image"
            className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:right-6"
          >
            ›
          </button>
        </>
      )}
    </div>
  )
}
