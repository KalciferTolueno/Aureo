import { expect, test } from '@playwright/test'

const profile = { email:'', nombre:'Melita', fecha_nacimiento:'', hora_nacimiento:null, lugar_nacimiento:null, signo:'aries', numero_personal:1, palabraPoder:'Presencia', clave_app_hash:'', secciones_activas:['companeros','plantas','finanzas'], capaPremiumActiva:false, onboarding_completo:true }

test.beforeEach(async ({ page }) => {
  await page.addInitScript((value) => {
    if (!localStorage.getItem('aureo_configuracion')) localStorage.setItem('aureo_configuracion', JSON.stringify(value))
  }, profile)
})

test('abre las rutas recuperadas sin errores visibles', async ({ page }) => {
  test.setTimeout(60_000)
  const routes = ['/', '/mundos', '/mundos/cuidado', '/mundos/constelacion', '/mundos/companeros', '/mundos/decretos', '/mundos/plantas', '/mundos/hobbies', '/mundos/travesias', '/balance', '/finanzas', '/nucleo', '/ajustes', '/edad-dorada', '/conocimiento', '/laboratorio-tailwind']
  for (const route of routes) {
    await page.goto(`/#${route}`)
    await page.waitForTimeout(300)
    await expect(page.locator('.route-content > main:visible')).toHaveCount(1)
    await expect(page.locator('main')).toBeVisible()
    const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }))
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
  }
})

