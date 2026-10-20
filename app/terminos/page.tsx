'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'

// Terms of use. Full legal text lives here in both languages (not in the UI dictionary): the Spanish version prevails.
// Limits of liability are always "as far as the law allows": blanket waivers are void in consumer law and protect nothing.
const UPDATED = { es: '20 de octubre de 2026', en: 'October 20, 2026' }

type Section = { title: string; body: string[] }

const es: Section[] = [
  { title: '1. Qué es AntojosGo', body: [
    'AntojosGo es, por ahora, un proyecto universitario (trabajo de graduación) en fase de prueba. Es un directorio gratuito que ayuda a encontrar restaurantes y platillos en Guatemala, con un asistente de búsqueda y reseñas.',
    'Al ser un proyecto académico en desarrollo, el servicio puede tener errores, cambiar, pausarse o terminar en cualquier momento, sin aviso previo y sin que eso genere obligación alguna para AntojosGo.',
  ] },
  { title: '2. Aceptación', body: [
    'Al usar la web o la app, o al crear una cuenta (con correo o con Google), aceptas estos términos. Si no estás de acuerdo, no uses AntojosGo.',
    'Si eres menor de 18 años, necesitas el permiso de tu madre, padre o tutor para crear una cuenta.',
  ] },
  { title: '3. Somos un directorio, no un vendedor', body: [
    'AntojosGo no vende comida, no toma pedidos, no cobra pagos ni hace entregas. Solo muestra la información que publica cada restaurante.',
    'Cualquier compra, reserva, pago, reclamo o trato es directamente entre tú y el restaurante. AntojosGo no es parte de esa relación ni responde por la calidad, el precio, la higiene, la atención o la seguridad de los alimentos.',
  ] },
  { title: '4. La información la publica cada restaurante', body: [
    'Menús, precios, fotos, horarios, ubicaciones, ingredientes y alérgenos los registra cada restaurante. Pueden cambiar sin aviso o contener errores. AntojosGo no los verifica uno por uno.',
    'Alergias e intolerancias: confirma siempre con el restaurante antes de pedir. La información de alérgenos es orientativa y no sustituye esa confirmación ni el consejo de un profesional de la salud.',
  ] },
  { title: '5. Uso de inteligencia artificial', body: [
    'El asistente puede usar inteligencia artificial (actualmente Google Gemini) para entender lo que escribes, y el contenido de los restaurantes y las reseñas puede traducirse al inglés de forma automática con la misma tecnología.',
    'La inteligencia artificial puede equivocarse: malinterpretar una petición, sugerir algo que no buscabas o traducir mal. Sus respuestas son sugerencias, no recomendaciones profesionales (médicas, nutricionales ni de ningún otro tipo). Las respuestas del asistente siempre salen de restaurantes reales de la base de datos, pero verifica la información importante.',
    'Lo que escribes al asistente puede enviarse a Google para interpretarlo. No escribas datos personales, de salud ni de contacto en el asistente. Las traducciones son automáticas; si hay diferencias, vale el texto original en español.',
  ] },
  { title: '6. Ubicación, mapas y rutas', body: [
    'Compartir tu ubicación es opcional y solo se usa para ordenar resultados por cercanía; no la guardamos en tu cuenta. Las distancias, horarios de apertura y rutas («Cómo llegar», con Google Maps u OpenStreetMap) son aproximados. Revisa tu ruta y circula con precaución.',
  ] },
  { title: '7. Tu cuenta', body: [
    'Eres responsable de lo que se haga con tu cuenta y de mantener tu contraseña en secreto. Usa datos verdaderos.',
    'Podemos suspender o eliminar cuentas que incumplan estos términos, que se usen para abusar del servicio o que parezcan falsas.',
  ] },
  { title: '8. Si publicas un restaurante', body: [
    'Declaras que tienes derecho a representar al restaurante y a publicar sus nombres, logos, fotos y menús, y que la información es verdadera y la mantendrás al día, en especial precios, horarios y alérgenos.',
    'Eres el único responsable de esa información y de lo que ofrezcas a tus clientes. Nos das permiso gratuito y no exclusivo para mostrarla, adaptarla al formato de la web y la app, traducirla con inteligencia artificial y usarla para promocionar AntojosGo mientras esté publicada.',
    'Podemos ocultar, corregir o despublicar sedes, platillos o fotos que sean falsos, engañosos, ofensivos o que infrinjan derechos de otros.',
  ] },
  { title: '9. Reseñas', body: [
    'Las reseñas se publican sin tu nombre. Son la opinión de quien las escribe, no de AntojosGo.',
    'No se permite: insultos, discriminación, amenazas, datos personales de otras personas, publicidad, reseñas falsas o escritas para perjudicar o favorecer a un restaurante a cambio de algo.',
    'Al publicar una reseña nos das permiso gratuito, mundial y no exclusivo para mostrarla, traducirla y moderarla. Podemos ocultar o eliminar reseñas que incumplan estas reglas o que un restaurante reporte con razón, sin estar obligados a revisar cada una antes de publicarla.',
  ] },
  { title: '10. Usos prohibidos', body: [
    'No intentes acceder a cuentas o datos ajenos, saturar o atacar el servicio, saltarte los límites de uso, copiar de forma masiva o automatizada el contenido, suplantar a otra persona o restaurante, ni usar AntojosGo para algo ilegal.',
  ] },
  { title: '11. Propiedad intelectual', body: [
    'El nombre AntojosGo, su logo, diseño y software pertenecen a sus creadores. El contenido de cada restaurante y de cada reseña sigue perteneciendo a quien lo publicó, con el permiso de uso descrito arriba.',
  ] },
  { title: '12. El servicio se ofrece «tal cual»', body: [
    'AntojosGo es gratuito y se ofrece tal como está, sin garantías de disponibilidad, exactitud, continuidad ni de que cumpla un fin concreto. Podemos cambiar, quitar o agregar funciones, y borrar datos de prueba, en cualquier momento.',
  ] },
  { title: '13. Límite de responsabilidad', body: [
    'En la medida máxima que permita la ley de Guatemala, AntojosGo y sus creadores no responden por: la información publicada por restaurantes o usuarios; lo que compres, consumas o acuerdes con un restaurante; reacciones alérgicas o problemas de salud relacionados con alimentos; errores de la inteligencia artificial o de las traducciones; rutas, distancias u horarios inexactos; fallas, interrupciones o pérdida de datos; ni por daños indirectos o lucro cesante.',
    'Nada de esto limita los derechos que la ley no permite renunciar, ni la responsabilidad por dolo o culpa grave.',
  ] },
  { title: '14. Tu responsabilidad', body: [
    'Si incumples estos términos o publicas contenido que afecte derechos de otros, respondes tú por los reclamos que eso provoque, y AntojosGo puede retirar ese contenido y cerrar tu cuenta.',
  ] },
  { title: '15. Tus datos', body: [
    'Guardamos lo necesario para que el servicio funcione: tu correo y nombre de cuenta, tus favoritos, tus reseñas (sin tu nombre visible) y, si tienes restaurante, sus datos. De las búsquedas solo contamos de forma anónima la categoría (por ejemplo «pizza»), nunca el texto ni quién buscó. Para frenar abusos guardamos durante aproximadamente una hora una huella anónima (hash) de tu dirección IP.',
    'No vendemos tus datos. Usamos proveedores para operar: Supabase (base de datos y cuentas), Vercel (web), Google (inicio de sesión, mapas e inteligencia artificial) y Gmail (correos de la cuenta).',
    'Puedes pedir que eliminemos tu cuenta y tus datos respondiendo a cualquier correo que te haya enviado AntojosGo.',
  ] },
  { title: '16. Cambios a estos términos', body: [
    'Estos términos corresponden a la etapa universitaria del proyecto. Podemos cambiarlos en el futuro según las necesidades e intereses de AntojosGo; por ejemplo, si se vuelve un servicio comercial, con publicidad o con planes de pago para restaurantes.',
    'Publicaremos aquí la versión nueva con su fecha y, si el cambio es importante, lo avisaremos en la web o la app. Si sigues usando AntojosGo después del cambio, aceptas la versión nueva; si no estás de acuerdo, puedes dejar de usarlo y pedir que borremos tu cuenta.',
  ] },
  { title: '17. Ley aplicable', body: [
    'Estos términos se rigen por las leyes de la República de Guatemala. Cualquier controversia se tratará primero de resolver de forma directa y, si no es posible, ante los tribunales competentes de Quetzaltenango, salvo que la ley de protección al consumidor disponga otra cosa.',
    'Si alguna parte de estos términos no fuera válida, el resto sigue vigente.',
  ] },
]

