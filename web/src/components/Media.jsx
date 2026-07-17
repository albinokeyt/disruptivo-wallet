// Renderiza un item multimedia (imagen, video mp4 o embed de YouTube).
function youtubeId(url) {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

export function Media({ item, className = '' }) {
  if (!item?.url) return null
  const url = item.url
  const yt = item.type === 'video' || /youtu/.test(url) ? youtubeId(url) : null
  if (yt) {
    return (
      <div className={`relative w-full aspect-video overflow-hidden rounded-xl bg-black ${className}`}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${yt}`}
          title={item.caption || 'video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  if (item.type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return <video className={`w-full rounded-xl bg-black ${className}`} src={url} controls preload="metadata" />
  }
  return <img className={`w-full object-cover rounded-xl ${className}`} src={url} alt={item.caption || ''} loading="lazy" />
}

export function Thumb({ item, className = '' }) {
  const yt = item?.url && (/youtu/.test(item.url)) ? youtubeId(item.url) : null
  const src = yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : item?.url
  const isVideo = yt || item?.type === 'video' || (item?.url && /\.(mp4|webm|mov)(\?|$)/i.test(item.url))
  if (!src || (isVideo && !yt)) {
    return <div className={`w-full h-full grid place-items-center bg-card2 text-mut text-xs ${className}`}>{isVideo ? '▶ vídeo' : 'sin imagen'}</div>
  }
  return (
    <div className={`relative w-full h-full ${className}`}>
      <img className="w-full h-full object-cover" src={src} alt={item?.caption || ''} loading="lazy" />
      {isVideo && <span className="absolute inset-0 grid place-items-center text-white/90 text-2xl drop-shadow">▶</span>}
    </div>
  )
}