test('conecta la portada Tailwind con las funciones reales de cada eje', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await page.goto('/#/laboratorio-tailwind')
  await expect(page.locator('main.tailwind-lab')).toHaveAttribute('data-zodiac', 'aries')
  await expect.poll(() => page.locator('main.tailwind-lab').evaluate((element) => ({ zodiac: getComputedStyle(element).getPropertyValue('--zodiac-color').trim(), gold: getComputedStyle(element).getPropertyValue('--lab-gold').trim() }))).toEqual({ zodiac: '#b86b56', gold: '#c9a86a' })
  await expect(page.getByRole('heading', { name: /Buenos días|Buenas tardes|Buenas noches/ })).toBeVisible()
  await page.getByRole('button', { name: /Abrir el mazo/ }).click()
  await expect(page.getByRole('heading', { name: 'Tu mazo diario' })).toBeVisible()
  await expect(page.getByText('Vista experimental')).toHaveCount(0)
  await expect(page.getByText(/esta vista solo lee/i)).toHaveCount(0)

  await page.getByRole('button', { name: 'Mundos', exact: true }).click()
  await page.getByRole('button', { name: /Hobbies, \d+ registros/ }).click()
  await expect(page).toHaveURL(/#\/laboratorio-tailwind\?.*detail=world-hobbies/)
  await expect(page.getByRole('heading', { name: 'Hobbies' })).toBeVisible()
  await page.getByLabel('¿Qué es?').fill('Cerámica desde Tailwind')
  await page.getByLabel('¿Cómo te hace sentir?').fill('Presente y curiosa')
  await page.getByRole('button', { name: 'Agregar' }).click()
  await expect(page.getByText('Cerámica desde Tailwind')).toBeVisible()
  await page.getByRole('button', { name: 'Volver a Mundos' }).click()

  await page.getByRole('button', { name: 'Mi Balance', exact: true }).click()
  const before = await page.evaluate(() => localStorage.getItem('aureo_balance_movimientos'))
  await page.getByRole('button', { name: 'Registrar movimiento' }).click()
  await expect(page.getByRole('dialog', { name: 'Registrar movimiento' })).toBeVisible()
  await expect(page).toHaveURL(/#\/laboratorio-tailwind\?axis=balance$/)
  await page.getByLabel('Monto').fill('1200')
  await page.getByLabel('Una nota, si la necesitas').fill('Movimiento desde Tailwind')
  await page.getByRole('button', { name: 'Guardar movimiento' }).click()
  const after = await page.evaluate(() => localStorage.getItem('aureo_balance_movimientos'))
  expect(after).not.toBe(before)
  await expect(page.getByRole('dialog', { name: 'Registrar movimiento' })).toHaveCount(0)
  await expect(page.locator('.balance-home-blossom')).toHaveCount(1)
  await page.getByRole('button', { name: 'Nueva meta' }).click()
  await expect(page.getByRole('dialog', { name: 'Crear una meta' })).toBeVisible()
  await page.getByLabel('¿Qué estás construyendo?').fill('Viaje sereno')
  await page.getByLabel('Meta', { exact: true }).fill('50000')
  await page.getByRole('button', { name: 'Crear meta' }).click()
  await expect(page.getByRole('dialog', { name: 'Crear una meta' })).toHaveCount(0)
  await expect(page).toHaveURL(/#\/laboratorio-tailwind\?axis=balance$/)

  await page.getByRole('button', { name: 'Núcleo', exact: true }).click()
  await page.getByLabel('Escríbelo. Nadie más lo verá.').fill('Pensamiento desde Tailwind')
  await page.getByRole('button', { name: 'Dejarlo aquí' }).click()
  await page.getByRole('button', { name: /Abrir .*: Pensamiento desde Tailwind/ }).click()
  await expect(page.getByRole('dialog', { name: 'Pensamiento de Núcleo' })).toContainText('Pensamiento desde Tailwind')
  await page.getByRole('button', { name: 'Cerrar pensamiento' }).click()

  await page.getByRole('button', { name: 'Edad Dorada', exact: true }).click()
  await page.getByLabel('¿Qué reconoces hoy?').fill('Declaración desde Tailwind')
  await page.getByRole('button', { name: 'Formar una grieta' }).click()
  await expect(page.getByRole('status')).toContainText('Una nueva grieta guarda este momento')
  await expect(page.locator('.golden-daruma-entry-crack')).toHaveCount(1)
  if (process.env.CAPTURE_TAILWIND === '1') {
    await page.getByRole('button', { name: 'Mi Balance', exact: true }).click()
    await page.evaluate(async () => {
      await document.fonts.ready
      window.scrollTo(0, 0)
      ;(document.activeElement as HTMLElement | null)?.blur()
    })
    await page.waitForTimeout(350)
    await page.screenshot({ path: `.impeccable/review/${testInfo.project.name}.png` })
  }
})

test('mantiene todos los espacios Tailwind dentro del ancho móvil', async ({ page }, testInfo) => {
  test.setTimeout(75_000)
  const routes = [
    '?axis=umbral', '?axis=mundos', '?axis=mundos&detail=world-vinculos', '?axis=mundos&detail=world-decretos',
    '?axis=mundos&detail=world-hobbies', '?axis=mundos&detail=world-travesias', '?axis=mundos&detail=world-cuidado',
    '?axis=balance&detail=balance&action=movimiento', '?axis=balance&detail=balance&action=meta',
    '?axis=nucleo', '?axis=edad-dorada', '?axis=edad-dorada&detail=edad-dorada', '?axis=umbral&detail=umbral',
  ]
  const verifyWidth = async () => {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
    const controls = page.locator('main.tailwind-lab :is(input, select, textarea, button):visible')
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    for (const box of await controls.evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        label: element.getAttribute('aria-label') || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) || element.tagName,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        cssWidth: getComputedStyle(element).width,
      }
    }))) {
      if (box.width === 0) continue
      expect(box.left, `${page.url()} · ${box.label}`).toBeGreaterThanOrEqual(-1)
      expect(box.right, `${page.url()} · ${box.label} · ancho CSS ${box.cssWidth}`).toBeLessThanOrEqual(viewportWidth + 1)
    }
  }
  const waitForRouteTransition = async () => {
    await expect.poll(() => page.locator('main.tailwind-lab').evaluate((element) => !/app-(forward|back)-enter-active/.test(element.className))).toBe(true)
  }
  if (testInfo.project.name === 'desktop') await page.setViewportSize({ width: 320, height: 568 })
  for (const query of routes) { await page.goto(`/#/laboratorio-tailwind${query}`); await waitForRouteTransition(); await verifyWidth() }
  if (testInfo.project.name === 'desktop') {
    await page.setViewportSize({ width: 568, height: 320 })
    for (const query of ['?axis=balance&detail=balance&action=movimiento', '?axis=edad-dorada&detail=edad-dorada']) { await page.goto(`/#/laboratorio-tailwind${query}`); await waitForRouteTransition(); await verifyWidth() }
  }
})

