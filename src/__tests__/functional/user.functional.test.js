import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// ─── Mock Supabase — única dependencia externa ────────────────────────────────
// T4 Funcional: misma frontera de mock que T3, pero cada test es un flujo
// completo de negocio encadenado en un único it().
const mockSb = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    admin: { createUser: vi.fn(), deleteUser: vi.fn() },
  },
  from: vi.fn(),
}))

vi.mock('../../config/supabase.js', () => ({ default: mockSb }))

import app from '../../app.js'

const TOKEN = 'Bearer test-token'
let mockSingle, mockUpdate

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})

  // Auth válida por defecto para todas las rutas protegidas
  mockSb.auth.getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id' } }, error: null,
  })

  // Cadena from() reutilizable; se configura por paso con mockResolvedValueOnce
  mockSingle = vi.fn()
  mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: mockSingle }),
    }),
  })
  mockSb.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ single: mockSingle }),
    }),
    update: mockUpdate,
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Flujo 1 — Ciclo de vida completo del estudiante
// ─────────────────────────────────────────────────────────────────────────────

describe('T4 — Ciclo de vida completo: registro → login → perfil → actualizar → eliminar', () => {
  it('el estudiante completa el flujo de alta hasta la baja de su cuenta', async () => {

    // ── Paso 1: Registro exitoso ───────────────────────────────────────────────
    // Arrange
    mockSb.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id', email: 'ana@test.com' } }, error: null,
    })
    // Act
    const reg = await request(app).post('/register').send({
      email: 'ana@test.com', password: 'pass123', full_name: 'Ana García',
    })
    // Assert
    expect(reg.status).toBe(201)
    expect(reg.body).toMatchObject({ email: 'ana@test.com', full_name: 'Ana García' })
    expect(mockSb.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@test.com' })
    )

    // ── Paso 2: Login con credenciales recién creadas ─────────────────────────
    // Arrange
    mockSb.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: 'test-user-id', email: 'ana@test.com' },
        session: { access_token: 'tok-abc', refresh_token: 'rtok-abc', expires_at: 9999 },
      },
      error: null,
    })
    // Act
    const login = await request(app).post('/login').send({
      email: 'ana@test.com', password: 'pass123',
    })
    // Assert
    expect(login.status).toBe(200)
    expect(login.body.session).toMatchObject({ access_token: 'tok-abc' })
    expect(login.body.user).toMatchObject({ email: 'ana@test.com' })

    // ── Paso 3: Consultar el perfil con el token ──────────────────────────────
    // Arrange
    mockSingle.mockResolvedValueOnce({
      data: { id: 'test-user-id', email: 'ana@test.com', full_name: 'Ana García' }, error: null,
    })
    // Act
    const profile = await request(app).get('/profile').set('Authorization', TOKEN)
    // Assert
    expect(profile.status).toBe(200)
    expect(profile.body.full_name).toBe('Ana García')
    expect(mockSb.from).toHaveBeenCalledWith('student')

    // ── Paso 4: Actualizar nombre (campos no permitidos se descartan) ─────────
    // Arrange
    mockSingle.mockResolvedValueOnce({
      data: { id: 'test-user-id', email: 'ana@test.com', full_name: 'Ana B.' }, error: null,
    })
    // Act — se envía "role" que no debe pasar el filtro del service
    const update = await request(app)
      .put('/profile')
      .set('Authorization', TOKEN)
      .send({ full_name: 'Ana B.', role: 'admin' })
    // Assert — el service filtró: solo full_name llega a Supabase
    expect(update.status).toBe(200)
    expect(update.body.full_name).toBe('Ana B.')
    expect(mockUpdate).toHaveBeenCalledWith({ full_name: 'Ana B.' })
    expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }))

    // ── Paso 5: Eliminar la cuenta ────────────────────────────────────────────
    // Arrange
    mockSb.auth.admin.deleteUser.mockResolvedValueOnce({ data: {}, error: null })
    // Act
    const del = await request(app).delete('/profile').set('Authorization', TOKEN)
    // Assert — deleteUser se llamó con el userId que vino del token
    expect(del.status).toBe(204)
    expect(mockSb.auth.admin.deleteUser).toHaveBeenCalledWith('test-user-id')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Flujo 2 — Errores en cadena: ningún paso se completa sin el anterior
// ─────────────────────────────────────────────────────────────────────────────

describe('T4 — Flujo de error: credenciales inválidas bloquean el acceso en cascada', () => {
  it('registro rechazado → login con credenciales malas → acceso al perfil denegado', async () => {

    // ── Paso 1: Registro con contraseña corta → service lo rechaza antes de Supabase
    // Act
    const regFail = await request(app).post('/register').send({
      email: 'ana@test.com', password: '123', full_name: 'Ana',
    })
    // Assert
    expect(regFail.status).toBe(400)
    expect(mockSb.auth.admin.createUser).not.toHaveBeenCalled()

    // ── Paso 2: Login con credenciales incorrectas → Supabase rechaza
    // Arrange
    mockSb.auth.signInWithPassword.mockRejectedValueOnce(
      new Error('Invalid login credentials')
    )
    // Act
    const loginFail = await request(app).post('/login').send({
      email: 'ana@test.com', password: 'wrongpass',
    })
    // Assert
    expect(loginFail.status).toBe(401)

    // ── Paso 3: Sin sesión válida, acceso al perfil denegado por requireAuth
    // Arrange
    mockSb.auth.getUser.mockResolvedValueOnce({
      data: { user: null }, error: new Error('No session'),
    })
    // Act
    const profileFail = await request(app).get('/profile').set('Authorization', TOKEN)
    // Assert — el middleware cortó el flujo; from() nunca se llamó
    expect(profileFail.status).toBe(401)
    expect(mockSb.from).not.toHaveBeenCalled()
  })
})
