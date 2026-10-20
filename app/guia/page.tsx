'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { APK_DOWNLOAD_URL } from '@/shared/contracts/announcements'

// User guide with real screenshots of the Android app (public/guia/*.webp, taken from the 0.7.x build).
// Text in both languages; the screenshots show the app in Spanish.
type Step = { img?: string; alt: string; title: string; body: string[] }
type Part = { id: string; title: string; intro: string; steps: Step[] }
type Copy = { title: string; lead: string; shotsNote?: string; install: { title: string; steps: string[]; cta: string }; parts: Part[]; help: string; terms: string; back: string }

const es: Copy = {
  title: 'Cómo usar AntojosGo',
  lead: 'Encuentra qué comer en Quetzaltenango: dile al asistente qué se te antoja, revisa menús y precios y llega al restaurante. Si tienes un restaurante, publícalo gratis.',
  install: {
    title: 'Instala la app (Android)',
    steps: [
      'Toca «Descargar APK» desde tu teléfono Android.',
      'Abre el archivo descargado. Si Android lo pide, permite «Instalar apps desconocidas» para tu navegador.',
      'Toca «Instalar» y abre AntojosGo. También puedes usar todo desde antojosgo.com sin instalar nada.',
    ],
    cta: 'Descargar APK',
  },
  parts: [
    { id: 'comensales', title: 'Para comensales', intro: 'No necesitas cuenta para buscar. Crea una solo si quieres guardar favoritos o escribir reseñas.', steps: [
      { img: 'inicio', alt: 'Pantalla de inicio con el buscador, atajos de comida y el mapa', title: 'Inicio', body: ['Escribe qué se te antoja como se lo dirías a un amigo, o toca un atajo como «Pizza» o «Comida típica».', 'El mapa muestra todos los restaurantes publicados. La campana te avisa de novedades.'] },
      { img: 'asistente', alt: 'Conversación con el asistente que recomienda una pizzería', title: 'Asistente', body: ['Pídele cosas como «algo picante cerca», «postre frío» o «comida típica barata». También puedes hablarle con el micrófono 🎤.', 'Siempre responde con restaurantes reales de AntojosGo. Toca «Ver sede ›» para abrir el restaurante.'] },
      { img: 'buscar', alt: 'Pantalla Buscar con el campo de búsqueda y los botones Cerca de mí, Filtros y Sorpréndeme', title: 'Buscar', body: ['Busca por platillo, restaurante o municipio. «Cerca de mí» ordena por distancia y «🎲 Sorpréndeme» elige uno al azar.'] },
      { img: 'filtros', alt: 'Filtros de precio, preferencias, alérgenos y tipo de negocio', title: 'Filtros', body: ['Filtra por abierto ahora, precio y preferencias (picante, vegetariano, sin gluten…).', 'En «Sin» marca lo que no puedes comer, por ejemplo maní o mariscos, y esos platillos no aparecerán.'] },
      { img: 'resultado', alt: 'Tarjeta de resultado con el platillo encontrado y los botones Ver sede y Cómo llegar', title: 'Resultados', body: ['Cada tarjeta muestra el platillo que coincide, su precio y si está abierto. «Cómo llegar» abre la ruta en el mapa.'] },
      { img: 'sede', alt: 'Página del restaurante con mapa, botones de contacto y el menú', title: 'El restaurante', body: ['Ve la dirección, el mapa, el horario y el menú completo. Llama o escribe por WhatsApp con un toque.', 'Si un restaurante no te interesa, toca «🙈 No me interesa este restaurante» y dejará de salir en tus búsquedas.'] },
      { img: 'platillo', alt: 'Detalle del platillo con precio, tipo, alérgenos y reseñas', title: 'Detalle del platillo', body: ['Toca «Ver detalles ›» para ver descripción, ingredientes, alérgenos y reseñas.', 'Si tienes una alergia, confírmala siempre con el restaurante antes de pedir.'] },
      { img: 'resena', alt: 'Formulario para calificar un platillo con estrellas y un comentario', title: 'Reseñas', body: ['Con tu cuenta, califica de 1 a 5 estrellas y deja un comentario opcional. Tu reseña se publica sin tu nombre.'] },
      { img: 'guardar', alt: 'Botón Guardado en la página del restaurante', title: 'Favoritos', body: ['Toca «Guardar» en un restaurante para tenerlo a mano en la pestaña Favoritos.'] },
      { img: 'favoritos', alt: 'Pestaña Mis favoritos con un restaurante guardado', title: 'Mis favoritos', body: ['Tus restaurantes guardados, listos para abrir.'] },
      { img: 'cuenta', alt: 'Pantalla Mi cuenta para iniciar sesión o crear una cuenta', title: 'Tu cuenta', body: ['Entra con Google o con tu correo. Al registrarte te llega un correo para confirmar la cuenta. Si olvidas la contraseña, toca «¿Olvidaste tu contraseña?».'] },
      { img: 'idioma', alt: 'Opciones de idioma y accesibilidad', title: 'Idioma y letra grande', body: ['Cambia entre español e inglés. Para ver la letra más grande, usa el tamaño de fuente de tu teléfono: la app lo respeta.'] },
      { img: 'opinion', alt: 'Formulario para calificar la app', title: '¿Qué te parece AntojosGo?', body: ['En «Mi cuenta», califica la app de 1 a 5 estrellas y cuéntanos qué mejorarías. Nos ayuda mucho.'] },
    ] },
    { id: 'restaurantes', title: 'Para restaurantes', intro: 'Publicar tu restaurante es gratis. Necesitas una cuenta; después lo administras desde «Mi cuenta».', steps: [
      { img: 'registrar', alt: 'Mi cuenta con el formulario para registrar un restaurante', title: '1. Registra tu restaurante', body: ['En «Mi cuenta», escribe el nombre de tu negocio y toca «Registrar restaurante». Luego toca «Administrar negocio y sedes».'] },
      { img: 'negocio', alt: 'Tarjeta Para que te encuentren con el porcentaje completado y lo que falta', title: '2. Revisa «Para que te encuentren»', body: ['Te dice qué falta para aparecer en las búsquedas y qué tan completo está tu perfil. Lo marcado como «Imprescindible» es obligatorio; toca «Ir» para resolverlo.'] },
      { img: 'perfil', alt: 'Formulario del perfil con foto, nombre, tipo de negocio y descripción', title: '3. Completa tu perfil', body: ['Sube tu logo y una foto del local, el tipo de negocio y una descripción. Toca «Guardar perfil».'] },
      { img: 'sede-acciones', alt: 'Tarjeta de una sede con los botones de ubicación, horario, datos y publicar', title: '4. Agrega tu sede', body: ['Cada sede tiene su dirección, teléfono y WhatsApp. Si tienes varias sucursales, agrega una por cada una.'] },
      { img: 'ubicacion', alt: 'Mapa para colocar el pin en la entrada del restaurante', title: '5. Marca la ubicación', body: ['Mueve el mapa hasta que la punta del pin quede en la entrada de tu restaurante y toca «Confirmar y guardar ubicación».'] },
      { img: 'horario', alt: 'Editor de horario por día con hora de apertura y cierre', title: '6. Pon tu horario', body: ['Escribe la hora de apertura y cierre de cada día. «Copiar el lunes a todos los días» te ahorra tiempo.'] },
      { img: 'menu', alt: 'Lista del menú con un platillo, su foto, precio y botones Ocultar y Editar', title: '7. Arma tu menú', body: ['Agrega al menos 3 platillos. Puedes ocultar uno, marcarlo como agotado o editarlo en cualquier momento.'] },
      { img: 'nuevo-platillo', alt: 'Formulario de nuevo platillo con nombre, precio, descripción y foto', title: '8. Cada platillo', body: ['Nombre, precio, descripción y foto. Elige el tipo de plato, la cocina y sus características: así te encuentran más clientes.'] },
      { img: 'alergenos', alt: 'Sección de ingredientes y alérgenos del platillo', title: '9. Ingredientes y alérgenos', body: ['Agrega los ingredientes principales y declara los alérgenos. Si no los confirmas, los clientes verán «alérgenos sin declarar».'] },
      { title: '10. Publica tu sede', alt: '', body: ['Cuando tengas ubicación, horario y menú, toca «Publicar sede». Desde ese momento apareces en las búsquedas y en el asistente.', 'En «Reseñas de mis platillos» puedes responder a tus clientes o reportar una reseña inapropiada.'] },
    ] },
  ],
  help: '¿Algo no funciona o tienes una idea? Escríbenos desde «¿Qué te parece AntojosGo?» en Mi cuenta.',
  terms: 'Términos y condiciones',
  back: 'Volver a AntojosGo',
}