test('convierte los gastos de Mi Balance en flores interactivas del cerezo', async ({ page }, testInfo) => {
  await page.goto('/#/laboratorio-tailwind?axis=balance&detail=balance&action=movimiento')
  const expenses = [
    ['1800', 'Pan para la casa'],
    ['5400', 'Flores del mercado'],
    ['3200', 'Un viaje tranquilo'],
  ] as const
  for (const [amount, note] of expenses) {
    await page.getByLabel('Monto').fill(amount)
    await page.getByLabel('Una nota, si la necesitas').fill(note)
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    if (note !== expenses.at(-1)?.[1]) await page.getByRole('button', { name: 'Registrar movimiento' }).click()
  }
  await expect(page.locator('.balance-blossom')).toHaveCount(3)
  await page.locator('.balance-blossom').first().click()
  await expect(page.getByRole('status')).toContainText('Un viaje tranquilo')
  await expect(page.getByRole('status')).toContainText('$3.200')
  await page.goto('/#/laboratorio-tailwind?axis=balance')
  await expect(page.locator('.balance-home-blossom')).toHaveCount(3)
  await expect(page.getByRole('button', { name: /Abrir Mi Balance\. 3 flores de gastos/ })).toBeVisible()
  if (process.env.CAPTURE_TAILWIND === '1') {
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0) })
    await page.waitForTimeout(700)
    await page.screenshot({ path: `.impeccable/review/balance-cerezo-${testInfo.project.name}.png`, fullPage: true })
  }
})

test('abre los registros de Balance en paneles flotantes sin cambiar de ruta', async ({ page }, testInfo) => {
  await page.goto('/#/laboratorio-tailwind?axis=balance')
  const balanceUrl = page.url()
  await page.getByRole('button', { name: 'Registrar movimiento' }).click()
  await expect(page.getByRole('dialog', { name: 'Registrar movimiento' })).toBeVisible()
  await page.getByLabel('Monto').fill('2400')
  await page.getByLabel('Una nota, si la necesitas').fill('Movimiento flotante')
  expect(page.url()).toBe(balanceUrl)
  if (process.env.CAPTURE_TAILWIND === '1') {
    await page.waitForTimeout(450)
    await page.getByRole('dialog', { name: 'Registrar movimiento' }).screenshot({ path: `.impeccable/review/balance-overlay-${testInfo.project.name}.png` })
  }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Registrar movimiento' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Nueva meta' }).click()
  await expect(page.getByRole('dialog', { name: 'Crear una meta' })).toBeVisible()
  expect(page.url()).toBe(balanceUrl)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Crear una meta' })).toHaveCount(0)
})

test('incorpora el matiz zodiacal sin sustituir el oro base', async ({ page }) => {
  await page.goto('/#/laboratorio-tailwind')
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('aureo_configuracion') ?? '{}')
    localStorage.setItem('aureo_configuracion', JSON.stringify({ ...stored, signo: 'acuario' }))
  })
  await page.reload()
  const app = page.locator('main.tailwind-lab')
  await expect(app).toHaveAttribute('data-zodiac', 'acuario')
  await expect.poll(() => app.evaluate((element) => ({ zodiac: getComputedStyle(element).getPropertyValue('--zodiac-color').trim(), gold: getComputedStyle(element).getPropertyValue('--lab-gold').trim() }))).toEqual({ zodiac: '#638cad', gold: '#c9a86a' })
})

