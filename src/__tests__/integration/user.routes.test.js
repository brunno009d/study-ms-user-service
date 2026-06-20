import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// ─── Mock Supabase — única dependencia externa ────────────────────────────────
// Solo se mockea el cliente de Supabase. Todo el código real de
// controller → service → repository se ejecuta sin cambios.
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

  // Auth válida por defecto (requireAuth pasa)
  mockSb.auth.getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id' } }, error: null,
  })

  // Cadena from() fresca por test — select y update comparten el mismo mockSingle
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

// ─── POST /register ────────────────────────────────────────────────────────────

describe('POST /register', () => {
  it('201 — controller pasa al service y service llama createUser en Supabase', async () => {
    // Arrange
    mockSb.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } }, error: null,
    })
    // Act
    const res = await request(app).post('/register').send({
      email: 'a@b.com', password: 'pass123', full_name: 'Ana',
    })
    // Assert — contrato entre las tres capas verificado
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ id: 'u1', email: 'a@b.com', full_name: 'Ana' })
    expect(mockSb.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.com', password: 'pass123' })
    )
  })

  it('400 — el controller intercepta campos faltantes antes de llegar al service', async () => {
    // Arrange: falta full_name
    // Act
    const res = await request(app).post('/register').send({ email: 'a@b.com', password: 'pass123' })
    // Assert — Supabase nunca se invoca
    expect(res.status).toBe(400)
    expect(mockSb.auth.admin.createUser).not.toHaveBeenCalled()
  })

  it('400 — el service rechaza password < 6 chars y Supabase nunca se llama', async () => {
    // Arrange: todos los campos presentes pero contraseña inválida
    // Act
    const res = await request(app).post('/register').send({
      email: 'a@b.com', password: '123', full_name: 'Ana',
    })
    // Assert — service lanzó error antes de llegar al repository
    expect(res.status).toBe(400)
    expect(mockSb.auth.admin.createUser).not.toHaveBeenCalled()
  })

  it('400 — el service rechaza full_name solo con espacios y Supabase nunca se llama', async () => {
    // Arrange: controller lo deja pasar (string no vacío), service lo rechaza (trim vacío)
    // Act
    const res = await request(app).post('/register').send({
      email: 'a@b.com', password: 'pass123', full_name: '   ',
    })
    // Assert
    expect(res.status).toBe(400)
    expect(mockSb.auth.admin.createUser).not.toHaveBeenCalled()
  })

  it('409 — Supabase lanza "already registered" y el controller responde conflict', async () => {
    // Arrange: email duplicado en Supabase
    mockSb.auth.admin.createUser.mockRejectedValue(new Error('User already registered'))
    // Act
    const res = await request(app).post('/register').send({
      email: 'dup@b.com', password: 'pass123', full_name: 'Ana',
    })
    // Assert
    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('error', 'conflict')
  })
})

// ─── POST /login ───────────────────────────────────────────────────────────────

describe('POST /login', () => {
  it('200 — service valida + repository llama signInWithPassword y formatea la sesión', async () => {
    // Arrange
    mockSb.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'u1', email: 'a@b.com' },
        session: { access_token: 'tok', refresh_token: 'rtok', expires_at: 9999 },
      },
      error: null,
    })
    // Act
    const res = await request(app).post('/login').send({ email: 'a@b.com', password: 'pass123' })
    // Assert
    expect(res.status).toBe(200)
    expect(res.body.session).toMatchObject({ access_token: 'tok', refresh_token: 'rtok' })
    expect(mockSb.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com', password: 'pass123',
    })
  })

  it('400 — controller bloquea body incompleto antes de llamar a Supabase', async () => {
    // Arrange: falta password
    // Act
    const res = await request(app).post('/login').send({ email: 'a@b.com' })
    // Assert
    expect(res.status).toBe(400)
    expect(mockSb.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('401 — Supabase lanza "Invalid login credentials" y controller responde 401', async () => {
    // Arrange
    mockSb.auth.signInWithPassword.mockRejectedValue(new Error('Invalid login credentials'))
    // Act
    const res = await request(app).post('/login').send({ email: 'a@b.com', password: 'mal' })
    // Assert
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'unauthorized')
  })
})

// ─── requireAuth — middleware chain ───────────────────────────────────────────

describe('requireAuth — middleware chain', () => {
  it('401 — sin header la petición no llega ni a controller ni a Supabase from()', async () => {
    // Act
    const res = await request(app).get('/profile')
    // Assert
    expect(res.status).toBe(401)
    expect(mockSb.from).not.toHaveBeenCalled()
  })

  it('401 — token inválido: Supabase auth rechaza y nada más se ejecuta', async () => {
    // Arrange
    mockSb.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Token inválido') })
    // Act
    const res = await request(app).get('/profile').set('Authorization', TOKEN)
    // Assert
    expect(res.status).toBe(401)
    expect(mockSb.from).not.toHaveBeenCalled()
  })
})

// ─── GET /profile ──────────────────────────────────────────────────────────────

describe('GET /profile', () => {
  it('200 — cadena completa: requireAuth → service → repository → supabase.from', async () => {
    // Arrange
    mockSingle.mockResolvedValue({
      data: { id: 'test-user-id', full_name: 'Ana' }, error: null,
    })
    // Act
    const res = await request(app).get('/profile').set('Authorization', TOKEN)
    // Assert — verificamos que la cadena real llegó hasta Supabase
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 'test-user-id', full_name: 'Ana' })
    expect(mockSb.from).toHaveBeenCalledWith('student')
    expect(mockSingle).toHaveBeenCalled()
  })

  it('404 — Supabase devuelve PGRST116 y el controller traduce el error a 404', async () => {
    // Arrange: error de "fila no encontrada" de PostgREST
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } })
    // Act
    const res = await request(app).get('/profile').set('Authorization', TOKEN)
    // Assert — el contrato de error entre repository y controller funciona
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'not_found')
  })
})

// ─── PUT /profile ──────────────────────────────────────────────────────────────

describe('PUT /profile', () => {
  it('200 — service filtra campos no permitidos y update llega a Supabase solo con los válidos', async () => {
    // Arrange
    mockSingle.mockResolvedValue({
      data: { id: 'test-user-id', full_name: 'Nuevo' }, error: null,
    })
    // Act
    const res = await request(app)
      .put('/profile')
      .set('Authorization', TOKEN)
      .send({ full_name: 'Nuevo', campo_malicioso: 'evil' })
    // Assert — update recibió EXACTAMENTE solo los campos permitidos
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ full_name: 'Nuevo' })
  })

  it('400 — service rechaza body con solo campos no permitidos antes de tocar Supabase', async () => {
    // Act
    const res = await request(app)
      .put('/profile')
      .set('Authorization', TOKEN)
      .send({ campo_malicioso: 'evil' })
    // Assert
    expect(res.status).toBe(400)
    expect(mockSb.from).not.toHaveBeenCalled()
  })
})

// ─── DELETE /profile ───────────────────────────────────────────────────────────

describe('DELETE /profile', () => {
  it('204 — flujo: requireAuth → service → repository → deleteUser en Supabase', async () => {
    // Arrange
    mockSb.auth.admin.deleteUser.mockResolvedValue({ data: {}, error: null })
    // Act
    const res = await request(app).delete('/profile').set('Authorization', TOKEN)
    // Assert — deleteUser se llamó con el userId que vino del token
    expect(res.status).toBe(204)
    expect(mockSb.auth.admin.deleteUser).toHaveBeenCalledWith('test-user-id')
  })
})
