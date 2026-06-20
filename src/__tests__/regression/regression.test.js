import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

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
  mockSb.auth.getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id' } }, error: null,
  })
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

describe('Regresión — bugs corregidos en user-service', () => {

  it('[BUG-001] updateProfile no debe pasar el campo "role" a Supabase aunque venga en el body', async () => {
    // Bug: un estudiante podía enviarse role:"admin" en el body y el campo llegaba al UPDATE.
    // Fix: whitelist de campos permitidos en userService.updateProfile.
    mockSingle.mockResolvedValue({
      data: { id: 'test-user-id', full_name: 'Ana' }, error: null,
    })

    const res = await request(app)
      .put('/profile')
      .set('Authorization', TOKEN)
      .send({ full_name: 'Ana', role: 'admin' })

    expect(res.status).toBe(200)
    // El UPDATE debe contener solo full_name, nunca role
    expect(mockUpdate).toHaveBeenCalledWith({ full_name: 'Ana' })
    expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }))
  })

  it('[BUG-002] register con password de menos de 6 caracteres retorna 400 sin llamar a Supabase', async () => {
    // Bug: la validación no existía; el service llamaba a auth.admin.createUser y Supabase
    // devolvía un error interno que se propagaba como 500.
    // Fix: validación de longitud mínima de password en el controller.
    const res = await request(app).post('/register').send({
      email: 'ana@test.com', password: '123', full_name: 'Ana',
    })

    expect(res.status).toBe(400)
    expect(mockSb.auth.admin.createUser).not.toHaveBeenCalled()
  })

  it('[BUG-003] login con credenciales incorrectas retorna 401, no expone detalles internos ni crashea (500)', async () => {
    // Bug: el catch del controller relanzaba el error de Supabase directamente,
    // retornando 500 con stack trace visible al cliente.
    // Fix: el service mapea errores de auth a 401 con mensaje genérico.
    mockSb.auth.signInWithPassword.mockRejectedValueOnce(
      new Error('Invalid login credentials')
    )

    const res = await request(app).post('/login').send({
      email: 'ana@test.com', password: 'wrongpassword',
    })

    expect(res.status).toBe(401)
    expect(res.status).not.toBe(500)
    expect(res.body).not.toHaveProperty('stack')
  })

  it('[BUG-004] sin JWT válido el middleware corta el flujo antes de tocar la base de datos', async () => {
    // Bug: requireAuth no validaba correctamente el token; getUser se llamaba pero
    // si fallaba el service continuaba con user=null provocando errores en Supabase.
    // Fix: requireAuth verifica error o user===null y retorna 401 inmediatamente.
    mockSb.auth.getUser.mockResolvedValueOnce({
      data: { user: null }, error: new Error('No session'),
    })

    const res = await request(app).get('/profile').set('Authorization', 'Bearer invalid-token')

    expect(res.status).toBe(401)
    expect(mockSb.from).not.toHaveBeenCalled()
  })

})