test('convierte Lo que cuido en un mural de afiches con imágenes', async ({ page }, testInfo) => {
  await page.goto('/#/laboratorio-tailwind?axis=mundos&detail=world-cuidado')
  await expect(page.locator('.detail-world-cuidado .ritual-form')).toHaveCount(0)
  const postersBefore = await page.locator('.care-poster').count()
  await page.getByLabel('Elegir imagen para el mural').setInputFiles({
    name: 'cuidado.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR42mNkYPj/n4GBgYGJAQoAHgQCAQ4B36sAAAAASUVORK5CYII=', 'base64'),
  })
  await expect(page.getByAltText('Vista previa del afiche')).toBeVisible()
  await page.getByLabel('Su nombre').fill('Albahaca de prueba')
  await page.getByLabel('Una frase para el afiche').fill('La cuido y ella vuelve más amable la casa.')
  await page.getByRole('button', { name: 'Sumar al mural' }).click()
  const poster = page.locator('.care-poster').filter({ hasText: 'Albahaca de prueba' })
  await expect(poster).toBeVisible()
  await expect(page.locator('.care-poster')).toHaveCount(postersBefore + 1)
  await expect(poster.locator('img')).toHaveAttribute('src', /^data:image\/jpeg/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('aureo_companeros'))).toContain('data:image/jpeg')
  if (process.env.CAPTURE_CARE === '1') {
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0) })
    await page.screenshot({ path: `.impeccable/review/care-mural-${testInfo.project.name}.png`, fullPage: true })
  }
})

test('revela el arcano mediante un mazo que respeta movimiento reducido', async ({ page }) => {
  await page.goto('/#/laboratorio-tailwind?axis=umbral')
  const deck = page.locator('.tarot-deck')
  await expect(deck).toBeVisible()
  await expect(deck.locator('.tarot-card')).toHaveCount(3)
  await expect(page.locator('.tarot-card-name')).toBeVisible()

  const motion = await deck.locator('.tarot-card').evaluateAll((cards) =>
    cards.map((card) => getComputedStyle(card).animationName),
  )
  expect(motion[0]).toContain('tarot-shuffle-left')
  expect(motion[1]).toContain('tarot-shuffle-right')
  expect(motion[2]).toContain('tarot-card-reveal')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reducedMotion = await deck.locator('.tarot-card').evaluateAll((cards) =>
    cards.map((card) => getComputedStyle(card).animationName),
  )
  expect(reducedMotion.every((animation) => animation === 'none')).toBe(true)
})

test('agrupa emociones afines en el plasma de Núcleo y abre su lectura flotante', async ({ page }) => {
  await page.goto('/#/laboratorio-tailwind?axis=nucleo')
  const entry = page.getByLabel('Escríbelo. Nadie más lo verá.')
  await entry.fill('Siento calma y paz')
  await page.getByRole('button', { name: 'Dejarlo aquí' }).click()
  await entry.fill('Respirar me trae alivio')
  await page.getByRole('button', { name: 'Dejarlo aquí' }).click()

  const points = page.locator('.nucleus-preview-point')
  await expect(points).toHaveCount(2)
  await expect(page.locator('.nucleus-preview-pool')).toHaveCount(1)
  const positions = await points.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  }))
  expect(Math.hypot(positions[0]!.x - positions[1]!.x, positions[0]!.y - positions[1]!.y)).toBeLessThan(90)

  await points.first().click()
  const dialog = page.getByRole('dialog', { name: 'Pensamiento de Núcleo' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Calma y alivio')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  const plasmaAnimation = await page.locator('.nucleus-preview-pool').evaluate((element) => getComputedStyle(element).animationName)
  expect(plasmaAnimation).toContain('nucleus-preview-plasma')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => page.locator('.nucleus-preview-pool').evaluate((element) => getComputedStyle(element).animationName)).toBe('none')
})

