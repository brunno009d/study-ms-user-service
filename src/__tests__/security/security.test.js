import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// ─── Mock Supabase — solo para controlar el resultado de auth.getUser ─────────
const mockSb = vi.hoisted(() => ({
  auth: {
    getUser:             vi.fn(),
    signInWithPassword:  vi.fn(),
    admin: { createUser: vi.fn(), deleteUser: vi.fn() },
  },
  from:  vi.fn(),
}))
vi.mock('../../config/supabase.js', () => ({ default: mockSb }))

import app from '../../app.js'

const VALID_TOKEN = 'Bearer valid-test-token'

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockSb.auth.getUser.mockResolvedValue({
    data: { user: { id: 'u1' } }, error: null,
  })
  // Por defecto, createUser y signInWithPassword responden con un error de Supabase
  // (simula credenciales inválidas) para no necesitar lógica de BD real
  mockSb.auth.admin.createUser.mockResolvedValue({
    data: { user: { id: 'u2', email: 'test@b.com' } }, error: null,
  })
  mockSb.auth.signInWithPassword.mockResolvedValue({
    data: null, error: new Error('Invalid login credentials'),
  })
})

// ─── T6.1 — Autenticación y JWT ───────────────────────────────────────────────

describe('Seguridad — Autenticación y JWT', () => {
  it('401 — sin header Authorization la petición es rechazada sin revelar detalles', async () => {
    const res = await request(app).get('/profile')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
    expect(res.body).not.toHaveProperty('stack')         // no exponer stack trace
  })

  it('401 — JWT malformado (sin punto) retorna 401 sin detalles internos', async () => {
    mockSb.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid JWT') })
    const res = await request(app).get('/profile').set('Authorization', 'Bearer INVALID_TOKEN_NO_DOTS')
    expect(res.status).toBe(401)
    expect(res.body).not.toHaveProperty('stack')
  })

  it('401 — JWT con estructura correcta pero firma falsa retorna 401', async () => {
    mockSb.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid signature') })
    const res = await request(app).get('/profile').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.FAKESIGNATURE')
    expect(res.status).toBe(401)
    expect(res.body).not.toHaveProperty('stack')
  })

  it('401 — header con formato incorrecto (sin "Bearer") retorna 401', async () => {
    const res = await request(app).get('/profile').set('Authorization', 'Token abc123')
    expect(res.status).toBe(401)
  })

  it('401 — token expirado retorna 401', async () => {
    mockSb.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('JWT expired') })
    const res = await request(app).get('/profile').set('Authorization', VALID_TOKEN)
    expect(res.status).toBe(401)
  })
})

// ─── T6.2 — Inputs maliciosos ─────────────────────────────────────────────────

describe('Seguridad — Inputs maliciosos no provocan crash 500', () => {
  it('campo email con 10.000 caracteres no provoca crash en POST /register', async () => {
    const res = await request(app).post('/register').send({
      email:     'a'.repeat(10000) + '@b.com',
      password:  'pass123',
      full_name: 'Ana',
    })
    expect(res.status).not.toBe(500)
  })

  it('campo full_name con 10.000 caracteres no provoca crash en POST /register', async () => {
    const res = await request(app).post('/register').send({
      email:     'a@b.com',
      password:  'pass123',
      full_name: 'A'.repeat(10000),
    })
    expect(res.status).not.toBe(500)
  })

  it('body con tipos incorrectos no provoca crash en POST /register', async () => {
    const res = await request(app).post('/register').send({
      email:     ['a', 'b'],   // array en vez de string
      password:  null,
      full_name: { nested: 'obj' },
    })
    expect(res.status).not.toBe(500)
  })

  it('body vacío no provoca crash en POST /register', async () => {
    const res = await request(app).post('/register').send({})
    expect(res.status).not.toBe(500)
  })

  it('body con caracteres especiales no provoca crash en POST /login', async () => {
    const res = await request(app).post('/login').send({
      email:    "<script>alert('xss')</script>@b.com",
      password: "'; DROP TABLE users;--",
    })
    expect(res.status).not.toBe(500)
  })
})

// ─── T6.3 — Seguridad en respuestas ──────────────────────────────────────────

describe('Seguridad — Las respuestas no exponen información sensible', () => {
  it('un error de servidor no expone stack trace en el body', async () => {
    // Simular error inesperado de Supabase
    mockSb.auth.getUser.mockRejectedValue(new Error('Internal Supabase crash'))
    const res = await request(app).get('/profile').set('Authorization', VALID_TOKEN)
    expect(res.body).not.toHaveProperty('stack')
    expect(res.body).not.toHaveProperty('trace')
  })

  it('campo "role" en body de PUT /profile no pasa al update de Supabase', async () => {
    // Este test documenta que el service filtra campos no permitidos
    // Arrange — el mockSb.from captura qué llega al update
    let capturedUpdate = null
    const chain = {
      update:      vi.fn().mockImplementation((d) => { capturedUpdate = d; return chain }),
      select:      vi.fn().mockReturnThis(),
      eq:          vi.fn().mockReturnThis(),
      single:      vi.fn().mockResolvedValue({ data: { id: 'u1', full_name: 'Ana' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'u1', full_name: 'Ana' }, error: null }),
      then: Promise.resolve({ data: { id: 'u1', full_name: 'Ana' }, error: null }).then.bind(
        Promise.resolve({ data: { id: 'u1', full_name: 'Ana' }, error: null })
      ),
    }
    mockSb.from.mockReturnValue(chain)

    const res = await request(app)
      .put('/profile')
      .set('Authorization', VALID_TOKEN)
      .send({ full_name: 'Ana', role: 'admin', is_admin: true })

    expect(res.status).not.toBe(500)
    // Si se llegó al update, no debe contener "role" ni "is_admin"
    if (capturedUpdate) {
      expect(capturedUpdate).not.toHaveProperty('role')
      expect(capturedUpdate).not.toHaveProperty('is_admin')
    }
  })
})