const en: Copy = {
  title: 'How to use AntojosGo',
  lead: 'Find what to eat in Quetzaltenango: tell the assistant what you are craving, check menus and prices and get to the restaurant. If you own a restaurant, publish it for free.',
  shotsNote: 'Screenshots show the app in Spanish. You can switch it to English in «My account».',
  install: {
    title: 'Install the app (Android)',
    steps: [
      'Tap «Download APK» on your Android phone.',
      'Open the downloaded file. If Android asks, allow «Install unknown apps» for your browser.',
      'Tap «Install» and open AntojosGo. You can also use everything at antojosgo.com without installing anything.',
    ],
    cta: 'Download APK',
  },
  parts: [
    { id: 'comensales', title: 'For diners', intro: 'You do not need an account to search. Create one only to save favorites or write reviews.', steps: [
      { img: 'inicio', alt: 'Home screen with the search box, food shortcuts and the map', title: 'Home', body: ['Type what you are craving the way you would tell a friend, or tap a shortcut such as «Pizza» or «Traditional food».', 'The map shows every published restaurant. The bell shows announcements.'] },
      { img: 'asistente', alt: 'Conversation with the assistant recommending a pizzeria', title: 'Assistant', body: ['Ask for things like «something spicy nearby», «cold dessert» or «cheap traditional food». You can also talk to it with the microphone 🎤.', 'It always answers with real AntojosGo restaurants. Tap «View location ›» to open the restaurant.'] },
      { img: 'buscar', alt: 'Search screen with the search box and the Near me, Filters and Surprise me buttons', title: 'Search', body: ['Search by dish, restaurant or town. «Near me» sorts by distance and «🎲 Surprise me» picks one at random.'] },
      { img: 'filtros', alt: 'Filters for price, preferences, allergens and business type', title: 'Filters', body: ['Filter by open now, price and preferences (spicy, vegetarian, gluten-free…).', 'Under «Without», mark what you cannot eat, such as peanuts or shellfish, and those dishes will not show up.'] },
      { img: 'resultado', alt: 'Result card with the matching dish and the View location and Directions buttons', title: 'Results', body: ['Each card shows the matching dish, its price and whether it is open. «Directions» opens the route on the map.'] },
      { img: 'sede', alt: 'Restaurant page with map, contact buttons and the menu', title: 'The restaurant', body: ['See the address, map, opening hours and full menu. Call or message on WhatsApp with one tap.', 'If a restaurant does not interest you, tap «🙈 Not interested in this restaurant» and it will stop showing in your searches.'] },
      { img: 'platillo', alt: 'Dish details with price, type, allergens and reviews', title: 'Dish details', body: ['Tap «See details ›» for the description, ingredients, allergens and reviews.', 'If you have an allergy, always confirm with the restaurant before ordering.'] },
      { img: 'resena', alt: 'Form to rate a dish with stars and a comment', title: 'Reviews', body: ['With an account, rate from 1 to 5 stars and add an optional comment. Your review is published without your name.'] },
      { img: 'guardar', alt: 'Saved button on the restaurant page', title: 'Favorites', body: ['Tap «Save» on a restaurant to keep it handy in the Favorites tab.'] },
      { img: 'favoritos', alt: 'My favorites tab with a saved restaurant', title: 'My favorites', body: ['Your saved restaurants, ready to open.'] },
      { img: 'cuenta', alt: 'My account screen to sign in or create an account', title: 'Your account', body: ['Sign in with Google or your email. When you sign up you get an email to confirm your account. If you forget your password, tap «Forgot your password?».'] },
      { img: 'idioma', alt: 'Language and accessibility options', title: 'Language and larger text', body: ['Switch between Spanish and English. For larger text, use your phone\'s font size: the app follows it.'] },
      { img: 'opinion', alt: 'Form to rate the app', title: 'What do you think of AntojosGo?', body: ['In «My account», rate the app from 1 to 5 stars and tell us what you would improve. It helps us a lot.'] },
    ] },
    { id: 'restaurantes', title: 'For restaurants', intro: 'Publishing your restaurant is free. You need an account; then you manage it from «My account».', steps: [
      { img: 'registrar', alt: 'My account with the form to register a restaurant', title: '1. Register your restaurant', body: ['In «My account», type your business name and tap «Register restaurant». Then tap «Manage business and locations».'] },
      { img: 'negocio', alt: 'Get found card with the completion percentage and what is missing', title: '2. Check «Get found»', body: ['It tells you what is missing to appear in searches and how complete your profile is. Items marked «Required» are mandatory; tap «Go» to fix them.'] },
      { img: 'perfil', alt: 'Profile form with photo, name, business type and description', title: '3. Complete your profile', body: ['Upload your logo and a photo of the place, the business type and a description. Tap «Save profile».'] },
      { img: 'sede-acciones', alt: 'Location card with the map, hours, details and publish buttons', title: '4. Add your location', body: ['Each location has its address, phone and WhatsApp. If you have several branches, add one for each.'] },
      { img: 'ubicacion', alt: 'Map to place the pin at the restaurant entrance', title: '5. Mark it on the map', body: ['Move the map until the tip of the pin is on your restaurant\'s entrance and tap «Confirm and save location».'] },
      { img: 'horario', alt: 'Opening hours editor with opening and closing time per day', title: '6. Set your hours', body: ['Enter the opening and closing time for each day. «Copy Monday to every day» saves time.'] },
      { img: 'menu', alt: 'Menu list with a dish, its photo, price and Hide and Edit buttons', title: '7. Build your menu', body: ['Add at least 3 dishes. You can hide one, mark it as sold out or edit it at any time.'] },
      { img: 'nuevo-platillo', alt: 'New dish form with name, price, description and photo', title: '8. Each dish', body: ['Name, price, description and photo. Choose the dish type, cuisine and features: that is how more diners find you.'] },
      { img: 'alergenos', alt: 'Ingredients and allergens section of the dish', title: '9. Ingredients and allergens', body: ['Add the main ingredients and declare the allergens. If you do not confirm them, diners will see «allergens not declared».'] },
      { title: '10. Publish your location', alt: '', body: ['Once you have location, hours and menu, tap «Publish location». From then on you appear in searches and in the assistant.', 'In «Reviews of my dishes» you can reply to diners or report an inappropriate review.'] },
    ] },
  ],
  help: 'Something not working, or have an idea? Write to us from «What do you think of AntojosGo?» in My account.',
  terms: 'Terms of use',
  back: 'Back to AntojosGo',
}