test('abre los pensamientos desde la portada de Núcleo sin cambiar de sección', async ({ page }) => {
  await page.goto('/#/laboratorio-tailwind?axis=nucleo')
  const thoughtText = 'La calma me acompaña esta tarde'
  await page.getByLabel('Escríbelo. Nadie más lo verá.').fill(thoughtText)
  await page.getByRole('button', { name: 'Dejarlo aquí' }).click()

  await expect(page).toHaveURL(/#\/laboratorio-tailwind\?axis=nucleo$/)
  await expect(page.getByRole('button', { name: 'Entrar a Núcleo' })).toHaveCount(0)
  const thoughtPoint = page.getByRole('button', { name: new RegExp(`Abrir .*: ${thoughtText}`) })
  await expect(thoughtPoint).toBeVisible()
  await thoughtPoint.click()

  await expect(page).toHaveURL(/#\/laboratorio-tailwind\?axis=nucleo$/)
  const dialog = page.getByRole('dialog', { name: 'Pensamiento de Núcleo' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(thoughtText)
  await expect(dialog).toContainText('Calma y alivio')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('protege Núcleo con la melodía de la franja actual', async ({ page }) => {
  await page.goto('/#/laboratorio-tailwind?axis=nucleo')
  await page.evaluate(async () => {
    const stored = JSON.parse(localStorage.getItem('aureo_configuracion') ?? '{}')
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('Do|Re|Mi'))
    const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
    localStorage.setItem('aureo_configuracion', JSON.stringify({ ...stored, clave_app_hash: hash }))
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('aureo_nucleo_')) sessionStorage.removeItem(key)
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tu sanctum' })).toBeVisible()
  await expect(page.getByLabel('Escríbelo. Nadie más lo verá.')).toHaveCount(0)
  for (const note of ['Do', 'Re', 'Mi']) await page.getByRole('button', { name: note, exact: true }).click()
  await expect(page.getByLabel('Escríbelo. Nadie más lo verá.')).toBeVisible()
})

test('asigna cada vínculo a su órbita dentro de Mi Constelación', async ({ page }, testInfo) => {
  await page.goto('/#/laboratorio-tailwind?axis=mundos&detail=world-vinculos')
  const name = page.getByLabel('¿Cómo se llama?')
  const category = page.getByRole('combobox').first()
  const sign = page.getByLabel('¿Cuál es su signo?')
  const add = page.getByRole('button', { name: 'Encender en mi constelación' })

  for (const entry of [
    { name: 'Camila', category: 'Amor', sign: 'Aries' },
    { name: 'Elena', category: 'Familia', sign: 'Libra' },
    { name: 'Marina', category: 'Guía', sign: 'Piscis' },
  ]) {
    await name.fill(entry.name)
    await category.selectOption(entry.category)
    await sign.selectOption(entry.sign)
    await add.click()
  }

  const map = page.locator('.constellation-map')
  await expect(map.locator('[data-orbit="1"]')).toHaveCount(1)
  await expect(map.locator('[data-orbit="2"]')).toHaveCount(1)
  await expect(map.locator('[data-orbit="3"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Marina, Guía, órbita exterior' }).click()
  await expect(page.locator('.constellation-reading')).toBeVisible()
  await expect(page.locator('.constellation-reading')).toContainText('Marina')
  await expect(page.locator('.constellation-reading')).toContainText('Guía · órbita exterior')
  await expect(page.locator('.constellation-reading')).toContainText('Piscis')
  await expect(page).toHaveURL(/detail=world-vinculos/)

  const animation = await map.locator('[data-orbit="1"] > span').evaluate((element) => getComputedStyle(element).animationName)
  expect(animation).toContain('constellation-star-pulse')
  if (process.env.CAPTURE_CONSTELLATION === '1') {
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0) })
    await page.screenshot({ path: `.impeccable/review/constellation-${testInfo.project.name}.png`, fullPage: true })
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => map.locator('[data-orbit="1"] > span').evaluate((element) => getComputedStyle(element).animationName)).toBe('none')
})

test('activa un Decreto con tres pulsaciones y confirma que ya es mío', async ({ page }) => {
  await page.goto('/#/laboratorio-tailwind?axis=mundos&detail=world-decretos')
  await page.getByLabel('Tu decreto').fill('Vivo cerca de lo que me hace real')
  await page.getByRole('button', { name: 'Lo decreto' }).click()
  const activate = page.getByRole('button', { name: 'Activar' })
  await activate.click()
  const ritual = page.getByRole('dialog', { name: 'Ritual de decreto' })
  for (let index = 0; index < 3; index += 1) await ritual.click({ position: { x: 80, y: 80 } })
  await expect(ritual).toContainText('Decretado.')
  await expect(ritual).toHaveCount(0)
  await activate.click({ delay: 700 })
  await expect(page.getByRole('dialog', { name: 'Esto ya es mío' })).toBeVisible()
  await page.getByRole('button', { name: 'Esto ya es mío' }).click()
  const decree = await page.evaluate(() => JSON.parse(localStorage.getItem('aureo_decretos') ?? '[]').at(-1))
  expect(decree.cumplido).toBe(true)
})

test('ubica Travesías en el mapa y transfiere un Daruma completo sin datos financieros', async ({ page }) => {
  await page.goto('/#/laboratorio-tailwind?axis=mundos&detail=world-travesias')
  await page.getByRole('textbox', { name: 'Lugar', exact: true }).fill('Valparaíso')
  await page.getByLabel('Latitud').fill('-33.0472')
  await page.getByLabel('Longitud').fill('-71.6127')
  await page.getByLabel('¿Qué viviste ahí?').fill('El viento junto al mar')
  await page.getByRole('button', { name: 'Agregar' }).click()
  await expect(page.getByRole('button', { name: /Valparaíso, lugar que llamas/ })).toBeVisible()

  await page.goto('/#/laboratorio-tailwind?axis=balance&detail=balance&action=meta')
  await page.getByLabel('¿Qué estás construyendo?').fill('Viaje')
  await page.getByLabel('Meta', { exact: true }).fill('100')
  await page.getByRole('button', { name: 'Crear Daruma' }).click()
  await page.getByLabel('Aportar a la meta').fill('100')
  await page.getByRole('button', { name: 'Aportar' }).click()
  await page.getByRole('button', { name: /Llevar a Edad Dorada/ }).click()
  const transferred = await page.evaluate(() => JSON.parse(localStorage.getItem('aureo_edad_dorada_declaraciones') ?? '[]').at(-1))
  expect(transferred).toMatchObject({ texto: '', origen: 'daruma_balance', daruma_color: '#C9A86A' })
  expect(transferred).not.toHaveProperty('monto')
})

test('forma y permite recorrer las grietas del Daruma de Edad Dorada', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  await page.goto('/#/laboratorio-tailwind?axis=edad-dorada')
  await expect(page.locator('.golden-daruma-entry')).toBeVisible()
  await expect(page.locator('.golden-resin-lab')).toHaveCount(0)
  await page.getByLabel('¿Qué reconoces hoy?').fill('Reconozco mi valentía presente')
  await page.getByRole('button', { name: 'Formar una grieta' }).click()
  await expect(page.locator('.golden-daruma-entry-crack')).toHaveCount(1)
  await page.getByRole('button', { name: 'Contemplar mis grietas' }).first().click()
  await expect(page).toHaveURL(/axis=edad-dorada&detail=edad-dorada/)
  const entry = page.getByLabel('¿Qué reconoces hoy?')
  for (const declaration of ['Estoy construyendo una vida propia', 'Este momento también es plenitud']) {
    await entry.fill(declaration)
    await page.getByRole('button', { name: 'Formar una grieta' }).click()
  }

  const cracks = page.locator('.daruma-crack')
  await expect(cracks).toHaveCount(3)
  const currentCrack = page.getByRole('button', { name: 'Declaración: Este momento también es plenitud' })
  await expect(currentCrack).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.golden-crack-reading')).toContainText('Este momento también es plenitud')
  await page.getByRole('button', { name: 'Cerrar grieta' }).click()
  await currentCrack.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.golden-crack-reading')).toContainText('Este momento también es plenitud')

  if (process.env.CAPTURE_GOLDEN === '1') {
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0) })
    await expect(page.locator('.golden-crack-reading')).toBeVisible()
    await page.waitForTimeout(350)
    await page.screenshot({ path: `.impeccable/review/golden-daruma-${testInfo.project.name}.png`, fullPage: true })
  }

  await page.getByRole('button', { name: 'Cerrar grieta' }).click()
  await page.getByRole('button', { name: 'Contemplar mi Daruma' }).click()
  await expect(page.getByRole('button', { name: 'Volver' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Ejes de Áureo' })).toBeHidden()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => page.locator('.daruma-form').evaluate((element) => getComputedStyle(element).animationName)).toBe('none')
})

test('adapta la navegación a escritorio y móvil', async ({ page }) => {
  await page.goto('/#/')
  const navigation = page.getByRole('navigation', { name: 'Ejes de Áureo' })
  const viewport = page.viewportSize()
  const box = await navigation.boundingBox()
  expect(box).not.toBeNull()
  if ((viewport?.width ?? 0) >= 1080) {
    await expect(page.getByText('Tu universo personal')).toBeVisible()
    expect(box?.x).toBe(0)
    expect(box?.height).toBe(viewport?.height)
  } else {
    await expect(page.getByText('Tu universo personal')).toBeHidden()
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(viewport?.height)
  }
})

test('integra los datos del día en la órbita', async ({ page }) => {
  await page.goto('/#/')
  const orbit = page.locator('.hero-orbit')
  await expect(orbit.getByText('Número', { exact: true })).toBeVisible()
  await expect(orbit.getByText('Signo del día', { exact: true })).toBeVisible()
  await expect(orbit.getByText('Arcano', { exact: true })).toBeVisible()
  await expect(orbit.locator('.orbit')).toHaveCount(3)
  await expect(page.locator('.module-card.featured')).toHaveCount(0)
  const animationName = await orbit.locator('.orbit-motion').first().evaluate((element) => getComputedStyle(element).animationName)
  expect(animationName).toBe('orbit-spin')
  const movementDelays = await orbit.locator('.orbit-motion, .orbit-counter').evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).animationDelay),
  )
  expect(movementDelays.every((delay) => delay === '0s')).toBe(true)
  const counterTransforms = await orbit.locator('.orbit-counter').evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).transform),
  )
  expect(counterTransforms).toHaveLength(3)
  expect(counterTransforms.every((transform) => transform !== 'none')).toBe(true)
})