const en: Section[] = [
  { title: '1. What AntojosGo is', body: [
    'AntojosGo is, for now, a university project (a graduation thesis) in a testing phase. It is a free directory that helps people find restaurants and dishes in Guatemala, with a search assistant and reviews.',
    'Because it is an academic project under development, the service may have errors, change, pause or end at any time, without prior notice and without creating any obligation for AntojosGo.',
  ] },
  { title: '2. Acceptance', body: [
    'By using the website or the app, or by creating an account (with email or Google), you accept these terms. If you do not agree, do not use AntojosGo.',
    'If you are under 18, you need permission from a parent or guardian to create an account.',
  ] },
  { title: '3. We are a directory, not a seller', body: [
    'AntojosGo does not sell food, take orders, process payments or deliver. It only shows the information each restaurant publishes.',
    'Any purchase, booking, payment, complaint or dealing is directly between you and the restaurant. AntojosGo is not a party to that relationship and is not responsible for the quality, price, hygiene, service or safety of the food.',
  ] },
  { title: '4. Each restaurant publishes its own information', body: [
    'Menus, prices, photos, opening hours, locations, ingredients and allergens are entered by each restaurant. They may change without notice or contain errors. AntojosGo does not verify them one by one.',
    'Allergies and intolerances: always confirm with the restaurant before ordering. Allergen information is a guide only and does not replace that confirmation or the advice of a health professional.',
  ] },
  { title: '5. Use of artificial intelligence', body: [
    'The assistant may use artificial intelligence (currently Google Gemini) to understand what you write, and restaurant content and reviews may be translated into English automatically with the same technology.',
    'Artificial intelligence can make mistakes: misunderstand a request, suggest something you were not looking for or translate incorrectly. Its answers are suggestions, not professional advice (medical, nutritional or otherwise). The assistant always answers with real restaurants from the database, but check important information.',
    'What you write to the assistant may be sent to Google to interpret it. Do not write personal, health or contact details in the assistant. Translations are automatic; if they differ, the original Spanish text prevails.',
  ] },
  { title: '6. Location, maps and directions', body: [
    'Sharing your location is optional and is only used to sort results by distance; we do not store it in your account. Distances, opening status and directions («Directions», with Google Maps or OpenStreetMap) are approximate. Check your route and travel carefully.',
  ] },
  { title: '7. Your account', body: [
    'You are responsible for what is done with your account and for keeping your password secret. Use truthful information.',
    'We may suspend or delete accounts that break these terms, are used to abuse the service or appear to be fake.',
  ] },
  { title: '8. If you publish a restaurant', body: [
    'You state that you are entitled to represent the restaurant and to publish its names, logos, photos and menus, and that the information is true and you will keep it up to date, especially prices, opening hours and allergens.',
    'You alone are responsible for that information and for what you offer your customers. You give us a free, non-exclusive permission to display it, adapt it to the website and app, translate it with artificial intelligence and use it to promote AntojosGo while it is published.',
    'We may hide, correct or unpublish locations, dishes or photos that are false, misleading, offensive or infringe the rights of others.',
  ] },
  { title: '9. Reviews', body: [
    'Reviews are published without your name. They are the opinion of whoever writes them, not of AntojosGo.',
    'Not allowed: insults, discrimination, threats, other people\'s personal data, advertising, fake reviews or reviews written to harm or favor a restaurant in exchange for something.',
    'By posting a review you give us a free, worldwide, non-exclusive permission to display, translate and moderate it. We may hide or remove reviews that break these rules or that a restaurant reports with good reason, without being obliged to check each one before it is published.',
  ] },
  { title: '10. Prohibited uses', body: [
    'Do not try to access other people\'s accounts or data, overload or attack the service, get around usage limits, copy content in bulk or automatically, impersonate another person or restaurant, or use AntojosGo for anything illegal.',
  ] },
  { title: '11. Intellectual property', body: [
    'The AntojosGo name, logo, design and software belong to their creators. Each restaurant\'s content and each review still belongs to whoever published it, with the permission of use described above.',
  ] },
  { title: '12. The service is provided "as is"', body: [
    'AntojosGo is free and provided as it is, with no guarantee of availability, accuracy, continuity or fitness for a particular purpose. We may change, remove or add features, and delete test data, at any time.',
  ] },
  { title: '13. Limitation of liability', body: [
    'To the fullest extent permitted by the law of Guatemala, AntojosGo and its creators are not liable for: information published by restaurants or users; what you buy, eat or agree with a restaurant; allergic reactions or food-related health problems; errors by the artificial intelligence or translations; inaccurate directions, distances or opening hours; failures, interruptions or data loss; or indirect damages or lost profits.',
    'None of this limits rights that the law does not allow to be waived, nor liability for intent or gross negligence.',
  ] },
  { title: '14. Your responsibility', body: [
    'If you break these terms or publish content that affects the rights of others, you are responsible for the claims that result, and AntojosGo may remove that content and close your account.',
  ] },
  { title: '15. Your data', body: [
    'We keep what the service needs to work: your account email and name, your favorites, your reviews (without your name shown) and, if you have a restaurant, its details. From searches we only count, anonymously, the category (for example "pizza"), never the text or who searched. To stop abuse we keep an anonymous fingerprint (hash) of your IP address for about an hour.',
    'We do not sell your data. We use providers to operate: Supabase (database and accounts), Vercel (website), Google (sign-in, maps and artificial intelligence) and Gmail (account emails).',
    'You can ask us to delete your account and data by replying to any email AntojosGo has sent you.',
  ] },
  { title: '16. Changes to these terms', body: [
    'These terms cover the university stage of the project. We may change them in the future according to the needs and interests of AntojosGo; for example, if it becomes a commercial service, with advertising or paid plans for restaurants.',
    'We will publish the new version here with its date and, if the change is significant, announce it on the website or app. If you keep using AntojosGo after the change, you accept the new version; if you do not agree, you can stop using it and ask us to delete your account.',
  ] },
  { title: '17. Governing law', body: [
    'These terms are governed by the laws of the Republic of Guatemala. Any dispute will first be resolved directly if possible and, if not, before the competent courts of Quetzaltenango, unless consumer protection law provides otherwise.',
    'If any part of these terms is invalid, the rest remains in force.',
  ] },
]

export default function TermsPage() {
  const { lang } = useLanguage()
  const sections = lang === 'en' ? en : es
  return <main className="min-h-dvh bg-background px-4 py-8">
    <article className="mx-auto max-w-2xl space-y-6 rounded-[24px] border bg-white p-6 shadow-sm sm:p-8">
      <Link href="/" className="text-sm font-semibold text-[#173F35] hover:underline">← AntojosGo</Link>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#173F35]">{lang === 'en' ? 'Terms of use' : 'Términos y condiciones'}</h1>
        <p className="text-sm text-stone-600">{lang === 'en' ? `Last updated: ${UPDATED.en}. The Spanish version prevails.` : `Última actualización: ${UPDATED.es}.`}</p>
      </header>
      {sections.map(s => <section key={s.title} className="space-y-2">
        <h2 className="text-lg font-semibold text-[#173F35]">{s.title}</h2>
        {s.body.map(p => <p key={p.slice(0, 40)} className="leading-relaxed text-stone-800">{p}</p>)}
      </section>)}
    </article>
  </main>
}
