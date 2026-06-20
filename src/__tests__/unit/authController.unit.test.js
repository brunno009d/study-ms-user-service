import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../service/userService.js', () => ({
  register: vi.fn(),
  login: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  deleteAccount: vi.fn(),
}))

import * as userService from '../../service/userService.js'
import { register, login } from '../../controller/authController.js'

const mockRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

// ─── register ────────────────────────────────────────────────────────────────

describe('authController — register', () => {
  it('responde 400 cuando faltan campos en el body', async () => {
    // Arrange
    const req = { body: { email: 'a@b.com' } } // sin password ni full_name
    const res = mockRes()
    const next = vi.fn()
    // Act
    await register(req, res, next)
    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'bad_request' }))
  })

  it('responde 201 con el resultado del service cuando los datos son válidos', async () => {
    // Arrange
    userService.register.mockResolvedValue({ id: 'u1', email: 'a@b.com', full_name: 'Ana' })
    const req = { body: { email: 'a@b.com', password: 'pass123', full_name: 'Ana' } }
    const res = mockRes()
    const next = vi.fn()
    // Act
    await register(req, res, next)
    // Assert
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ id: 'u1', email: 'a@b.com', full_name: 'Ana' })
  })

  it('responde 400 cuando el service lanza error con status 400', async () => {
    // Arrange
    const err = new Error('La contraseña debe tener al menos 6 caracteres')
    err.status = 400
    userService.register.mockRejectedValue(err)
    const req = { body: { email: 'a@b.com', password: '123', full_name: 'Ana' } }
    const res = mockRes()
    const next = vi.fn()
    // Act
    await register(req, res, next)
    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 409 cuando el email ya está registrado', async () => {
    // Arrange
    userService.register.mockRejectedValue(new Error('already registered'))
    const req = { body: { email: 'a@b.com', password: 'pass123', full_name: 'Ana' } }
    const res = mockRes()
    const next = vi.fn()
    // Act
    await register(req, res, next)
    // Assert
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'conflict' }))
  })

  it('delega a next cuando ocurre un error inesperado', async () => {
    // Arrange
    const err = new Error('DB failure')
    userService.register.mockRejectedValue(err)
    const req = { body: { email: 'a@b.com', password: 'pass123', full_name: 'Ana' } }
    const res = mockRes()
    const next = vi.fn()
    // Act
    await register(req, res, next)
    // Assert
    expect(next).toHaveBeenCalledWith(err)
  })
})

// ─── login ───────────────────────────────────────────────────────────────────

describe('authController — login', () => {
  it('responde 400 cuando faltan email o password', async () => {
    const req = { body: { email: 'a@b.com' } }
    const res = mockRes()
    const next = vi.fn()
    await login(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 200 con tokens cuando las credenciales son válidas', async () => {
    // Arrange
    const payload = { user: { id: 'u1' }, session: { access_token: 'tok' } }
    userService.login.mockResolvedValue(payload)
    const req = { body: { email: 'a@b.com', password: 'pass123' } }
    const res = mockRes()
    const next = vi.fn()
    // Act
    await login(req, res, next)
    // Assert
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(payload)
  })

  it('responde 401 cuando las credenciales son inválidas', async () => {
    userService.login.mockRejectedValue(new Error('Invalid login credentials'))
    const req = { body: { email: 'a@b.com', password: 'wrong' } }
    const res = mockRes()
    const next = vi.fn()
    await login(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'unauthorized' }))
  })

  it('delega a next cuando ocurre un error inesperado', async () => {
    const err = new Error('unexpected')
    userService.login.mockRejectedValue(err)
    const req = { body: { email: 'a@b.com', password: 'pass123' } }
    const res = mockRes()
    const next = vi.fn()
    await login(req, res, next)
    expect(next).toHaveBeenCalledWith(err)
  })
})
