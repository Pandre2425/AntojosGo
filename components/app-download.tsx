import { Download, Smartphone } from 'lucide-react'
import { APK_DOWNLOAD_URL } from '@/shared/contracts/announcements'

/** Header button: Android app download (APK) until the app is on Google Play. */
export function AppDownloadButton() {
  return <a href={APK_DOWNLOAD_URL} target="_blank" rel="noreferrer"
    className="flex h-10 items-center gap-1.5 rounded-full bg-[#BD481F] px-3 text-sm font-semibold text-white hover:bg-[#9a3a18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F35]">
    <Download className="h-4 w-4" /><span className="hidden sm:inline">Descargar app</span><span className="sm:hidden">App</span></a>
}

/** Home notice: coming to Google Play; for now an APK. The QR lets computer visitors open it on their phone. */
export function AppDownloadBanner() {
  return <section aria-labelledby="app-download-title" className="flex items-center gap-4 rounded-2xl border border-[#BD481F]/30 bg-[#BD481F]/5 p-4">
    <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#BD481F] text-white sm:flex"><Smartphone className="h-6 w-6" /></div>
    <div className="min-w-0 flex-1 space-y-1">
      <p className="text-xs font-semibold text-[#9a3a18]">Próximamente en Google Play</p>
      <h2 id="app-download-title" className="font-semibold text-[#173F35]">Lleva AntojosGo en tu teléfono</h2>
      <p className="text-sm text-stone-600">La app aún no está en la Play Store. Por ahora puedes instalarla en Android como archivo APK.</p>
      <a href={APK_DOWNLOAD_URL} target="_blank" rel="noreferrer"
        className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[#BD481F] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#9a3a18]"><Download className="h-4 w-4" />Descargar APK</a>
    </div>
    <figure className="hidden shrink-0 text-center sm:block">
      <img src="/descargar-apk-qr.png" alt="Código QR para descargar la app" width={104} height={104} className="rounded-lg bg-white p-1" />
      <figcaption className="mt-1 text-[11px] text-stone-500">Escanéalo con tu teléfono</figcaption>
    </figure>
  </section>
}