export default function GuidePage() {
  const { lang } = useLanguage()
  const c = lang === 'en' ? en : es
  return <main className="min-h-dvh bg-background px-4 py-8">
    <div className="mx-auto max-w-4xl space-y-8">
      <Link href="/" className="text-sm font-semibold text-[#173F35] hover:underline">← {c.back}</Link>
      <header className="flex items-start gap-4">
        <img src="/logo.png" alt="" width={72} height={72} className="shrink-0 rounded-2xl" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[#173F35] sm:text-4xl">{c.title}</h1>
          <p className="max-w-2xl text-stone-700">{c.lead}</p>
          {c.shotsNote && <p className="text-sm text-stone-500">{c.shotsNote}</p>}
        </div>
      </header>

      <nav aria-label={c.title} className="flex flex-wrap gap-2">
        {c.parts.map(p => <a key={p.id} href={`#${p.id}`} className="rounded-full border border-[#173F35] px-4 py-2 text-sm font-semibold text-[#173F35] hover:bg-[#173F35] hover:text-white">{p.title}</a>)}
      </nav>

      <section aria-labelledby="instalar" className="rounded-[24px] border border-[#BD481F]/30 bg-[#BD481F]/5 p-6">
        <h2 id="instalar" className="text-xl font-bold text-[#173F35]">{c.install.title}</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-stone-800">{c.install.steps.map(s => <li key={s}>{s}</li>)}</ol>
        <a href={APK_DOWNLOAD_URL} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-lg bg-[#BD481F] px-4 py-2 font-semibold text-white hover:bg-[#9a3a18]">{c.install.cta}</a>
      </section>

      {c.parts.map(p => <section key={p.id} id={p.id} aria-labelledby={`${p.id}-t`} className="scroll-mt-6 space-y-5">
        <div className="space-y-1">
          <h2 id={`${p.id}-t`} className="text-2xl font-bold text-[#173F35]">{p.title}</h2>
          <p className="text-stone-700">{p.intro}</p>
        </div>
        <div className="space-y-4">{p.steps.map(s => <article key={s.title} className="grid items-start gap-5 rounded-[24px] border bg-white p-5 shadow-sm sm:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[#173F35]">{s.title}</h3>
            {s.body.map(b => <p key={b} className="leading-relaxed text-stone-800">{b}</p>)}
          </div>
          {s.img && <img src={`/guia/${s.img}.webp`} alt={s.alt} loading="lazy" className="mx-auto w-full max-w-[260px] rounded-2xl border border-stone-200 shadow-sm" />}
        </article>)}</div>
      </section>)}

      <footer className="space-y-2 border-t pt-6 text-sm text-stone-600">
        <p>{c.help}</p>
        <Link href="/terminos" className="font-semibold text-[#173F35] underline">{c.terms}</Link>
      </footer>
    </div>
  </main>
}