test('conserva el estado de una vista al cambiar de eje', async ({ page }) => {
  await page.goto('/#/')
  await expect(page.locator('.app-shell')).toBeVisible()
  const backgrounds = await page.evaluate(() => ({
    body: getComputedStyle(document.body).backgroundImage,
    view: getComputedStyle(document.querySelector('.app-shell') as HTMLElement).backgroundImage,
  }))
  expect(backgrounds.view).toBe(backgrounds.body)
  const intention = page.getByLabel('Nueva intención')
  await intention.fill('Una intención todavía sin guardar')
  await page.getByRole('link', { name: 'Mundos', exact: true }).click()
  await expect(page).toHaveURL(/#\/mundos$/)
  await page.getByRole('link', { name: 'Umbral', exact: true }).click()
  await expect(page).toHaveURL(/#\/$/)
  await expect(intention).toHaveValue('Una intención todavía sin guardar')
})

test('crea y conserva un hobby', async ({ page }) => {
  await page.goto('/#/mundos/hobbies')
  await page.getByRole('button', { name: 'Agregar' }).click()
  await page.getByLabel('¿Qué es?').fill('Acuarela')
  await page.getByLabel('Cómo te hace sentir').fill('En calma')
  await page.getByRole('dialog', { name: 'Un nuevo hobby' }).getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(page.getByText('Acuarela')).toBeVisible()
  await page.reload()
  await expect(page.getByText('En calma')).toBeVisible()
})

test('sigue disponible sin conexión y conserva los cambios locales', async ({ page, context }) => {
  await page.goto('/#/mundos/hobbies')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await context.setOffline(true)
  try {
    await page.getByRole('button', { name: 'Agregar' }).click()
  await page.getByLabel('¿Qué es?').fill('Bitácora offline')
    await page.getByLabel('Cómo te hace sentir').fill('Protegida')
    await page.getByRole('dialog', { name: 'Un nuevo hobby' }).getByRole('button', { name: 'Agregar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Protegida', exact: true })).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Un nuevo hobby' })).toBeHidden()

    await page.evaluate(() => { window.location.hash = '#/mundos' })
    await expect(page).toHaveURL(/#\/mundos$/)
    await page.evaluate(() => { window.location.hash = '#/mundos/hobbies' })
    await expect(page.getByRole('button', { name: 'Protegida', exact: true })).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
})

test('el diálogo conserva un recorrido de teclado accesible', async ({ page }) => {
  await page.goto('/#/mundos/hobbies')
  const trigger = page.getByRole('button', { name: 'Agregar' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Un nuevo hobby' })
  await expect(dialog).toBeVisible()
  await expect(page.getByLabel('¿Qué es?')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
