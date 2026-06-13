import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// ─── Mock supabase (requireAuth llama a supabase.auth.getUser) ────────────────
const mockSb = vi.hoisted(() => ({ auth: { getUser: vi.fn() } }))
vi.mock('../../config/supabase.js', () => ({ default: mockSb }))

// ─── Mock capa de servicio ────────────────────────────────────────────────────
vi.mock('../../service/userService.js', () => ({
  register:      vi.fn(),
  login:         vi.fn(),
  getProfile:    vi.fn(),
  updateProfile: vi.fn(),
  deleteAccount: vi.fn(),
}))

import * as userService from '../../service/userService.js'
import app from '../../app.js'

const AUTH = { Authorization: 'Bearer test-token' }

beforeEach(() => {
  vi.clearAllMocks()
  // Auth exitosa por defecto
  mockSb.auth.getUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null })
})

// ─── Rutas públicas (sin autenticación) ───────────────────────────────────────

describe('POST /register', () => {
  it('retorna 201 al registrar un usuario nuevo', async () => {
    // Arrange
    userService.register.mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' }, session: {} })
    // Act
    const res = await request(app).post('/register').send({
      email: 'a@b.com', password: 'pass123', full_name: 'Ana'
    })
    // Assert
    expect(res.status).toBe(201)
    expect(userService.register).toHaveBeenCalledWith('a@b.com', 'pass123', 'Ana')
  })

  it('retorna 400 cuando faltan campos obligatorios', async () => {
    const res = await request(app).post('/register').send({ email: 'a@b.com' })
    expect(res.status).toBe(400)
    expect(userService.register).not.toHaveBeenCalled()
  })
})

describe('POST /login', () => {
  it('retorna 200 con sesión al autenticarse correctamente', async () => {
    // Arrange
    userService.login.mockResolvedValue({ access_token: 'tok', user: { id: 'u1' } })
    // Act
    const res = await request(app).post('/login').send({ email: 'a@b.com', password: 'pass123' })
    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('access_token')
  })

  it('retorna 400 cuando faltan campos', async () => {
    const res = await request(app).post('/login').send({ email: 'a@b.com' })
    expect(res.status).toBe(400)
  })

  it('retorna 401 cuando las credenciales son inválidas', async () => {
    const err = new Error('Invalid login credentials')
    err.statusCode = 401
    userService.login.mockRejectedValue(err)
    const res = await request(app).post('/login').send({ email: 'a@b.com', password: 'mal' })
    expect(res.status).toBe(401)
  })
})

// ─── Rutas protegidas ─────────────────────────────────────────────────────────

describe('requireAuth — rutas protegidas', () => {
  it('retorna 401 sin header de autorización', async () => {
    const res = await request(app).get('/profile')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'unauthorized')
  })

  it('retorna 401 cuando el token es inválido', async () => {
    mockSb.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Token inválido') })
    const res = await request(app).get('/profile').set(AUTH)
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'invalid_token')
  })
})

describe('GET /profile', () => {
  it('retorna 200 con el perfil del usuario autenticado', async () => {
    // Arrange
    userService.getProfile.mockResolvedValue({ id: 'test-user-id', full_name: 'Ana' })
    // Act
    const res = await request(app).get('/profile').set(AUTH)
    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id', 'test-user-id')
  })
})

describe('PUT /profile', () => {
  it('retorna 400 cuando el body está vacío', async () => {
    const res = await request(app).put('/profile').set(AUTH).send({})
    expect(res.status).toBe(400)
  })

  it('retorna 200 con el perfil actualizado', async () => {
    userService.updateProfile.mockResolvedValue({ id: 'test-user-id', full_name: 'Nuevo' })
    const res = await request(app).put('/profile').set(AUTH).send({ full_name: 'Nuevo' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('full_name', 'Nuevo')
  })
})

describe('DELETE /profile', () => {
  it('retorna 204 al eliminar la cuenta', async () => {
    userService.deleteAccount.mockResolvedValue({ deleted: true })
    const res = await request(app).delete('/profile').set(AUTH)
    expect(res.status).toBe(204)
  })
})
